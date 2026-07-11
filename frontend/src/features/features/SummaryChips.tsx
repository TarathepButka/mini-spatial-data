import type { FeaturesMeta, SpatialFeature } from "../../types/geojson";
import { featureCategory } from "./styles";

type SummaryChipsProps = {
  features: SpatialFeature[];
  meta?: FeaturesMeta;
};

export function SummaryChips({ features, meta }: SummaryChipsProps) {
  const provinces = new Set(features.map((feature) => feature.properties.province).filter(Boolean));
  const categoryCounts = features.reduce<Record<string, number>>((accumulator, feature) => {
    const category = featureCategory(feature);
    accumulator[category] = (accumulator[category] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <Chip label="Total" value={meta?.total ?? features.length} />
      <Chip label="Visible" value={features.length} />
      <Chip label="Provinces" value={provinces.size} />
      {Object.entries(categoryCounts).slice(0, 4).map(([category, count]) => (
        <Chip key={category} label={category} value={count} />
      ))}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded border border-zinc-200 bg-white px-3 py-1 text-zinc-700 shadow-sm">
      <span className="text-zinc-500">{label}</span>
      <strong className="font-semibold text-zinc-950">{value.toLocaleString()}</strong>
    </span>
  );
}
