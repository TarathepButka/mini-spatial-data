package feature

import (
	"net/url"
	"testing"
)

func TestNewListParamsParsesPaginationAndBBox(t *testing.T) {
	values := url.Values{}
	values.Set("page", "2")
	values.Set("limit", "25")
	values.Set("search", "hotspot")
	values.Set("category", "low,nominal")
	values.Set("province", "Suphan Buri")
	values.Set("bbox", "99.5,13.1,101.2,15.4")

	params, err := NewListParams(values)
	if err != nil {
		t.Fatalf("expected params, got error: %v", err)
	}
	if params.Page != 2 || params.Limit != 25 {
		t.Fatalf("unexpected pagination: %#v", params)
	}
	if params.BBox == nil || params.BBox.MinLng != 99.5 || params.BBox.MaxLat != 15.4 {
		t.Fatalf("unexpected bbox: %#v", params.BBox)
	}
}

func TestParseBBoxRejectsInvalidOrder(t *testing.T) {
	_, err := ParseBBox("101,15,100,14")
	if err == nil {
		t.Fatal("expected invalid bbox error")
	}
}

func TestNewNearbyParamsValidatesRadius(t *testing.T) {
	values := url.Values{}
	values.Set("lng", "100.5")
	values.Set("lat", "13.7")
	values.Set("radius", "5000")

	params, err := NewNearbyParams(values)
	if err != nil {
		t.Fatalf("expected nearby params, got error: %v", err)
	}
	if params.Lng != 100.5 || params.Lat != 13.7 || params.Radius != 5000 {
		t.Fatalf("unexpected params: %#v", params)
	}
}
