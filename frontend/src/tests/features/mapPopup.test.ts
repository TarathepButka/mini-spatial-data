import { describe, expect, it } from "vitest";
import type { SpatialFeature } from "../../types/geojson";
import { buildFeaturePopupDetails } from "../../features/features/map/mapPopup";

function feature(overrides: Partial<SpatialFeature> = {}): SpatialFeature {
  const base: SpatialFeature = {
    id: "feature-1",
    type: "Feature",
    collection: "hotspots",
    geometry: { type: "Point", coordinates: [100.5, 13.75] },
    properties: {
      name: "Hotspot A",
      category: "high",
    },
  };

  return {
    ...base,
    ...overrides,
    properties: {
      ...base.properties,
      ...overrides.properties,
    },
  };
}

describe("buildFeaturePopupDetails", () => {
  it("builds location from only available location fields", () => {
    const details = buildFeaturePopupDetails(
      feature({
        properties: {
          name: "Hotspot A",
          tambol: "Mae Hia",
          amphoe: "Mueang Chiang Mai",
          province: "Chiang Mai",
        },
      }),
    );

    expect(details.location).toBe("Mae Hia / Mueang Chiang Mai / Chiang Mai");
  });

  it("uses Thai source date and time before audit timestamps", () => {
    const details = buildFeaturePopupDetails(
      feature({
        properties: {
          name: "Hotspot A",
          th_date: "2026-07-16",
          th_time: "14:20",
          updatedAt: "updated fallback",
          createdAt: "created fallback",
        },
      }),
    );

    expect(details.dateTime).toBe("2026-07-16 14:20");
  });

  it("falls back to updatedAt before createdAt", () => {
    const details = buildFeaturePopupDetails(
      feature({
        properties: {
          name: "Hotspot A",
          updatedAt: "updated fallback",
          createdAt: "created fallback",
        },
      }),
    );

    expect(details.dateTime).toBe("updated fallback");
  });

  it("falls back to createdAt when updatedAt is empty", () => {
    const details = buildFeaturePopupDetails(
      feature({
        properties: {
          name: "Hotspot A",
          createdAt: "created fallback",
        },
      }),
    );

    expect(details.dateTime).toBe("created fallback");
  });

  it("includes hotspot fields when present", () => {
    const details = buildFeaturePopupDetails(
      feature({
        properties: {
          name: "Hotspot A",
          frp: 12.345,
          hotspotid: "hs-123",
          satellite: "Suomi NPP",
          instrument: "VIIRS",
        },
      }),
    );

    expect(details.hotspotDetails).toBe("FRP 12.35 | Hotspot hs-123 | Suomi NPP / VIIRS");
  });

  it("truncates long descriptions", () => {
    const details = buildFeaturePopupDetails(
      feature({
        properties: {
          name: "Hotspot A",
          description: "a".repeat(200),
        },
      }),
    );

    expect(details.description).toHaveLength(160);
    expect(details.description?.endsWith("...")).toBe(true);
  });

  it("uses supplied collection labels and geometry summary", () => {
    const details = buildFeaturePopupDetails(feature(), [
      { id: "hotspots", label: "Fire Detections", description: "", color: "#eb5757" },
    ]);

    expect(details.collection).toBe("Fire Detections");
    expect(details.status).toBe("high");
    expect(details.geometry).toContain("Point");
  });
});
