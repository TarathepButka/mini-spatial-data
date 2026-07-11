import type { SpatialFeature } from "../../types/geojson";

export const DEFAULT_CATEGORIES = ["low", "nominal", "high", "manual", "unknown"];

const CATEGORY_COLORS: Record<string, string> = {
  low: "#2f80ed",
  nominal: "#f2994a",
  high: "#eb5757",
  manual: "#27ae60",
  unknown: "#7f8c8d",
};

export function categoryColor(category?: string): string {
  if (!category) return CATEGORY_COLORS.unknown;
  return CATEGORY_COLORS[category] ?? stringToColor(category);
}

export function featureCategory(feature: SpatialFeature): string {
  return feature.properties.category ?? feature.properties.confidence ?? "unknown";
}

function stringToColor(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 45%)`;
}
