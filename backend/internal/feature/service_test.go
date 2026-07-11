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
