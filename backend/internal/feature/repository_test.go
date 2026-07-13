package feature

import (
	"testing"

	"go.mongodb.org/mongo-driver/v2/bson"
)

func TestBuildFilterSupportsCategoryProvinceAndBBox(t *testing.T) {
	filter := BuildFilter(ListParams{
		Category: "low,nominal",
		Province: "Suphan Buri",
		BBox:     &BBox{MinLng: 99, MinLat: 13, MaxLng: 101, MaxLat: 15},
	})

	category, ok := filter["properties.category"].(bson.M)
	if !ok {
		t.Fatalf("expected category $in filter, got %#v", filter["properties.category"])
	}

	if _, ok := category["$in"]; !ok {
		t.Fatalf("expected $in category filter, got %#v", category)
	}

	if filter["properties.province"] != "Suphan Buri" {
		t.Fatalf("unexpected province filter: %#v", filter["properties.province"])
	}

	geometry, ok := filter["geometry"].(bson.M)
	if !ok {
		t.Fatalf("expected geometry filter, got %#v", filter["geometry"])
	}

	if _, ok := geometry["$geoIntersects"]; !ok {
		t.Fatalf("expected bbox filter to use $geoIntersects, got %#v", geometry)
	}
}

func TestBuildFilterSupportsSearch(t *testing.T) {
	filter := BuildFilter(ListParams{Search: "hotspot"})
	if _, ok := filter["$or"].(bson.A); !ok {
		t.Fatalf("expected $or search filter, got %#v", filter)
	}
}
