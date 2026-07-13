import { Database, MapPinned, Plus } from "lucide-react";

import { Button } from "../../components/ui/Button";
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
  canCreate: boolean;
  canSeed: boolean;
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
  canCreate,
  canSeed,
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

      {canSeed ? (
        <Button
          title="Seed Vallaris Thailand data"
          onClick={onSeed}
          disabled={seedLoading}
          variant="secondary"
          className="px-3"
        >
          <Database size={17} />
          {seedLoading ? "Seeding" : "Seed"}
        </Button>
      ) : null}

      {canCreate ? (
        <Button title="Add feature" onClick={onAdd} variant="primary">
          <Plus size={18} />
          Add
        </Button>
      ) : null}
    </div>
  );
}
