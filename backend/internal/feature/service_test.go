package feature

import (
	"testing"
	"time"
)

func TestNormalizeInputRequiresName(t *testing.T) {
	_, err := NormalizeInput(FeatureInput{
		Type:       "Feature",
		Geometry:   Geometry{Type: "Point", Coordinates: []float64{100.5, 13.7}},
		Properties: map[string]any{},
	}, time.Date(2026, 7, 9, 0, 0, 0, 0, time.UTC))
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestNormalizeInputDefaultsCategory(t *testing.T) {
	document, err := NormalizeInput(FeatureInput{
		Type:       "Feature",
		Geometry:   Geometry{Type: "Point", Coordinates: []float64{100.5, 13.7}},
		Properties: map[string]any{"name": "Manual point"},
	}, time.Date(2026, 7, 9, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if document.Properties["category"] != "manual" {
		t.Fatalf("expected manual category, got %#v", document.Properties["category"])
	}
}

func TestNormalizeInputDropsClientControlledOwnerFields(t *testing.T) {
	document, err := NormalizeInput(FeatureInput{
		Type:     "Feature",
		Geometry: Geometry{Type: "Point", Coordinates: []float64{100.5, 13.7}},
		Properties: map[string]any{
			"name":      "Manual point",
			"createdBy": map[string]any{"email": "spoof@example.com"},
			"updatedBy": map[string]any{"email": "spoof@example.com"},
		},
	}, time.Date(2026, 7, 9, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := document.Properties["createdBy"]; ok {
		t.Fatal("expected createdBy to be dropped")
	}

	if _, ok := document.Properties["updatedBy"]; ok {
		t.Fatal("expected updatedBy to be dropped")
	}
}

func TestSameActorMatchesSubjectOrEmail(t *testing.T) {
	if !sameActor(&Actor{Subject: "google-subject"}, &Actor{Subject: "google-subject"}) {
		t.Fatal("expected matching subjects to be the same actor")
	}

	if !sameActor(&Actor{Email: "owner@example.com"}, &Actor{Email: "OWNER@example.com"}) {
		t.Fatal("expected matching emails to be the same actor")
	}

	if sameActor(&Actor{Email: "owner@example.com"}, &Actor{Email: "other@example.com"}) {
		t.Fatal("expected different emails to be different actors")
	}
}

func TestNormalizeInputSupportsLineString(t *testing.T) {
	document, err := NormalizeInput(FeatureInput{
		Type: "Feature",
		Geometry: Geometry{
			Type: GeometryTypeLineString,
			Coordinates: [][]float64{
				{100.5, 13.7},
				{100.6, 13.8},
			},
		},
		Properties: map[string]any{"name": "Manual line"},
	}, time.Date(2026, 7, 9, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if document.Geometry.Type != GeometryTypeLineString {
		t.Fatalf("expected LineString geometry, got %s", document.Geometry.Type)
	}
}

func TestNormalizeInputRemovesConsecutiveDuplicateLineStringPositions(t *testing.T) {
	document, err := NormalizeInput(FeatureInput{
		Type: "Feature",
		Geometry: Geometry{
			Type: GeometryTypeLineString,
			Coordinates: [][]float64{
				{99.348117985, 19.656898909},
				{99.9186899, 19.625613454},
				{99.9186899, 19.625613454},
			},
		},
		Properties: map[string]any{"name": "Manual line"},
	}, time.Date(2026, 7, 9, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	coordinates, ok := document.Geometry.Coordinates.([][]float64)
	if !ok {
		t.Fatalf("expected normalized LineString coordinates, got %#v", document.Geometry.Coordinates)
	}

	if len(coordinates) != 2 {
		t.Fatalf("expected duplicate coordinate to be removed, got %#v", coordinates)
	}
}

func TestNormalizeInputSupportsPolygon(t *testing.T) {
	document, err := NormalizeInput(FeatureInput{
		Type: "Feature",
		Geometry: Geometry{
			Type: GeometryTypePolygon,
			Coordinates: [][][]float64{{
				{100.5, 13.7},
				{100.6, 13.7},
				{100.6, 13.8},
				{100.5, 13.7},
			}},
		},
		Properties: map[string]any{"name": "Manual polygon"},
	}, time.Date(2026, 7, 9, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if document.Geometry.Type != GeometryTypePolygon {
		t.Fatalf("expected Polygon geometry, got %s", document.Geometry.Type)
	}
}

func TestNormalizeInputRejectsInvalidLongitude(t *testing.T) {
	_, err := NormalizeInput(FeatureInput{
		Type:       "Feature",
		Geometry:   Geometry{Type: GeometryTypePoint, Coordinates: []float64{181, 13.7}},
		Properties: map[string]any{"name": "Invalid point"},
	}, time.Date(2026, 7, 9, 0, 0, 0, 0, time.UTC))
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestNormalizeInputRejectsShortLineString(t *testing.T) {
	_, err := NormalizeInput(FeatureInput{
		Type: "Feature",
		Geometry: Geometry{
			Type:        GeometryTypeLineString,
			Coordinates: [][]float64{{100.5, 13.7}},
		},
		Properties: map[string]any{"name": "Invalid line"},
	}, time.Date(2026, 7, 9, 0, 0, 0, 0, time.UTC))
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestNormalizeInputRejectsUnclosedPolygon(t *testing.T) {
	_, err := NormalizeInput(FeatureInput{
		Type: "Feature",
		Geometry: Geometry{
			Type: GeometryTypePolygon,
			Coordinates: [][][]float64{{
				{100.5, 13.7},
				{100.6, 13.7},
				{100.6, 13.8},
				{100.5, 13.8},
			}},
		},
		Properties: map[string]any{"name": "Invalid polygon"},
	}, time.Date(2026, 7, 9, 0, 0, 0, 0, time.UTC))
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestNormalizeInputRejectsUnsupportedGeometryType(t *testing.T) {
	_, err := NormalizeInput(FeatureInput{
		Type:       "Feature",
		Geometry:   Geometry{Type: "MultiPolygon", Coordinates: []any{}},
		Properties: map[string]any{"name": "Invalid geometry"},
	}, time.Date(2026, 7, 9, 0, 0, 0, 0, time.UTC))
	if err == nil {
		t.Fatal("expected validation error")
	}
}
