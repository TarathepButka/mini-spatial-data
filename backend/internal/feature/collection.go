package feature

import (
	"fmt"
	"strings"
)

const (
	CollectionHotspots     = "hotspots"
	CollectionHospitals    = "hospitals"
	CollectionWaterSources = "water_sources"
	CollectionObservations = "observations"
)

var ValidCollections = []string{
	CollectionHotspots,
	CollectionHospitals,
	CollectionWaterSources,
	CollectionObservations,
}

type CollectionInfo struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Color       string `json:"color"`
}

var CollectionOptions = []CollectionInfo{
	{ID: CollectionHotspots, Label: "Hotspots", Description: "Vallaris fire detections", Color: "#eb5757"},
	{ID: CollectionHospitals, Label: "Hospitals", Description: "Hospitals and medical support", Color: "#2f80ed"},
	{ID: CollectionWaterSources, Label: "Water Sources", Description: "Water access for response", Color: "#00a6a6"},
	{ID: CollectionObservations, Label: "Observations", Description: "Manual and general observations", Color: "#27ae60"},
}

func NormalizeCollection(value string) (string, error) {
	collection := strings.TrimSpace(value)
	if collection == "" {
		return "", ValidationError{Message: "collection is required"}
	}

	if !IsValidCollection(collection) {
		return "", ValidationError{Message: fmt.Sprintf("collection must be one of %s", strings.Join(ValidCollections, ", "))}
	}

	return collection, nil
}

func IsValidCollection(collection string) bool {
	for _, valid := range ValidCollections {
		if collection == valid {
			return true
		}
	}

	return false
}

func LegacyCollectionForDocument(document FeatureDocument) string {
	if strings.EqualFold(strings.TrimSpace(stringProperty(document.Properties, "source")), "vallaris") || strings.TrimSpace(document.SourceID) != "" {
		return CollectionHotspots
	}

	return CollectionObservations
}
