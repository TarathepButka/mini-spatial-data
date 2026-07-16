import { useInfiniteQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useRef, useState, type UIEvent, type WheelEvent } from "react";
import { getFeatures } from "../../../api/features";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useDropdownDismiss } from "../../../hooks/useDropdownDismiss";
import type { BoundingBox, SpatialFeature } from "../../../types/geojson";
import { SUGGESTION_DEBOUNCE_MS, SUGGESTION_PAGE_SIZE } from "../utils/constants";
import { collectionColor, collectionLabel, featureCollectionKey } from "../utils/collections";
import { featureCategory } from "../utils/styles";

type SearchAutocompleteProps = {
  search: string;
  province: string;
  selectedCategories: string[];
  selectedCollections: string[];
  bboxEnabled: boolean;
  bbox: BoundingBox | null;
  onSearchChange: (value: string) => void;
  onSearchCommit: (value: string) => void;
  onSelect: (feature: SpatialFeature) => void;
};

export function SearchAutocomplete({
  search,
  province,
  selectedCategories,
  selectedCollections,
  bboxEnabled,
  bbox,
  onSearchChange,
  onSearchCommit,
  onSelect,
}: SearchAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const query = search.trim();
  const debouncedQuery = useDebouncedValue(query, SUGGESTION_DEBOUNCE_MS);
  const categoryParam = selectedCategories.length > 0 ? selectedCategories.join(",") : undefined;
  const collectionParam = selectedCollections.length > 0 ? selectedCollections.join(",") : undefined;
  const showSuggestions = open && debouncedQuery.length > 0;

  useDropdownDismiss(containerRef, setOpen);

  const suggestionsQuery = useInfiniteQuery({
    queryKey: ["feature-suggestions", debouncedQuery, province, collectionParam, categoryParam, bboxEnabled, bbox],
    enabled: showSuggestions,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getFeatures({
        page: pageParam,
        limit: SUGGESTION_PAGE_SIZE,
        search: debouncedQuery,
        province: province || undefined,
        collection: collectionParam,
        category: categoryParam,
        bbox: bboxEnabled ? bbox : null,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    staleTime: 30_000,
  });

  const suggestions = useMemo(
    () => suggestionsQuery.data?.pages.flatMap((page) => page.data.features) ?? [],
    [suggestionsQuery.data],
  );

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    fetchNextPageIfNeeded(event.currentTarget);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.stopPropagation();
    if (event.deltaY > 0) {
      fetchNextPageIfNeeded(event.currentTarget);
    }
  }

  function fetchNextPageIfNeeded(element: HTMLDivElement) {
    const nearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 24;
    if (nearBottom && suggestionsQuery.hasNextPage && !suggestionsQuery.isFetchingNextPage) {
      void suggestionsQuery.fetchNextPage();
    }
  }

  function selectSuggestion(feature: SpatialFeature) {
    onSearchChange(feature.properties.name);
    onSearchCommit(feature.properties.name);
    onSelect(feature);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative min-w-64 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
      <input
        value={search}
        onChange={(event) => {
          onSearchChange(event.target.value);
          setOpen(true);
        }}
        onBlur={() => onSearchCommit(search)}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onSearchCommit(search);
            setOpen(false);
          }
        }}
        autoComplete="off"
        placeholder="Search by name, hotspot, province"
        className="h-10 w-full rounded border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none ring-0 transition focus:border-zinc-400"
      />

      {showSuggestions && (
        <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded border border-zinc-200 bg-white text-sm text-zinc-700 shadow-lg">
          <div
            role="listbox"
            className="max-h-[17.5rem] overflow-auto overscroll-contain p-1"
            onScroll={handleScroll}
            onWheel={handleWheel}
          >
            {suggestionsQuery.isLoading ? (
              <div className="px-3 py-2 text-zinc-500">Loading suggestions</div>
            ) : null}

            {!suggestionsQuery.isLoading && suggestions.length === 0 ? (
              <div className="px-3 py-2 text-zinc-500">No matching records</div>
            ) : null}

            {suggestions.map((feature) => (
              <button
                key={feature.id}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => selectSuggestion(feature)}
                className="flex h-14 w-full items-start gap-3 rounded px-3 py-2 text-left transition hover:bg-zinc-100"
              >
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: collectionColor(featureCollectionKey(feature)) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-zinc-950">{feature.properties.name}</span>
                  <span className="block truncate text-xs text-zinc-500">{suggestionDetail(feature)}</span>
                </span>
                <span className="shrink-0 rounded border border-zinc-200 px-1.5 py-0.5 text-xs text-zinc-500">{collectionLabel(featureCollectionKey(feature))}</span>
              </button>
            ))}

            {suggestionsQuery.isFetchingNextPage ? (
              <div className="px-3 py-2 text-zinc-500">Loading more</div>
            ) : null}

            {suggestionsQuery.hasNextPage && !suggestionsQuery.isFetchingNextPage ? (
              <div aria-hidden="true" className="h-px" />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function suggestionDetail(feature: SpatialFeature) {
  const location = [feature.properties.province, feature.properties.amphoe, feature.properties.tambol]
    .filter(Boolean)
    .join(" / ");

  if (location && feature.properties.hotspotid) {
    return `${location} - ${feature.properties.hotspotid}`;
  }

  return location || feature.properties.hotspotid || "No location detail";
}
