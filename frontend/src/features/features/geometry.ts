import type { BoundingBox, LineStringGeometry, PointGeometry, PolygonGeometry, Position, SpatialGeometry } from "../../types/geojson";
import { DEFAULT_COORDINATES } from "./constants";

export type GeometryValidationResult =
  | { ok: true; geometry: SpatialGeometry }
  | { ok: false; error: string };

export function parseGeometryInput(raw: string): GeometryValidationResult {
  try {
    return validateGeometry(JSON.parse(raw));
  } catch {
    return { ok: false, error: "Geometry must be valid JSON" };
  }
}

export function validateGeometry(value: unknown): GeometryValidationResult {
  if (!isRecord(value)) {
    return { ok: false, error: "Geometry must be a GeoJSON object" };
  }

  if (value.type === "Feature") {
    if (!isRecord(value.geometry)) {
      return { ok: false, error: "Feature must contain a valid geometry object" };
    }

    return validateGeometry(value.geometry);
  }

  if (value.type === "FeatureCollection") {
    if (!Array.isArray(value.features) || value.features.length !== 1) {
      return { ok: false, error: "FeatureCollection paste must contain exactly one feature" };
    }

    return validateGeometry(value.features[0]);
  }

  switch (value.type) {
    case "Point":
      return validatePoint(value);
    case "LineString":
      return validateLineString(value);
    case "Polygon":
      return validatePolygon(value);
    default:
      return { ok: false, error: "Geometry type must be Point, LineString, or Polygon" };
  }
}

export function geometrySummary(geometry: SpatialGeometry): string {
  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates;

    return `Point - ${lng.toFixed(5)}, ${lat.toFixed(5)}`;
  }

  if (geometry.type === "LineString") {
    return `LineString - ${geometry.coordinates.length} vertices`;
  }

  const vertices = geometry.coordinates.reduce((total, ring) => total + ring.length, 0);
  const ringText = geometry.coordinates.length === 1 ? "ring" : "rings";

  return `Polygon - ${geometry.coordinates.length} ${ringText}, ${vertices} vertices`;
}

export function geometryCenter(geometry: SpatialGeometry): Position {
  if (geometry.type === "Point") {
    return geometry.coordinates;
  }

  const positions = flattenPositions(geometry);
  const totals = positions.reduce(
    (acc, [lng, lat]) => {
      acc.lng += lng;
      acc.lat += lat;

      return acc;
    },
    { lng: 0, lat: 0 },
  );

  return [totals.lng / positions.length, totals.lat / positions.length];
}

export function geometryBounds(geometry: SpatialGeometry): BoundingBox {
  const positions = flattenPositions(geometry);
  const bounds = positions.reduce(
    (acc, [lng, lat]) => ({
      minLng: Math.min(acc.minLng, lng),
      minLat: Math.min(acc.minLat, lat),
      maxLng: Math.max(acc.maxLng, lng),
      maxLat: Math.max(acc.maxLat, lat),
    }),
    {
      minLng: Number.POSITIVE_INFINITY,
      minLat: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
    },
  );

  return [bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat];
}

export function geometryToJson(geometry: SpatialGeometry): string {
  return JSON.stringify(geometry, null, 2);
}

export function draftPointGeometry(coordinates: Position): PointGeometry {
  return { type: "Point", coordinates };
}

export function geometryTemplate(type: SpatialGeometry["type"], current: SpatialGeometry | null): SpatialGeometry {
  const center = current ? centerForTemplate(current) : DEFAULT_COORDINATES;

  if (type === "Point") {
    return { type, coordinates: center };
  }

  if (type === "LineString") {
    return {
      type,
      coordinates: [
        [center[0] - 0.05, center[1] - 0.03],
        [center[0] + 0.05, center[1] + 0.03],
      ],
    };
  }

  return {
    type,
    coordinates: [
      [
        [center[0] - 0.05, center[1] - 0.03],
        [center[0] + 0.05, center[1] - 0.03],
        [center[0] + 0.02, center[1] + 0.04],
        [center[0] - 0.05, center[1] - 0.03],
      ],
    ],
  };
}

