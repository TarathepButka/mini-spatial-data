package feature

import (
	"context"
	"fmt"
	"strings"
	"time"
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

func (service *Service) Create(ctx context.Context, input FeatureInput) (Feature, error) {
	now := service.now()
	document, err := NormalizeInput(input, now)
	if err != nil {
		return Feature{}, err
	}
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

func (service *Service) Delete(ctx context.Context, id string) error {
	return service.repository.Delete(ctx, id)
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
	geometry, err := NormalizeGeometry(input.Geometry)
	if err != nil {
		return FeatureDocument{}, err
	}
	if input.Properties == nil {
		return FeatureDocument{}, ValidationError{Message: "properties is required"}
	}

	properties := copyProperties(input.Properties)
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
