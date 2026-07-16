export type CollectionOption = {
  id: string;
  label: string;
  description: string;
  color: string;
};

export const COLLECTION_OPTIONS: CollectionOption[] = [
  { id: "hotspots", label: "Hotspots", description: "Vallaris fire detections", color: "#eb5757" },
  { id: "hospitals", label: "Hospitals", description: "Hospitals and medical support", color: "#2f80ed" },
  { id: "water_sources", label: "Water Sources", description: "Water access for response", color: "#00a6a6" },
  { id: "observations", label: "Observations", description: "Manual and general observations", color: "#27ae60" },
];

const COLLECTIONS_BY_ID = new Map(COLLECTION_OPTIONS.map((collection) => [collection.id, collection]));

export function collectionLabel(collection?: string, options: CollectionOption[] = COLLECTION_OPTIONS): string {
  if (!collection) {
    return "Observations";
  }

  return options.find((c) => c.id === collection)?.label ?? collection;
}

export function collectionColor(collection?: string, options: CollectionOption[] = COLLECTION_OPTIONS): string {
  if (!collection) {
    return options.find((c) => c.id === "observations")?.color ?? "#7f8c8d";
  }

  return options.find((c) => c.id === collection)?.color ?? stringToColor(collection);
}

export function featureCollectionKey(feature: { collection?: string }): string {
  return feature.collection || "observations";
}

function stringToColor(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;

  return `hsl(${hue} 65% 42%)`;
}
