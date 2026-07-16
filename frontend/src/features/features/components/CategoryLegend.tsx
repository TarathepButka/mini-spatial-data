import { COLLECTION_OPTIONS as DEFAULT_COLLECTION_OPTIONS, collectionColor } from "../utils/collections";
import type { CollectionOption } from "../../../api/features";

type CategoryLegendProps = {
  collectionOptions?: CollectionOption[];
};

export function CategoryLegend({ collectionOptions = [] }: CategoryLegendProps) {
  const options = collectionOptions.length > 0 ? collectionOptions : DEFAULT_COLLECTION_OPTIONS;

  return (
    <div
      aria-label="Collections color legend"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-x-3 gap-y-2 rounded border border-zinc-200 bg-white/95 px-3 py-2 text-xs text-zinc-700 shadow-sm whitespace-nowrap"
    >
      <span className="font-medium text-zinc-950">Collections</span>
      {options.map((collection) => (
        <span key={collection.id} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: collectionColor(collection.id, options) }} />
          {collection.label}
        </span>
      ))}
    </div>
  );
}
