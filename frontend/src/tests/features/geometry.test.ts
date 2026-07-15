import { describe, expect, it } from "vitest";
import {
  draftPointGeometry,
  geometryBounds,
  geometryCenter,
  geometrySummary,
  geometryTemplate,
  parseGeometryInput,
  validateGeometry,
} from "../../features/features/utils/geometry";

describe("parseGeometryInput", () => {
  it("returns error for invalid JSON", () => {
    const result = parseGeometryInput("not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/valid JSON/i);
  });

  it("parses a valid Point geometry", () => {
    const result = parseGeometryInput(JSON.stringify({ type: "Point", coordinates: [100.5, 13.7] }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.geometry.type).toBe("Point");
    }
  });
});

describe("validateGeometry", () => {
  it("rejects non-object values", () => {
    expect(validateGeometry(null).ok).toBe(false);
    expect(validateGeometry("string").ok).toBe(false);
    expect(validateGeometry(42).ok).toBe(false);
  });

  it("validates a Point", () => {
    const result = validateGeometry({ type: "Point", coordinates: [100.5, 13.7] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.geometry.type).toBe("Point");
  });

  it("validates a LineString", () => {
    const result = validateGeometry({ type: "LineString", coordinates: [[100, 13], [101, 14]] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.geometry.type).toBe("LineString");
  });

  it("rejects a LineString with one point", () => {
    const result = validateGeometry({ type: "LineString", coordinates: [[100, 13]] });
    expect(result.ok).toBe(false);
  });

  it("validates a Polygon", () => {
    const coords: [number, number][][] = [[[100, 13], [101, 13], [101, 14], [100, 13]]];
    const result = validateGeometry({ type: "Polygon", coordinates: coords });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.geometry.type).toBe("Polygon");
  });

  it("rejects an unclosed Polygon", () => {
    const coords: [number, number][][] = [[[100, 13], [101, 13], [101, 14], [100, 14]]];
    const result = validateGeometry({ type: "Polygon", coordinates: coords });
    expect(result.ok).toBe(false);
  });

  it("unwraps a Feature envelope", () => {
    const result = validateGeometry({
      type: "Feature",
      geometry: { type: "Point", coordinates: [100, 13] },
      properties: {},
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.geometry.type).toBe("Point");
  });

  it("rejects FeatureCollection with multiple features", () => {
    const result = validateGeometry({
      type: "FeatureCollection",
      features: [
        { type: "Feature", geometry: { type: "Point", coordinates: [100, 13] }, properties: {} },
        { type: "Feature", geometry: { type: "Point", coordinates: [101, 14] }, properties: {} },
      ],
    });
    expect(result.ok).toBe(false);
  });
});

describe("geometrySummary", () => {
  it("summarises a Point", () => {
    const summary = geometrySummary({ type: "Point", coordinates: [100.5, 13.75] });
    expect(summary).toMatch(/Point/);
    expect(summary).toMatch(/100\.50000/);
  });

  it("summarises a LineString", () => {
    const summary = geometrySummary({ type: "LineString", coordinates: [[100, 13], [101, 14], [102, 15]] });
    expect(summary).toMatch(/LineString/);
    expect(summary).toMatch(/3 vertices/);
  });

  it("summarises a Polygon", () => {
    const coords: [number, number][][] = [[[100, 13], [101, 13], [101, 14], [100, 13]]];
    const summary = geometrySummary({ type: "Polygon", coordinates: coords });
    expect(summary).toMatch(/Polygon/);
    expect(summary).toMatch(/1 ring/);
  });
});

describe("geometryCenter", () => {
  it("returns coordinates for a Point", () => {
    const center = geometryCenter({ type: "Point", coordinates: [100, 13] });
    expect(center).toEqual([100, 13]);
  });

  it("calculates midpoint for a LineString", () => {
    const center = geometryCenter({ type: "LineString", coordinates: [[100, 10], [102, 12]] });
    expect(center[0]).toBeCloseTo(101);
    expect(center[1]).toBeCloseTo(11);
  });
});

describe("geometryBounds", () => {
  it("returns bbox for a LineString", () => {
    const bounds = geometryBounds({ type: "LineString", coordinates: [[100, 10], [102, 12]] });
    expect(bounds).toEqual([100, 10, 102, 12]);
  });
});

describe("draftPointGeometry", () => {
  it("creates a Point geometry", () => {
    const point = draftPointGeometry([100, 13]);
    expect(point.type).toBe("Point");
    expect(point.coordinates).toEqual([100, 13]);
  });
});

describe("geometryTemplate", () => {
  it("creates a Point template", () => {
    const geom = geometryTemplate("Point", null);
    expect(geom.type).toBe("Point");
  });

  it("creates a LineString template", () => {
    const geom = geometryTemplate("LineString", null);
    expect(geom.type).toBe("LineString");
    if (geom.type === "LineString") {
      expect(geom.coordinates.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("creates a Polygon template", () => {
    const geom = geometryTemplate("Polygon", null);
    expect(geom.type).toBe("Polygon");
  });
});
