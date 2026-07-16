package feature

import (
	"strings"
	"time"

	"github.com/example/mini-spatial-data/backend/internal/shared/geo"
	"go.mongodb.org/mongo-driver/v2/bson"
)

const (
	FeatureType            = geo.FeatureType
	GeometryTypePoint      = geo.GeometryTypePoint
	GeometryTypeLineString = geo.GeometryTypeLineString
	GeometryTypePolygon    = geo.GeometryTypePolygon
)

type Geometry = geo.Geometry


type Feature struct {
	ID         string         `json:"id"`
	Type       string         `json:"type"`
	Collection string         `json:"collection"`
	Geometry   Geometry       `json:"geometry"`
	Properties map[string]any `json:"properties"`
}

type FeatureCollection struct {
	Type     string    `json:"type"`
	Features []Feature `json:"features"`
}

type Actor struct {
	Subject string `json:"sub" bson:"sub"`
	Email   string `json:"email" bson:"email"`
	Name    string `json:"name,omitempty" bson:"name,omitempty"`
}

type FeatureDocument struct {
	ID         bson.ObjectID  `bson:"_id,omitempty"`
	SourceID   string         `bson:"sourceId,omitempty"`
	Type       string         `bson:"type"`
	Collection string         `bson:"collection,omitempty"`
	Geometry   Geometry       `bson:"geometry"`
	Properties map[string]any `bson:"properties"`
	CreatedBy  *Actor         `bson:"createdBy,omitempty"`
	CreatedAt  time.Time      `bson:"createdAt,omitempty"`
	UpdatedAt  time.Time      `bson:"updatedAt,omitempty"`
}

func (document FeatureDocument) ToFeature() Feature {
	properties := copyProperties(document.Properties)
	collection := strings.TrimSpace(document.Collection)
	if collection == "" {
		collection = LegacyCollectionForDocument(document)
	}
	if document.CreatedAt.IsZero() == false {
		properties["createdAt"] = document.CreatedAt.UTC().Format(time.RFC3339)
	}

	if document.UpdatedAt.IsZero() == false {
		properties["updatedAt"] = document.UpdatedAt.UTC().Format(time.RFC3339)
	}

	if document.SourceID != "" {
		properties["sourceId"] = document.SourceID
	}

	if document.CreatedBy != nil {
		properties["createdBy"] = *document.CreatedBy
	}

	return Feature{
		ID:         document.ID.Hex(),
		Type:       FeatureType,
		Collection: collection,
		Geometry:   document.Geometry,
		Properties: properties,
	}
}

func copyProperties(properties map[string]any) map[string]any {
	cloned := make(map[string]any, len(properties))
	for key, value := range properties {
		cloned[key] = value
	}

	return cloned
}
