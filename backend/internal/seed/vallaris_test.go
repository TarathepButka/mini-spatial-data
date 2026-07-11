package seed

import (
	"errors"
	"testing"
	"time"

	"github.com/example/mini-spatial-data/backend/internal/feature"
)

func TestNormalizeVallarisFeature(t *testing.T) {
	document, err := NormalizeVallarisFeature(
		"source-1",
		feature.Geometry{Type: "Point", Coordinates: []float64{100.19614, 14.59946}},
		map[string]any{
			"pv_en":      "Suphan Buri",
			"ap_en":      "Si Prachan",
			"tb_en":      "Si Prachan",
			"confidence": "nominal",
			"hotspotid":  "VI1202508310701w4x701b852",
			"frp":        2.97,
		},
		time.Date(2026, 7, 9, 0, 0, 0, 0, time.UTC),
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if document.SourceID != "source-1" {
		t.Fatalf("unexpected source id: %s", document.SourceID)
	}
	if document.Properties["category"] != "nominal" {
		t.Fatalf("expected nominal category, got %#v", document.Properties["category"])
	}
	if document.Properties["province"] != "Suphan Buri" {
		t.Fatalf("expected province to be normalized, got %#v", document.Properties["province"])
	}
}

func TestSanitizeExternalErrorRedactsAPIKey(t *testing.T) {
	err := errors.New("Get \"https://example.test/items?api_key=secret-key&limit=100\": dial tcp failed")
	sanitized := sanitizeExternalError(err, "secret-key")
	if sanitized == err.Error() {
		t.Fatal("expected error to be sanitized")
	}
	if sanitized == "" || sanitized != "Get \"https://example.test/items?api_key=[redacted]&limit=100\": dial tcp failed" {
		t.Fatalf("unexpected sanitized error: %s", sanitized)
	}
}
