import { describe, expect, it } from "vitest";
import type { SpatialGeometry } from "../../types/geojson";
import { geometryFromDrawFeature } from "./mapDraw";
import { geometryBounds, geometryCenter, geometrySummary, parseGeometryInput, validateGeometry } from "./geometry";

describe("geometry helpers", () => {
  it("summarizes supported geometries", () => {
    expect(geometrySummary({ type: "Point", coordinates: [100.5018, 13.7563] })).toBe("Point - 100.50180, 13.75630");
    expect(
      geometrySummary({
        type: "LineString",
        coordinates: [
          [100.5, 13.7],
          [100.6, 13.8],
          [100.7, 13.9],
        ],
      }),
    ).toBe("LineString - 3 vertices");
    expect(
      geometrySummary({
        type: "Polygon",
        coordinates: [
          [
            [100.5, 13.7],
            [100.6, 13.7],
            [100.6, 13.8],
            [100.5, 13.7],
          ],
        ],
      }),
    ).toBe("Polygon - 1 ring, 4 vertices");
  });

  it("removes consecutive duplicate LineString vertices", () => {
    const result = validateGeometry({
      type: "LineString",
      coordinates: [
        [99.348117985, 19.656898909],
        [99.9186899, 19.625613454],
        [99.9186899, 19.625613454],
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.geometry.type === "LineString") {
      expect(result.geometry.coordinates).toEqual([
        [99.348117985, 19.656898909],
        [99.9186899, 19.625613454],
      ]);
    }
  });

  it("ignores Terra Draw guidance points from line mode", () => {
    expect(
      geometryFromDrawFeature({
        id: "guidance",
        type: "Feature",
        properties: { mode: "linestring", closingPoint: true },
        geometry: { type: "Point", coordinates: [100, 15] },
      }),
    ).toBeNull();

    expect(
      geometryFromDrawFeature({
        id: "line",
        type: "Feature",
        properties: { mode: "linestring" },
        geometry: {
          type: "LineString",
          coordinates: [
            [100, 15],
            [101, 16],
          ],
        },
      }),
    ).toEqual({
      type: "LineString",
      coordinates: [
        [100, 15],
        [101, 16],
      ],
    });
  });

  it("calculates center and bounds", () => {
    const geometry: SpatialGeometry = {
      type: "LineString",
      coordinates: [
        [100, 10],
        [102, 12],
      ],
    };

    expect(geometryCenter(geometry)).toEqual([101, 11]);
    expect(geometryBounds(geometry)).toEqual([100, 10, 102, 12]);
  });

  it("parses valid raw GeoJSON geometry", () => {
    const result = parseGeometryInput(
      JSON.stringify({
        type: "Polygon",
        coordinates: [
          [
            [100.5, 13.7],
            [100.6, 13.7],
            [100.6, 13.8],
            [100.5, 13.7],
          ],
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.geometry.type).toBe("Polygon");
    }
  });

  it("parses a single-feature GeoJSON FeatureCollection paste", () => {
    const result = parseGeometryInput(
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [30.2300598, 79.0989428],
                [39.6034446, 85.0041385],
              ],
            },
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.geometry).toEqual({
        type: "LineString",
        coordinates: [
          [30.2300598, 79.0989428],
          [39.6034446, 85.0041385],
        ],
      });
    }
  });

  it("rejects invalid raw JSON", () => {
    expect(parseGeometryInput("{").ok).toBe(false);
  });

  it("rejects unsupported geometry types", () => {
    const result = validateGeometry({ type: "MultiPolygon", coordinates: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid polygon rings", () => {
    const result = validateGeometry({
      type: "Polygon",
      coordinates: [
        [
          [100.5, 13.7],
          [100.6, 13.7],
          [100.6, 13.8],
          [100.5, 13.8],
        ],
      ],
    });
    expect(result.ok).toBe(false);
  });
});
