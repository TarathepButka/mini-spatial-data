package feature

import (
	"encoding/json"
	"math"
	"strings"
)

func NormalizeGeometry(geometry Geometry) (Geometry, error) {
	geometryType := strings.TrimSpace(geometry.Type)
	switch geometryType {
	case GeometryTypePoint:
		coordinates, err := pointCoordinates(geometry.Coordinates)
		if err != nil {
			return Geometry{}, err
		}
		return Geometry{Type: GeometryTypePoint, Coordinates: coordinates}, nil
	case GeometryTypeLineString:
		coordinates, err := lineStringCoordinates(geometry.Coordinates)
		if err != nil {
			return Geometry{}, err
		}
		return Geometry{Type: GeometryTypeLineString, Coordinates: coordinates}, nil
	case GeometryTypePolygon:
		coordinates, err := polygonCoordinates(geometry.Coordinates)
		if err != nil {
			return Geometry{}, err
		}
		return Geometry{Type: GeometryTypePolygon, Coordinates: coordinates}, nil
	default:
		return Geometry{}, ValidationError{Message: "geometry.type must be Point, LineString, or Polygon"}
	}
}

func PointCoordinates(geometry Geometry) ([]float64, error) {
	if strings.TrimSpace(geometry.Type) != GeometryTypePoint {
		return nil, ValidationError{Message: "geometry.type must be Point"}
	}
	return pointCoordinates(geometry.Coordinates)
}

func pointCoordinates(raw any) ([]float64, error) {
	normalized, err := normalizeCoordinateValue(raw, "geometry.coordinates must contain longitude and latitude")
	if err != nil {
		return nil, err
	}
	return parsePosition(normalized, "geometry.coordinates must contain longitude and latitude")
}

func lineStringCoordinates(raw any) ([][]float64, error) {
	normalized, err := normalizeCoordinateValue(raw, "geometry.coordinates must be an array of positions")
	if err != nil {
		return nil, err
	}
	items, ok := normalized.([]any)
	if !ok || len(items) < 2 {
		return nil, ValidationError{Message: "LineString coordinates must contain at least two positions"}
	}

	coordinates := make([][]float64, 0, len(items))
	for _, item := range items {
		position, err := parsePosition(item, "LineString coordinates must contain longitude and latitude positions")
		if err != nil {
			return nil, err
		}
		coordinates = append(coordinates, position)
	}
	coordinates = removeConsecutiveDuplicatePositions(coordinates)
	if len(coordinates) < 2 {
		return nil, ValidationError{Message: "LineString coordinates must contain at least two distinct positions"}
	}
	return coordinates, nil
}

func polygonCoordinates(raw any) ([][][]float64, error) {
	normalized, err := normalizeCoordinateValue(raw, "Polygon coordinates must be an array of linear rings")
	if err != nil {
		return nil, err
	}
	ringItems, ok := normalized.([]any)
	if !ok || len(ringItems) == 0 {
		return nil, ValidationError{Message: "Polygon coordinates must contain at least one linear ring"}
	}

	polygon := make([][][]float64, 0, len(ringItems))
	for _, ringItem := range ringItems {
		rawPositions, ok := ringItem.([]any)
		if !ok || len(rawPositions) < 4 {
			return nil, ValidationError{Message: "Polygon linear rings must contain at least four positions"}
		}

		ring := make([][]float64, 0, len(rawPositions))
		for _, rawPosition := range rawPositions {
			position, err := parsePosition(rawPosition, "Polygon coordinates must contain longitude and latitude positions")
			if err != nil {
				return nil, err
			}
			ring = append(ring, position)
		}

		first := ring[0]
		last := ring[len(ring)-1]
		if first[0] != last[0] || first[1] != last[1] {
			return nil, ValidationError{Message: "Polygon linear rings must be closed"}
		}
		polygon = append(polygon, ring)
	}
	return polygon, nil
}

func normalizeCoordinateValue(raw any, message string) (any, error) {
	payload, err := json.Marshal(raw)
	if err != nil {
		return nil, ValidationError{Message: message}
	}

	var normalized any
	if err := json.Unmarshal(payload, &normalized); err != nil {
		return nil, ValidationError{Message: message}
	}
	return normalized, nil
}

func parsePosition(raw any, message string) ([]float64, error) {
	items, ok := raw.([]any)
	if !ok || len(items) != 2 {
		return nil, ValidationError{Message: message}
	}

	lng, ok := finiteNumber(items[0])
	if !ok {
		return nil, ValidationError{Message: "longitude must be a valid number"}
	}
	lat, ok := finiteNumber(items[1])
	if !ok {
		return nil, ValidationError{Message: "latitude must be a valid number"}
	}
	if err := validateLngLat(lng, lat); err != nil {
		return nil, err
	}
	return []float64{lng, lat}, nil
}

func finiteNumber(value any) (float64, bool) {
	number, ok := value.(float64)
	if !ok || math.IsNaN(number) || math.IsInf(number, 0) {
		return 0, false
	}
	return number, true
}

func removeConsecutiveDuplicatePositions(coordinates [][]float64) [][]float64 {
	filtered := make([][]float64, 0, len(coordinates))
	for index, coordinate := range coordinates {
		if index == 0 {
			filtered = append(filtered, coordinate)
			continue
		}
		previous := coordinates[index-1]
		if previous[0] != coordinate[0] || previous[1] != coordinate[1] {
			filtered = append(filtered, coordinate)
		}
	}
	return filtered
}
