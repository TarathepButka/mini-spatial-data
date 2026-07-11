package seed

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/example/mini-spatial-data/backend/internal/config"
	"github.com/example/mini-spatial-data/backend/internal/feature"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	cfg            config.Config
	featureService *feature.Service
	client         *http.Client
}

var apiKeyQueryPattern = regexp.MustCompile(`(?i)(api_key=)[^&\s]+`)

type ImportResult struct {
	NumberMatched     int `json:"numberMatched"`
	NumberReturned    int `json:"numberReturned"`
	InsertedOrUpdated int `json:"insertedOrUpdated"`
}

type vallarisResponse struct {
	Type           string            `json:"type"`
	Features       []vallarisFeature `json:"features"`
	NumberMatched  int               `json:"numberMatched"`
	NumberReturned int               `json:"numberReturned"`
}

type vallarisFeature struct {
	ID         string           `json:"id"`
	Type       string           `json:"type"`
	Geometry   feature.Geometry `json:"geometry"`
	Properties map[string]any   `json:"properties"`
}

func NewHandler(cfg config.Config, featureService *feature.Service) *Handler {
	return &Handler{
		cfg:            cfg,
		featureService: featureService,
		client: &http.Client{
			Timeout: cfg.HTTPTimeout,
		},
	}
}

func RegisterRoutes(router gin.IRouter, handler *Handler, requireAuth gin.HandlerFunc) {
	seedGroup := router.Group("/seed")
	if requireAuth == nil {
		seedGroup.POST("/vallaris", handler.SeedVallaris)
		return
	}
	seedGroup.POST("/vallaris", requireAuth, handler.SeedVallaris)
}

func (handler *Handler) SeedVallaris(c *gin.Context) {
	if strings.EqualFold(handler.cfg.AppEnv, "production") {
		c.JSON(http.StatusForbidden, feature.ErrorResponse{Error: feature.ErrorBody{Code: "forbidden", Message: "seed endpoint is disabled in production"}})
		return
	}
	if strings.TrimSpace(handler.cfg.VallarisAPIKey) == "" {
		c.JSON(http.StatusBadRequest, feature.ErrorResponse{Error: feature.ErrorBody{Code: "missing_api_key", Message: "VALLARIS_API_KEY is required"}})
		return
	}

	result, err := handler.ImportVallaris(c.Request.Context())
	if err != nil {
		log.Printf("seed Vallaris failed: %s", sanitizeExternalError(err, handler.cfg.VallarisAPIKey))
		c.JSON(http.StatusBadGateway, feature.ErrorResponse{Error: feature.ErrorBody{Code: "seed_failed", Message: "failed to import Vallaris data"}})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (handler *Handler) ImportVallaris(ctx context.Context) (ImportResult, error) {
	limit := handler.cfg.VallarisImportLimit
	if limit <= 0 || limit > 500 {
		limit = 100
	}

	result := ImportResult{}
	for offset := 0; ; offset += limit {
		payload, err := handler.fetchPage(ctx, limit, offset)
		if err != nil {
			return result, err
		}
		if payload.NumberMatched > result.NumberMatched {
			result.NumberMatched = payload.NumberMatched
		}
		result.NumberReturned += payload.NumberReturned

		now := time.Now().UTC()
		documents := make([]feature.FeatureDocument, 0, len(payload.Features))
		for _, feature := range payload.Features {
			document, err := NormalizeVallarisFeature(feature.ID, feature.Geometry, feature.Properties, now)
			if err != nil {
				continue
			}
			documents = append(documents, document)
		}
		upserted, err := handler.featureService.UpsertSeedDocuments(ctx, documents)
		if err != nil {
			return result, err
		}
		result.InsertedOrUpdated += upserted

		returned := payload.NumberReturned
		if returned == 0 {
			returned = len(payload.Features)
		}
		if returned == 0 || offset+returned >= payload.NumberMatched {
			break
		}
	}
	return result, nil
}

func (handler *Handler) fetchPage(ctx context.Context, limit int, offset int) (vallarisResponse, error) {
	endpoint, err := url.Parse(handler.cfg.VallarisItemsURL)
	if err != nil {
		return vallarisResponse{}, fmt.Errorf("invalid Vallaris URL: %w", err)
	}
	query := endpoint.Query()
	query.Set("api_key", handler.cfg.VallarisAPIKey)
	query.Set("ct_en", "Thailand")
	query.Set("limit", strconv.Itoa(limit))
	query.Set("offset", strconv.Itoa(offset))
	endpoint.RawQuery = query.Encode()

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return vallarisResponse{}, err
	}
	request.Header.Set("Accept", "application/geo+json, application/json")

	response, err := handler.client.Do(request)
	if err != nil {
		return vallarisResponse{}, err
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return vallarisResponse{}, fmt.Errorf("Vallaris API returned status %d", response.StatusCode)
	}

	var payload vallarisResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return vallarisResponse{}, err
	}
	return payload, nil
}

