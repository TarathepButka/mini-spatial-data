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

func TestBuildFilterSupportsCollection(t *testing.T) {
	filter := BuildFilter(ListParams{
		Collection: "hotspots,hospitals",
	})

	collection, ok := filter["$or"].(bson.A)
	if !ok || len(collection) == 0 {
		t.Fatalf("expected collection filter with legacy fallback under $or, got %#v", filter)
	}
}

func TestBuildFilterSupportsCollectionAndSearch(t *testing.T) {
	filter := BuildFilter(ListParams{
		Search:     "some-search",
		Collection: "hotspots,hospitals",
	})

	andClauses, ok := filter["$and"].(bson.A)
	if !ok || len(andClauses) != 2 {
		t.Fatalf("expected search and collection clauses under $and, got %#v", filter)
	}
}

func TestBuildFilterSupportsLegacyCollectionFallback(t *testing.T) {
	filter := BuildFilter(ListParams{
		Collection: "hotspots",
	})

	collection, ok := filter["$or"].(bson.A)
	if !ok || len(collection) == 0 {
		t.Fatalf("expected hotspot collection filter with legacy fallback, got %#v", filter)
	}
}

func TestBuildFilterSupportsSearch(t *testing.T) {
	filter := BuildFilter(ListParams{Search: "hotspot"})
	if _, ok := filter["$or"].(bson.A); !ok {
		t.Fatalf("expected $or search filter, got %#v", filter)
	}
}
