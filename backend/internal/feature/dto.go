package feature

import "github.com/example/mini-spatial-data/backend/internal/shared/api"


type FeatureInput struct {
	Type       string         `json:"type"`
	Collection string         `json:"collection"`
	Geometry   Geometry       `json:"geometry"`
	Properties map[string]any `json:"properties"`
}

type ListParams struct {
	Page     int
	Limit    int
	Search   string
	Collection string
	Category string
	Province string
	BBox     *BBox
}

type NearbyParams struct {
	Lng    float64
	Lat    float64
	Radius float64
	Limit  int
}

type BBox struct {
	MinLng float64
	MinLat float64
	MaxLng float64
	MaxLat float64
}

type Meta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"totalPages"`
}

type ListResponse struct {
	Data FeatureCollection `json:"data"`
	Meta Meta              `json:"meta"`
}

type DeleteResponse struct {
	Deleted bool `json:"deleted"`
}



type ErrorBody = api.ErrorBody
type ErrorResponse = api.ErrorResponse

