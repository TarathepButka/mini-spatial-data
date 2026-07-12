import type { Map } from "maplibre-gl";
import {
  TerraDraw,
  TerraDrawLineStringMode,
  TerraDrawPointMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import type { SpatialGeometry } from "../../types/geojson";
import { validateGeometry } from "./geometry";

export type DrawMode = "select" | "point" | "linestring" | "polygon";
export type DrawFeatureId = string | number;

const SELECT_MODE_FLAGS = {
  point: {
    feature: {
      draggable: true,
      coordinates: { draggable: true },
    },
  },
  linestring: {
    feature: {
      draggable: true,
      coordinates: {
        draggable: true,
        midpoints: { draggable: true },
        deletable: true,
      },
    },
  },
  polygon: {
    feature: {
      draggable: true,
      coordinates: {
        draggable: true,
        midpoints: { draggable: true },
        deletable: true,
      },
    },
  },
};

export function createTerraDraw(map: Map) {
  return new TerraDraw({
    adapter: new TerraDrawMapLibreGLAdapter({ map }),
    modes: [
      new TerraDrawSelectMode({
        flags: SELECT_MODE_FLAGS,
      }),
      new TerraDrawPointMode(),
      new TerraDrawLineStringMode({ keyEvents: { cancel: "Escape", finish: "Enter" } }),
      new TerraDrawPolygonMode(),
    ],
  });
}

export function drawModeForGeometry(geometry: SpatialGeometry): Exclude<DrawMode, "select"> {
  if (geometry.type === "Point") {
    return "point";
  }

  if (geometry.type === "LineString") {
    return "linestring";
  }

  return "polygon";
}

export function geometryFromDrawFeature(value: unknown): SpatialGeometry | null {
  if (!isRecord(value) || !isRecord(value.geometry) || !isRecord(value.properties)) {
    return null;
  }

  const mode = value.properties.mode;

  if (mode !== "point" && mode !== "linestring" && mode !== "polygon") {
    return null;
  }

  if (
    (mode === "point" && value.geometry.type !== "Point") ||
    (mode === "linestring" && value.geometry.type !== "LineString") ||
    (mode === "polygon" && value.geometry.type !== "Polygon")
  ) {
    return null;
  }

  const result = validateGeometry(value.geometry);

  return result.ok ? result.geometry : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
