import { DEFAULT_CATEGORIES, categoryColor } from "./styles";

type CategoryLegendProps = {
  categories: string[];
};

export function CategoryLegend({ categories }: CategoryLegendProps) {
  const options = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories])).filter(Boolean);

  return (
    <div
      aria-label="Confidence color legend"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-x-3 gap-y-2 rounded border border-zinc-200 bg-white/95 px-3 py-2 text-xs text-zinc-700 shadow-sm whitespace-nowrap"
    >
      <span className="font-medium text-zinc-950">Confidence</span>
      {options.map((category) => (
        <span key={category} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColor(category) }} />
          {category}
        </span>
      ))}
    </div>
  );
}
