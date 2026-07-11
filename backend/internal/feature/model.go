package feature

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

const FeatureType = "Feature"

type Geometry struct {
	Type        string    `json:"type" bson:"type"`
	Coordinates []float64 `json:"coordinates" bson:"coordinates"`
}

type Feature struct {
	ID         string         `json:"id"`
	Type       string         `json:"type"`
	Geometry   Geometry       `json:"geometry"`
	Properties map[string]any `json:"properties"`
}

type FeatureCollection struct {
	Type     string    `json:"type"`
	Features []Feature `json:"features"`
}

type FeatureDocument struct {
	ID         bson.ObjectID  `bson:"_id,omitempty"`
	SourceID   string         `bson:"sourceId,omitempty"`
	Type       string         `bson:"type"`
	Geometry   Geometry       `bson:"geometry"`
	Properties map[string]any `bson:"properties"`
	CreatedAt  time.Time      `bson:"createdAt,omitempty"`
	UpdatedAt  time.Time      `bson:"updatedAt,omitempty"`
}

func (document FeatureDocument) ToFeature() Feature {
	properties := copyProperties(document.Properties)
	if document.CreatedAt.IsZero() == false {
		properties["createdAt"] = document.CreatedAt.UTC().Format(time.RFC3339)
	}
	if document.UpdatedAt.IsZero() == false {
		properties["updatedAt"] = document.UpdatedAt.UTC().Format(time.RFC3339)
	}
	if document.SourceID != "" {
		properties["sourceId"] = document.SourceID
	}

	return Feature{
		ID:         document.ID.Hex(),
		Type:       FeatureType,
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
