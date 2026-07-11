package feature

import (
	"fmt"
	"math"
	"net/url"
	"strconv"
	"strings"
)

func NewListParams(values url.Values) (ListParams, error) {
	page, err := parsePositiveInt(values.Get("page"), 1, 1, 1_000_000)
	if err != nil {
		return ListParams{}, ValidationError{Message: "page must be a positive integer"}
	}
	limit, err := parsePositiveInt(values.Get("limit"), 20, 1, 100)
	if err != nil {
		return ListParams{}, ValidationError{Message: "limit must be between 1 and 100"}
	}
	bbox, err := ParseBBox(values.Get("bbox"))
	if err != nil {
		return ListParams{}, err
	}

	return ListParams{
		Page:     page,
		Limit:    limit,
		Search:   strings.TrimSpace(values.Get("search")),
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
	if radius <= 0 || radius > 200_000 {
		return NearbyParams{}, ValidationError{Message: "radius must be greater than 0 and no more than 200000 meters"}
	}
	limit, err := parsePositiveInt(values.Get("limit"), 50, 1, 100)
	if err != nil {
		return NearbyParams{}, ValidationError{Message: "limit must be between 1 and 100"}
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
	if lng < -180 || lng > 180 {
		return ValidationError{Message: "longitude must be between -180 and 180"}
	}
	if lat < -90 || lat > 90 {
		return ValidationError{Message: "latitude must be between -90 and 90"}
	}
	return nil
}
