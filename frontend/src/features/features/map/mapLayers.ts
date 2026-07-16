import type { FilterSpecification, GeoJSONSource, GeoJSONSourceSpecification, Map, StyleSpecification } from "maplibre-gl";
import type { BoundingBox, SpatialFeature } from "../../../types/geojson";
import type { CollectionOption } from "../../../api/features";
import { MAP_BOUNDS_DEBOUNCE_MS, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from "../utils/constants";
import { collectionColor, featureCollectionKey } from "../utils/collections";
import { featureCategory } from "../utils/styles";

export const FEATURE_SOURCE_ID = "spatial-features";
export const POINT_LAYER_ID = "spatial-features-point";
export const LINE_LAYER_ID = "spatial-features-line";
export const POLYGON_FILL_LAYER_ID = "spatial-features-polygon-fill";
export const POLYGON_OUTLINE_LAYER_ID = "spatial-features-polygon-outline";
export const SELECTED_POINT_LAYER_ID = "spatial-features-selected-point";
export const SELECTED_LINE_LAYER_ID = "spatial-features-selected-line";
export const SELECTED_POLYGON_LAYER_ID = "spatial-features-selected-polygon";
export const SELECTED_POLYGON_OUTLINE_LAYER_ID = "spatial-features-selected-polygon-outline";
export const FEATURE_CLICK_LAYERS = [
  SELECTED_POINT_LAYER_ID,
  SELECTED_LINE_LAYER_ID,
  SELECTED_POLYGON_LAYER_ID,
  SELECTED_POLYGON_OUTLINE_LAYER_ID,
  POINT_LAYER_ID,
  LINE_LAYER_ID,
  POLYGON_FILL_LAYER_ID,
  POLYGON_OUTLINE_LAYER_ID,
];
export const BOUNDS_CHANGE_DELAY_MS = MAP_BOUNDS_DEBOUNCE_MS;

export const rasterStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

export const initialMapView = {
  center: MAP_DEFAULT_CENTER,
  zoom: MAP_DEFAULT_ZOOM,
};

export function addFeatureLayers(map: Map) {
  if (!map.getSource(FEATURE_SOURCE_ID)) {
    map.addSource(FEATURE_SOURCE_ID, {
      type: "geojson",
      data: featureCollection([]),
    } as GeoJSONSourceSpecification);
  }

  if (!map.getLayer(POLYGON_FILL_LAYER_ID)) {
    map.addLayer({
      id: POLYGON_FILL_LAYER_ID,
      type: "fill",
      source: FEATURE_SOURCE_ID,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "fill-color": ["get", "_color"],
        "fill-opacity": 0.18,
      },
    });
  }

  if (!map.getLayer(POLYGON_OUTLINE_LAYER_ID)) {
    map.addLayer({
      id: POLYGON_OUTLINE_LAYER_ID,
      type: "line",
      source: FEATURE_SOURCE_ID,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: {
        "line-color": ["get", "_color"],
        "line-width": 2,
        "line-opacity": 0.9,
      },
    });
  }

  if (!map.getLayer(LINE_LAYER_ID)) {
    map.addLayer({
      id: LINE_LAYER_ID,
      type: "line",
      source: FEATURE_SOURCE_ID,
      filter: ["==", ["geometry-type"], "LineString"],
      paint: {
        "line-color": ["get", "_color"],
        "line-width": 3,
        "line-opacity": 0.9,
      },
    });
  }

  if (!map.getLayer(POINT_LAYER_ID)) {
    map.addLayer({
      id: POINT_LAYER_ID,
      type: "circle",
      source: FEATURE_SOURCE_ID,
      filter: ["==", ["geometry-type"], "Point"],
      paint: {
        "circle-color": ["get", "_color"],
        "circle-radius": 7,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
  }

  addSelectedLayers(map);
}

export function updateFeatureSource(map: Map, features: SpatialFeature[], collectionOptions: CollectionOption[] = []) {
  const source = map.getSource(FEATURE_SOURCE_ID) as GeoJSONSource | undefined;

  if (!source) {
    return;
  }

  source.setData(featureCollection(features, collectionOptions) as never);
}

export function updateSelectedFilters(map: Map, selectedFeatureId?: string | null) {
  const layerFilters: Array<[string, "Point" | "LineString" | "Polygon"]> = [
    [SELECTED_POINT_LAYER_ID, "Point"],
    [SELECTED_LINE_LAYER_ID, "LineString"],
    [SELECTED_POLYGON_LAYER_ID, "Polygon"],
    [SELECTED_POLYGON_OUTLINE_LAYER_ID, "Polygon"],
  ];

  layerFilters.forEach(([layerId, geometryType]) => {
    if (map.getLayer(layerId)) {
      map.setFilter(layerId, selectedFilter(geometryType, selectedFeatureId));
    }
  });
}

export function boundsToBBox(map: Map): BoundingBox {
  const bounds = map.getBounds();

  return [
    clamp(bounds.getWest(), -180, 180),
    clamp(bounds.getSouth(), -90, 90),
    clamp(bounds.getEast(), -180, 180),
    clamp(bounds.getNorth(), -90, 90),
  ];
}

function addSelectedLayers(map: Map) {
  if (!map.getLayer(SELECTED_POLYGON_LAYER_ID)) {
    map.addLayer({
      id: SELECTED_POLYGON_LAYER_ID,
      type: "fill",
      source: FEATURE_SOURCE_ID,
      filter: selectedFilter("Polygon", null),
      paint: {
        "fill-color": "#18181b",
        "fill-opacity": 0.14,
      },
    });
  }

  if (!map.getLayer(SELECTED_POLYGON_OUTLINE_LAYER_ID)) {
    map.addLayer({
      id: SELECTED_POLYGON_OUTLINE_LAYER_ID,
      type: "line",
      source: FEATURE_SOURCE_ID,
      filter: selectedFilter("Polygon", null),
      paint: {
        "line-color": "#18181b",
        "line-width": 4,
      },
    });
  }

  if (!map.getLayer(SELECTED_LINE_LAYER_ID)) {
    map.addLayer({
      id: SELECTED_LINE_LAYER_ID,
      type: "line",
      source: FEATURE_SOURCE_ID,
      filter: selectedFilter("LineString", null),
      paint: {
        "line-color": "#18181b",
        "line-width": 5,
      },
    });
  }

  if (!map.getLayer(SELECTED_POINT_LAYER_ID)) {
    map.addLayer({
      id: SELECTED_POINT_LAYER_ID,
      type: "circle",
      source: FEATURE_SOURCE_ID,
      filter: selectedFilter("Point", null),
      paint: {
        "circle-color": "#18181b",
        "circle-radius": 11,
        "circle-opacity": 0.22,
        "circle-stroke-color": "#18181b",
        "circle-stroke-width": 2,
      },
    });
  }
}

function selectedFilter(geometryType: "Point" | "LineString" | "Polygon", selectedFeatureId?: string | null): FilterSpecification {
  return ["all", ["==", ["geometry-type"], geometryType], ["==", ["id"], selectedFeatureId ?? "__none__"]];
}

function featureCollection(features: SpatialFeature[], collectionOptions: CollectionOption[] = []) {
  return {
    type: "FeatureCollection",
    features: features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        id: feature.id,
        _category: featureCategory(feature),
        _color: collectionColor(featureCollectionKey(feature), collectionOptions),
      },
    })),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
