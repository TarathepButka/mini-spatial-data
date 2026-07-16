package feature

import (
	"fmt"
	"math"
	"net/url"
	"strconv"
	"strings"

	"github.com/example/mini-spatial-data/backend/internal/shared/geo"
)

const (
	DefaultPage        = 1
	MinPage            = 1
	MaxPage            = 1_000_000
	DefaultListLimit   = 20
	MinListLimit       = 1
	MaxListLimit       = 100
	DefaultNearbyLimit = 50
	MaxNearbyRadius    = 200_000 // 200 km in meters
)

func NewListParams(values url.Values) (ListParams, error) {
	page, err := parsePositiveInt(values.Get("page"), DefaultPage, MinPage, MaxPage)
	if err != nil {
		return ListParams{}, ValidationError{Message: "page must be a positive integer"}
	}

	limit, err := parsePositiveInt(values.Get("limit"), DefaultListLimit, MinListLimit, MaxListLimit)
	if err != nil {
		return ListParams{}, ValidationError{Message: fmt.Sprintf("limit must be between %d and %d", MinListLimit, MaxListLimit)}
	}

	bbox, err := ParseBBox(values.Get("bbox"))
	if err != nil {
		return ListParams{}, err
	}

	collection := strings.TrimSpace(values.Get("collection"))
	if err := validateCollectionParam(collection); err != nil {
		return ListParams{}, err
	}

	return ListParams{
		Page:     page,
		Limit:    limit,
		Search:   strings.TrimSpace(values.Get("search")),
		Collection: collection,
		Category: strings.TrimSpace(values.Get("category")),
		Province: strings.TrimSpace(values.Get("province")),
		BBox:     bbox,
	}, nil
}

func NewNearbyParams(values url.Values) (NearbyParams, error) {
	lng, err := parseRequiredFloat(values.Get("lng"), "lng")
	if err != nil {
		return NearbyParams{}, err
	}

	lat, err := parseRequiredFloat(values.Get("lat"), "lat")
	if err != nil {
		return NearbyParams{}, err
	}

	if err := validateLngLat(lng, lat); err != nil {
		return NearbyParams{}, err
	}

	radius, err := parseRequiredFloat(values.Get("radius"), "radius")
	if err != nil {
		return NearbyParams{}, err
	}

	if radius <= 0 || radius > MaxNearbyRadius {
		return NearbyParams{}, ValidationError{Message: fmt.Sprintf("radius must be greater than 0 and no more than %v meters", MaxNearbyRadius)}
	}

	limit, err := parsePositiveInt(values.Get("limit"), DefaultNearbyLimit, MinListLimit, MaxListLimit)
	if err != nil {
		return NearbyParams{}, ValidationError{Message: fmt.Sprintf("limit must be between %d and %d", MinListLimit, MaxListLimit)}
	}

	return NearbyParams{
		Lng:    lng,
		Lat:    lat,
		Radius: radius,
		Limit:  limit,
	}, nil
}

func ParseBBox(raw string) (*BBox, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}

	parts := strings.Split(raw, ",")
	if len(parts) != 4 {
		return nil, ValidationError{Message: "bbox must use minLng,minLat,maxLng,maxLat"}
	}

	values := make([]float64, 4)
	for index, part := range parts {
		parsed, err := strconv.ParseFloat(strings.TrimSpace(part), 64)
		if err != nil || math.IsNaN(parsed) || math.IsInf(parsed, 0) {
			return nil, ValidationError{Message: "bbox values must be valid numbers"}
		}

		values[index] = parsed
	}

	bbox := &BBox{
		MinLng: values[0],
		MinLat: values[1],
		MaxLng: values[2],
		MaxLat: values[3],
	}

	if err := validateLngLat(bbox.MinLng, bbox.MinLat); err != nil {
		return nil, err
	}

	if err := validateLngLat(bbox.MaxLng, bbox.MaxLat); err != nil {
		return nil, err
	}

	if bbox.MinLng >= bbox.MaxLng || bbox.MinLat >= bbox.MaxLat {
		return nil, ValidationError{Message: "bbox minimum values must be lower than maximum values"}
	}

	return bbox, nil
}

func validateCollectionParam(raw string) error {
	if strings.TrimSpace(raw) == "" {
		return nil
	}

	for _, collection := range splitParamList(raw) {
		if !IsValidCollection(collection) {
			return ValidationError{Message: fmt.Sprintf("collection must be one of %s", strings.Join(ValidCollections, ", "))}
		}
	}

	return nil
}
func parsePositiveInt(raw string, fallback int, min int, max int) (int, error) {
	if strings.TrimSpace(raw) == "" {
		return fallback, nil
	}

	parsed, err := strconv.Atoi(raw)
	if err != nil {
		return 0, err
	}

	if parsed < min || parsed > max {
		return 0, fmt.Errorf("value out of range")
	}

	return parsed, nil
}

func parseRequiredFloat(raw string, name string) (float64, error) {
	if strings.TrimSpace(raw) == "" {
		return 0, ValidationError{Message: name + " is required"}
	}

	parsed, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	if err != nil || math.IsNaN(parsed) || math.IsInf(parsed, 0) {
		return 0, ValidationError{Message: name + " must be a valid number"}
	}

	return parsed, nil
}

func validateLngLat(lng float64, lat float64) error {
	return geo.ValidateLngLat(lng, lat)
}