export function centerForTemplate(geometry: SpatialGeometry): Position {
  const result = validateGeometry(geometry);

  if (!result.ok) {
    return DEFAULT_COORDINATES;
  }

  if (result.geometry.type === "Point") {
    return result.geometry.coordinates;
  }

  const coordinates = result.geometry.type === "LineString" ? result.geometry.coordinates : result.geometry.coordinates[0];
  const totals = coordinates.reduce(
    (acc, [lng, lat]) => {
      acc.lng += lng;
      acc.lat += lat;

      return acc;
    },
    { lng: 0, lat: 0 },
  );

  return [totals.lng / coordinates.length, totals.lat / coordinates.length];
}

function validatePoint(value: Record<string, unknown>): GeometryValidationResult {
  const position = parsePosition(value.coordinates);

  if (!position) {
    return { ok: false, error: "Point coordinates must contain longitude and latitude" };
  }

  return { ok: true, geometry: { type: "Point", coordinates: position } };
}

function validateLineString(value: Record<string, unknown>): GeometryValidationResult {
  if (!Array.isArray(value.coordinates) || value.coordinates.length < 2) {
    return { ok: false, error: "LineString coordinates must contain at least two positions" };
  }

  const parsedCoordinates = value.coordinates.map(parsePosition);

  if (parsedCoordinates.some((position) => position === null)) {
    return { ok: false, error: "LineString coordinates must contain longitude and latitude positions" };
  }

  const coordinates = removeConsecutiveDuplicatePositions(parsedCoordinates as Position[]);

  if (coordinates.length < 2) {
    return { ok: false, error: "LineString coordinates must contain at least two distinct positions" };
  }

  return { ok: true, geometry: { type: "LineString", coordinates } };
}

function validatePolygon(value: Record<string, unknown>): GeometryValidationResult {
  if (!Array.isArray(value.coordinates) || value.coordinates.length === 0) {
    return { ok: false, error: "Polygon coordinates must contain at least one linear ring" };
  }

  const rings: Position[][] = [];
  for (const rawRing of value.coordinates) {
    if (!Array.isArray(rawRing) || rawRing.length < 4) {
      return { ok: false, error: "Polygon linear rings must contain at least four positions" };
    }

    const ring = rawRing.map(parsePosition);

    if (ring.some((position) => position === null)) {
      return { ok: false, error: "Polygon coordinates must contain longitude and latitude positions" };
    }

    const typedRing = ring as Position[];
    const first = typedRing[0];
    const last = typedRing[typedRing.length - 1];

    if (first[0] !== last[0] || first[1] !== last[1]) {
      return { ok: false, error: "Polygon linear rings must be closed" };
    }

    rings.push(typedRing);
  }

  return { ok: true, geometry: { type: "Polygon", coordinates: rings } };
}

function parsePosition(value: unknown): Position | null {
  if (!Array.isArray(value) || value.length !== 2) {
    return null;
  }

  const [lng, lat] = value;

  if (!isCoordinate(lng, -180, 180) || !isCoordinate(lat, -90, 90)) {
    return null;
  }

  return [lng, lat];
}

function isCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function flattenPositions(geometry: SpatialGeometry): Position[] {
  if (geometry.type === "Point") {
    return [geometry.coordinates];
  }

  if (geometry.type === "LineString") {
    return geometry.coordinates;
  }

  return geometry.coordinates.flat();
}

function removeConsecutiveDuplicatePositions(coordinates: Position[]): Position[] {
  return coordinates.filter((position, index) => {
    if (index === 0) {
      return true;
    }

    const previous = coordinates[index - 1];

    return previous[0] !== position[0] || previous[1] !== position[1];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
