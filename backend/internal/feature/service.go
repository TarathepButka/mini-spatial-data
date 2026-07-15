package feature

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/example/mini-spatial-data/backend/internal/shared/geo"
)

type Service struct {
	repository *Repository
	now        func() time.Time
}

func NewService(repository *Repository) *Service {
	return &Service{
		repository: repository,
		now:        func() time.Time { return time.Now().UTC() },
	}
}

func (service *Service) List(ctx context.Context, params ListParams) (ListResponse, error) {
	documents, total, err := service.repository.List(ctx, params)
	if err != nil {
		return ListResponse{}, err
	}

	features := make([]Feature, 0, len(documents))
	for _, document := range documents {
		features = append(features, document.ToFeature())
	}
	totalPages := 0
	if total > 0 {
		totalPages = int((total + int64(params.Limit) - 1) / int64(params.Limit))
	}

	return ListResponse{
		Data: FeatureCollection{
			Type:     "FeatureCollection",
			Features: features,
		},
		Meta: Meta{
			Page:       params.Page,
			Limit:      params.Limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (service *Service) Nearby(ctx context.Context, params NearbyParams) (ListResponse, error) {
	documents, err := service.repository.Nearby(ctx, params)
	if err != nil {
		return ListResponse{}, err
	}

	features := make([]Feature, 0, len(documents))
	for _, document := range documents {
		features = append(features, document.ToFeature())
	}

	return ListResponse{
		Data: FeatureCollection{
			Type:     "FeatureCollection",
			Features: features,
		},
		Meta: Meta{
			Page:       1,
			Limit:      params.Limit,
			Total:      int64(len(features)),
			TotalPages: 1,
		},
	}, nil
}

func (service *Service) Get(ctx context.Context, id string) (Feature, error) {
	document, err := service.repository.Get(ctx, id)
	if err != nil {
		return Feature{}, err
	}

	return document.ToFeature(), nil
}

func (service *Service) Create(ctx context.Context, input FeatureInput, actor *Actor) (Feature, error) {
	now := service.now()
	document, err := NormalizeInput(input, now)
	if err != nil {
		return Feature{}, err
	}

	document.CreatedBy = actor
	created, err := service.repository.Create(ctx, document)
	if err != nil {
		return Feature{}, err
	}

	return created.ToFeature(), nil
}

func (service *Service) Update(ctx context.Context, id string, input FeatureInput) (Feature, error) {
	now := service.now()
	document, err := NormalizeInput(input, now)
	if err != nil {
		return Feature{}, err
	}

	updated, err := service.repository.Update(ctx, id, document)
	if err != nil {
		return Feature{}, err
	}

	return updated.ToFeature(), nil
}

func (service *Service) UpdateOwn(ctx context.Context, id string, input FeatureInput, actor *Actor) (Feature, error) {
	if actor == nil {
		return Feature{}, ErrForbidden
	}

	existing, err := service.repository.Get(ctx, id)
	if err != nil {
		return Feature{}, err
	}

	if !sameActor(existing.CreatedBy, actor) {
		return Feature{}, ErrForbidden
	}

	now := service.now()
	document, err := NormalizeInput(input, now)
	if err != nil {
		return Feature{}, err
	}

	updated, err := service.repository.Update(ctx, id, document)
	if err != nil {
		return Feature{}, err
	}

	return updated.ToFeature(), nil
}

func (service *Service) Delete(ctx context.Context, id string) error {
	return service.repository.Delete(ctx, id)
}

func (service *Service) DeleteOwn(ctx context.Context, id string, actor *Actor) error {
	if actor == nil {
		return ErrForbidden
	}

	document, err := service.repository.Get(ctx, id)
	if err != nil {
		return err
	}

	if !sameActor(document.CreatedBy, actor) {
		return ErrForbidden
	}

	return service.repository.Delete(ctx, id)
}

func (service *Service) EnsureSeededForUser(ctx context.Context, actor *Actor) error {
	if actor == nil || strings.TrimSpace(actor.Email) == "" {
		return nil
	}

	count, err := service.repository.CountByUser(ctx, actor.Email)
	if err != nil {
		return err
	}

	if count > 0 {
		return nil
	}

	samples := []FeatureDocument{
		{
			Type: FeatureType,
			Geometry: Geometry{
				Type:        GeometryTypePoint,
				Coordinates: []float64{100.5018, 13.7563},
			},
			Properties: map[string]any{
				"name":        "จุดเฝ้าระวังของฉัน - กรุงเทพฯ",
				"category":    "manual",
				"province":    "กรุงเทพมหานคร",
				"description": "จุดสังเกตการณ์ที่ปักโดยระบบอัตโนมัติสำหรับบัญชีใหม่",
			},
		},
		{
			Type: FeatureType,
			Geometry: Geometry{
				Type:        GeometryTypePoint,
				Coordinates: []float64{98.9853, 18.7883},
			},
			Properties: map[string]any{
				"name":        "จุดตรวจแนวป้องกันไฟ - เชียงใหม่",
				"category":    "manual",
				"province":    "เชียงใหม่",
				"description": "จุดตรวจเช็คแนวกันไฟป่า ภาคเหนือตอนบน",
			},
		},
		{
			Type: FeatureType,
			Geometry: Geometry{
				Type:        GeometryTypePoint,
				Coordinates: []float64{102.8236, 16.4322},
			},
			Properties: map[string]any{
				"name":        "จุดประสานงานดับไฟ - ขอนแก่น",
				"category":    "manual",
				"province":    "ขอนแก่น",
				"description": "จุดตรวจสอบภูมิภาคตะวันออกเฉียงเหนือ",
			},
		},
		{
			Type: FeatureType,
			Geometry: Geometry{
				Type:        GeometryTypePoint,
				Coordinates: []float64{98.3923, 7.8804},
			},
			Properties: map[string]any{
				"name":        "สถานีวิทยุสื่อสาร - ภูเก็ต",
				"category":    "manual",
				"province":    "ภูเก็ต",
				"description": "สถานีประสานงานกู้ภัยจังหวัดภูเก็ต",
			},
		},
		{
			Type: FeatureType,
			Geometry: Geometry{
				Type:        GeometryTypePoint,
				Coordinates: []float64{99.8406, 19.9090},
			},
			Properties: map[string]any{
				"name":        "ด่านตรวจร่วม - เชียงราย",
				"category":    "manual",
				"province":    "เชียงราย",
				"description": "จุดปักหมุดสังเกตการณ์แนวชายแดนเหนือสุด",
			},
		},
	}

	for _, sample := range samples {
		sample.CreatedBy = actor
		if _, err := service.repository.Create(ctx, sample); err != nil {
			return err
		}
	}

	return nil
}

func (service *Service) UpsertSeedDocuments(ctx context.Context, documents []FeatureDocument) (int, error) {
	if len(documents) == 0 {
		return 0, nil
	}

	return service.repository.UpsertManyBySourceID(ctx, documents)
}

func NormalizeInput(input FeatureInput, now time.Time) (FeatureDocument, error) {
	if strings.TrimSpace(input.Type) != "" && input.Type != FeatureType {
		return FeatureDocument{}, ValidationError{Message: "type must be Feature"}
	}

	geometry, err := geo.NormalizeGeometry(input.Geometry)
	if err != nil {
		return FeatureDocument{}, err
	}

	if input.Properties == nil {
		return FeatureDocument{}, ValidationError{Message: "properties is required"}
	}

	properties := copyProperties(input.Properties)
	delete(properties, "createdBy")
	delete(properties, "updatedBy")
	name := strings.TrimSpace(stringProperty(properties, "name"))
	if name == "" {
		return FeatureDocument{}, ValidationError{Message: "properties.name is required"}
	}

	properties["name"] = name

	category := strings.TrimSpace(stringProperty(properties, "category"))
	if category == "" {
		category = "manual"
	}

	properties["category"] = category

	province := strings.TrimSpace(stringProperty(properties, "province"))
	if province != "" {
		properties["province"] = province
	}

	description := strings.TrimSpace(stringProperty(properties, "description"))
	if description != "" {
		properties["description"] = description
	}

	properties["updatedAt"] = now.Format(time.RFC3339)
	if _, ok := properties["createdAt"]; !ok {
		properties["createdAt"] = now.Format(time.RFC3339)
	}

	return FeatureDocument{
		Type:       FeatureType,
		Geometry:   geometry,
		Properties: properties,
		CreatedAt:  now,
		UpdatedAt:  now,
	}, nil
}

func sameActor(left *Actor, right *Actor) bool {
	if left == nil || right == nil {
		return false
	}

	if strings.TrimSpace(left.Subject) != "" && left.Subject == right.Subject {
		return true
	}

	return strings.EqualFold(strings.TrimSpace(left.Email), strings.TrimSpace(right.Email)) && strings.TrimSpace(right.Email) != ""
}

func stringProperty(properties map[string]any, key string) string {
	value, ok := properties[key]
	if !ok || value == nil {
		return ""
	}

	if typed, ok := value.(string); ok {
		return typed
	}

	return strings.TrimSpace(fmt.Sprint(value))
}
