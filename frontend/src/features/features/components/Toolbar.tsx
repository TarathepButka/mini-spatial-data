import { useState } from "react";
import { ChevronDown, ChevronUp, Database, Filter, MapPinned, User } from "lucide-react";

import { Button } from "../../../components/ui/Button";
import type { BoundingBox, SpatialFeature } from "../../../types/geojson";
import { CategoryFilterDropdown } from "./CategoryFilterDropdown";
import { ProvinceFilterDropdown } from "./ProvinceFilterDropdown";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { ViewModeToggle, type ViewMode } from "./ViewModeToggle";

type ToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchCommit: (value: string) => void;
  onSuggestionSelect: (feature: SpatialFeature) => void;
  province: string;
  onProvinceChange: (value: string) => void;
  provinceCounts: ReadonlyMap<string, number>;
  categories: string[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  bboxEnabled: boolean;
  bbox: BoundingBox | null;
  onBBoxEnabledChange: (enabled: boolean) => void;
  canSeed: boolean;
  onSeed: () => void;
  seedLoading: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showOnlyMine: boolean;
  onShowOnlyMineChange: (enabled: boolean) => void;
};

export function Toolbar({
  search,
  onSearchChange,
  onSearchCommit,
  onSuggestionSelect,
  province,
  onProvinceChange,
  provinceCounts,
  categories,
  selectedCategories,
  onCategoriesChange,
  bboxEnabled,
  bbox,
  onBBoxEnabledChange,
  canSeed,
  onSeed,
  seedLoading,
  viewMode,
  onViewModeChange,
  showOnlyMine,
  onShowOnlyMineChange,
}: ToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersSettled, setFiltersSettled] = useState(false);

  // Count active filters for the badge
  const activeFilterCount =
    (province ? 1 : 0) +
    (selectedCategories.length > 0 ? 1 : 0) +
    (bboxEnabled ? 1 : 0) +
    (showOnlyMine ? 1 : 0);

  // When filters close, immediately reset settled so overflow-hidden kicks in for the close animation
  function handleToggleFilters() {
    setFiltersOpen((prev) => {
      if (prev) {
        setFiltersSettled(false);
      }
      return !prev;
    });
  }

  const ChevronIcon = filtersOpen ? ChevronUp : ChevronDown;

  return (
    <div className="border-b border-zinc-200 bg-white px-4 py-3">
      {/* Row 1: search + mobile filter toggle */}
      <div className="flex items-center gap-3">
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

        {/* Mobile filter toggle button — hidden on lg+ */}
        <button
          type="button"
          onClick={handleToggleFilters}
          className="relative inline-flex h-10 items-center gap-1.5 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 active:bg-zinc-100 lg:hidden"
          aria-expanded={filtersOpen}
          aria-controls="toolbar-filters"
        >
          <Filter size={16} />
          <span className="hidden min-[480px]:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-[11px] font-semibold leading-none text-white">
              {activeFilterCount}
            </span>
          )}
          <ChevronIcon size={14} className="text-zinc-400" />
        </button>
      </div>

      {/* Desktop: always-visible filter row — hidden on mobile */}
      <div className="mt-3 hidden flex-wrap items-center gap-3 lg:flex">
        <FilterControls
          province={province}
          onProvinceChange={onProvinceChange}
          provinceCounts={provinceCounts}
          categories={categories}
          selectedCategories={selectedCategories}
          onCategoriesChange={onCategoriesChange}
          bboxEnabled={bboxEnabled}
          onBBoxEnabledChange={onBBoxEnabledChange}
          showOnlyMine={showOnlyMine}
          onShowOnlyMineChange={onShowOnlyMineChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          canSeed={canSeed}
          onSeed={onSeed}
          seedLoading={seedLoading}
        />
      </div>

      {/* Mobile: collapsible filter panel */}
      <div
        id="toolbar-filters"
        className={[
          "grid transition-[grid-template-rows,opacity] duration-200 ease-in-out lg:hidden",
          filtersOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
        onTransitionEnd={() => {
          if (filtersOpen) {
            setFiltersSettled(true);
          }
        }}
      >
        <div className={`min-h-0 ${filtersSettled ? "overflow-visible" : "overflow-hidden"}`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <FilterControls
              province={province}
              onProvinceChange={onProvinceChange}
              provinceCounts={provinceCounts}
              categories={categories}
              selectedCategories={selectedCategories}
              onCategoriesChange={onCategoriesChange}
              bboxEnabled={bboxEnabled}
              onBBoxEnabledChange={onBBoxEnabledChange}
              showOnlyMine={showOnlyMine}
              onShowOnlyMineChange={onShowOnlyMineChange}
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              canSeed={canSeed}
              onSeed={onSeed}
              seedLoading={seedLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared filter controls (used in both desktop inline & mobile panel) ─── */

type FilterControlsProps = {
  province: string;
  onProvinceChange: (value: string) => void;
  provinceCounts: ReadonlyMap<string, number>;
  categories: string[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  bboxEnabled: boolean;
  onBBoxEnabledChange: (enabled: boolean) => void;
  showOnlyMine: boolean;
  onShowOnlyMineChange: (enabled: boolean) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  canSeed: boolean;
  onSeed: () => void;
  seedLoading: boolean;
};

function FilterControls({
  province,
  onProvinceChange,
  provinceCounts,
  categories,
  selectedCategories,
  onCategoriesChange,
  bboxEnabled,
  onBBoxEnabledChange,
  showOnlyMine,
  onShowOnlyMineChange,
  viewMode,
  onViewModeChange,
  canSeed,
  onSeed,
  seedLoading,
}: FilterControlsProps) {
  return (
    <>
      <ProvinceFilterDropdown province={province} provinceCounts={provinceCounts} onChange={onProvinceChange} />

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

      <label className="inline-flex h-10 cursor-pointer select-none items-center gap-2 rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={showOnlyMine}
          onChange={(event) => onShowOnlyMineChange(event.target.checked)}
          className="h-4 w-4 cursor-pointer accent-zinc-900"
        />
        <User size={16} />
        My features
      </label>

      <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />

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
    </>
  );
}