func sanitizeExternalError(err error, apiKey string) string {
	if err == nil {
		return ""
	}
	message := err.Error()
	if strings.TrimSpace(apiKey) != "" {
		message = strings.ReplaceAll(message, apiKey, "[redacted]")
	}
	return apiKeyQueryPattern.ReplaceAllString(message, `${1}[redacted]`)
}

func NormalizeVallarisFeature(sourceID string, geometry feature.Geometry, properties map[string]any, now time.Time) (feature.FeatureDocument, error) {
	if strings.TrimSpace(sourceID) == "" {
		return feature.FeatureDocument{}, fmt.Errorf("source id is required")
	}
	if geometry.Type != "Point" || len(geometry.Coordinates) != 2 {
		return feature.FeatureDocument{}, fmt.Errorf("only Point geometry is supported")
	}

	province := firstString(properties, "pv_tn", "changwat", "province_t", "pv_en")
	amphoe := firstString(properties, "ap_tn", "amphoe", "ap_en")
	tambol := firstString(properties, "tb_tn", "tambol", "tambon_t", "tb_en")
	village := firstString(properties, "village", "name_1")
	confidence := firstString(properties, "confidence")
	if confidence == "" {
		confidence = "unknown"
	}
	location := compactJoin(" / ", province, amphoe, tambol)
	if location == "" {
		location = firstString(properties, "hotspotid", "ct_en")
	}
	name := strings.TrimSpace("Hotspot - " + location)
	landUse := firstString(properties, "lu_hp_name", "lu_name")
	date := firstString(properties, "th_date", "acq_date")
	timeText := firstString(properties, "th_time", "acq_time")
	description := strings.TrimSpace(compactJoin(" ", "VIIRS hotspot", location, date, timeText))

	normalized := map[string]any{
		"name":        name,
		"category":    confidence,
		"confidence":  confidence,
		"province":    province,
		"amphoe":      amphoe,
		"tambol":      tambol,
		"village":     village,
		"landUse":     landUse,
		"description": description,
		"source":      "vallaris",
		"sourceId":    sourceID,
		"longitude":   geometry.Coordinates[0],
		"latitude":    geometry.Coordinates[1],
		"createdAt":   now.Format(time.RFC3339),
		"updatedAt":   now.Format(time.RFC3339),
	}

	preservedKeys := []string{
		"hotspotid", "frp", "bright_ti4", "bright_ti5", "satellite", "instrument",
		"th_date", "th_time", "acq_date", "acq_time", "timestamp", "linkgmap",
		"ct_en", "ct_tn", "pv_en", "pv_tn", "ap_en", "ap_tn", "tb_en", "tb_tn",
		"lu_hp", "lu_hp_name", "lu_name", "scan", "track", "version",
	}
	for _, key := range preservedKeys {
		if value, ok := properties[key]; ok && value != nil {
			normalized[key] = value
		}
	}

	return feature.FeatureDocument{
		SourceID:   sourceID,
		Type:       feature.FeatureType,
		Geometry:   geometry,
		Properties: normalized,
		CreatedAt:  now,
		UpdatedAt:  now,
	}, nil
}

func firstString(properties map[string]any, keys ...string) string {
	for _, key := range keys {
		value, ok := properties[key]
		if !ok || value == nil {
			continue
		}
		text := strings.TrimSpace(fmt.Sprint(value))
		if text != "" && text != "<nil>" {
			return text
		}
	}
	return ""
}

func compactJoin(separator string, values ...string) string {
	items := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			items = append(items, trimmed)
		}
	}
	return strings.Join(items, separator)
}
