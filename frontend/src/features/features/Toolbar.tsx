import { Database, MapPinned, Plus } from "lucide-react";

import type { BoundingBox, SpatialFeature } from "../../types/geojson";
import { CategoryFilterDropdown } from "./CategoryFilterDropdown";
import { ProvinceFilterDropdown } from "./ProvinceFilterDropdown";
import { SearchAutocomplete } from "./SearchAutocomplete";

type ToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchCommit: (value: string) => void;
  onSuggestionSelect: (feature: SpatialFeature) => void;
  province: string;
  onProvinceChange: (value: string) => void;
  provinceOptions: string[];
  categories: string[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  bboxEnabled: boolean;
  bbox: BoundingBox | null;
  onBBoxEnabledChange: (enabled: boolean) => void;
  onAdd: () => void;
  onSeed: () => void;
  seedLoading: boolean;
};

export function Toolbar({
  search,
  onSearchChange,
  onSearchCommit,
  onSuggestionSelect,
  province,
  onProvinceChange,
  provinceOptions,
  categories,
  selectedCategories,
  onCategoriesChange,
  bboxEnabled,
  bbox,
  onBBoxEnabledChange,
  onAdd,
  onSeed,
  seedLoading,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
      <SearchAutocomplete
        search={search}
        province={province}
        selectedCategories={selectedCategories}
        bboxEnabled={bboxEnabled}
        bbox={bbox}
        onSearchChange={onSearchChange}
        onSearchCommit={onSearchCommit}
        onSelect={onSuggestionSelect}
      />

      <ProvinceFilterDropdown province={province} provinceOptions={provinceOptions} onChange={onProvinceChange} />

      <CategoryFilterDropdown categories={categories} selectedCategories={selectedCategories} onChange={onCategoriesChange} />

      <label className="inline-flex h-10 cursor-pointer select-none items-center gap-2 rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={bboxEnabled}
          onChange={(event) => onBBoxEnabledChange(event.target.checked)}
          className="h-4 w-4 cursor-pointer accent-zinc-900"
        />
        <MapPinned size={16} />
        Viewport
      </label>

      <button
        type="button"
        title="Seed Vallaris Thailand data"
        onClick={onSeed}
        disabled={seedLoading}
        className="inline-flex h-10 items-center gap-2 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Database size={17} />
        {seedLoading ? "Seeding" : "Seed"}
      </button>

      <button
        type="button"
        title="Add feature"
        onClick={onAdd}
        className="inline-flex h-10 items-center gap-2 rounded bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
      >
        <Plus size={18} />
        Add
      </button>
    </div>
  );
}
