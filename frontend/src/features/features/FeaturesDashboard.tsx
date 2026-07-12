import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createFeature, deleteFeature, getFeatures, seedVallaris, updateFeature } from "../../api/features";
import type { BoundingBox, FeatureInput, FeaturesResponse, SpatialFeature, SpatialGeometry } from "../../types/geojson";
import { useAuth } from "../auth/AuthContext";
import { CategoryLegend } from "./CategoryLegend";
import { DeleteFeatureDialog } from "./DeleteFeatureDialog";
import { FeatureFormPanel } from "./FeatureFormPanel";
import { FeatureMap } from "./FeatureMap";
import { FeaturesTable } from "./FeaturesTable";
import { DEFAULT_COORDINATES, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, SEARCH_COMMIT_DELAY_MS } from "./constants";
import { draftPointGeometry } from "./geometry";
import { Toolbar } from "./Toolbar";
import { UserMenu } from "./UserMenu";
import { featureCategory } from "./styles";

export function FeaturesDashboard() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const debouncedSearchInput = useDebouncedValue(search, SEARCH_COMMIT_DELAY_MS);
  const [province, setProvince] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [bboxEnabled, setBBoxEnabled] = useState(true);
  const [bbox, setBBox] = useState<BoundingBox | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [mapFocusRequestId, setMapFocusRequestId] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingFeature, setEditingFeature] = useState<SpatialFeature | null>(null);
  const [draftGeometry, setDraftGeometry] = useState<SpatialGeometry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpatialFeature | null>(null);

  const categoryParam = selectedCategories.length > 0 ? selectedCategories.join(",") : undefined;

  const featuresQuery = useQuery({
    queryKey: ["features", page, pageSize, appliedSearch, province, categoryParam, bboxEnabled, bbox],
    queryFn: () =>
      getFeatures({
        page,
        limit: pageSize,
        search: appliedSearch || undefined,
        province: province || undefined,
        category: categoryParam,
        bbox: bboxEnabled ? bbox : null,
      }),
  });

  const features = featuresQuery.data?.data.features ?? [];
  const meta = featuresQuery.data?.meta;

  const mapFeaturesQuery = useQuery({
    queryKey: ["features-map", appliedSearch, province, categoryParam, bboxEnabled, bbox],
    queryFn: async () => {
      const baseQuery = {
        page: 1,
        limit: 100,
        search: appliedSearch || undefined,
        province: province || undefined,
        bbox: bboxEnabled ? bbox : null,
      };

      if (selectedCategories.length <= 1) {
        return getFeatures({ ...baseQuery, category: categoryParam });
      }

      const responses = await Promise.all(
        selectedCategories.map((category) => getFeatures({ ...baseQuery, category })),
      );
      const featuresById = new Map<string, SpatialFeature>();
      responses.forEach((response) => {
        response.data.features.forEach((feature) => featuresById.set(feature.id, feature));
      });

      const mergedResponse: FeaturesResponse = {
        data: {
          type: "FeatureCollection",
          features: Array.from(featuresById.values()),
        },
        meta: {
          page: 1,
          limit: baseQuery.limit,
          total: responses.reduce((sum, response) => sum + response.meta.total, 0),
          totalPages: 1,
        },
      };
      return mergedResponse;
    },
  });

  const mapFeatures = mapFeaturesQuery.data?.data.features ?? features;

  const createMutation = useMutation({
    mutationFn: createFeature,
    onSuccess: (feature) => {
      closeForm();
      focusFeature(feature);
      invalidateFeatureQueries();
      toast.success("Feature created", {
        description: feature.properties.name,
      });
    },
    onError: (error) => {
      toast.error("Create failed", {
        description: errorMessage(error),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: FeatureInput }) => updateFeature(id, input),
    onSuccess: (feature) => {
      closeForm();
      focusFeature(feature);
      invalidateFeatureQueries();
      toast.success("Feature updated", {
        description: feature.properties.name,
      });
    },
    onError: (error) => {
      toast.error("Update failed", {
        description: errorMessage(error),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeature,
    onSuccess: () => {
      const deletedName = deleteTarget?.properties.name;
      setSelectedFeatureId(null);
      setDeleteTarget(null);
      invalidateFeatureQueries();
      toast.success("Feature deleted", {
        description: deletedName,
      });
    },
    onError: (error) => {
      toast.error("Delete failed", {
        description: errorMessage(error),
      });
    },
  });

  const seedMutation = useMutation({
    mutationFn: seedVallaris,
    onSuccess: (result) => {
      setPage(1);
      invalidateFeatureQueries();
      toast.success("Seed completed", {
        description: `${result.insertedOrUpdated.toLocaleString()} records inserted or updated`,
      });
    },
    onError: (error) => {
      toast.error("Seed failed", {
        description: errorMessage(error),
      });
    },
  });

  useEffect(() => {
    setPage(1);
  }, [appliedSearch, province, categoryParam, bboxEnabled, pageSize]);

  useEffect(() => {
    commitSearch(debouncedSearchInput);
  }, [debouncedSearchInput]);

  const provinceOptions = useMemo(() => {
    const options = [...features, ...mapFeatures]
      .map((feature) => feature.properties.province)
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set([...options, province].filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [features, mapFeatures, province]);

  const categories = useMemo(
    () => Array.from(new Set([...features.map(featureCategory), ...mapFeatures.map(featureCategory)])).sort(),
    [features, mapFeatures],
  );

  function handleMapClick(coordinates: [number, number]) {
    setDraftGeometry(draftPointGeometry(coordinates));
    if (!formOpen) {
      setEditingFeature(null);
      setFormMode("create");
      setFormOpen(true);
    }
  }

  function handleAdd() {
    setEditingFeature(null);
    setFormMode("create");
    setDraftGeometry(draftGeometry ?? draftPointGeometry(DEFAULT_COORDINATES));
    setFormOpen(true);
  }

  function commitSearch(value: string) {
    setAppliedSearch(value.trim());
  }

  function handleEdit(feature: SpatialFeature) {
    setEditingFeature(feature);
    setFormMode("edit");
    setDraftGeometry(feature.geometry);
    focusFeature(feature);
    setFormOpen(true);
  }

  function handleDraftGeometryChange(geometry: SpatialGeometry | null, meta?: { finished?: boolean }) {
    setDraftGeometry(geometry);
    if (geometry && meta?.finished && !formOpen) {
      setEditingFeature(null);
      setFormMode("create");
      setFormOpen(true);
    }
  }

  function handleDelete(feature: SpatialFeature) {
    setDeleteTarget(feature);
  }

  function focusFeature(feature: SpatialFeature) {
    setSelectedFeatureId(feature.id);
    setMapFocusRequestId((current) => current + 1);
  }

  function invalidateFeatureQueries() {
    void queryClient.invalidateQueries({ queryKey: ["features"] });
    void queryClient.invalidateQueries({ queryKey: ["features-map"] });
  }

  function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    deleteMutation.mutate(deleteTarget.id);
  }

  function closeDeleteDialog() {
    if (deleteMutation.isPending) {
      return;
    }

    setDeleteTarget(null);
  }

  function handleSubmit(input: FeatureInput) {
    if (formMode === "edit" && editingFeature) {
      updateMutation.mutate({ id: editingFeature.id, input });
      return;
    }

    createMutation.mutate(input);
  }

  function handleBoundsChange(nextBBox: BoundingBox) {
    setBBox((current) => {
      if (current && current.every((value, index) => Math.abs(value - nextBBox[index]) < 0.0001)) {
        return current;
      }

      setPage(1);
      return nextBBox;
    });
  }

  function closeForm() {
    setFormOpen(false);
    setEditingFeature(null);
    setDraftGeometry(null);
  }

  const saving = createMutation.isPending || updateMutation.isPending;
  const error = featuresQuery.error ?? mapFeaturesQuery.error;

  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-zinc-100 text-zinc-950">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Mini Spatial Data Platform</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {user ? <UserMenu user={user} onLogout={logout} /> : null}
        </div>
      </header>

      <Toolbar
        search={search}
        onSearchChange={setSearch}
        onSearchCommit={commitSearch}
        onSuggestionSelect={focusFeature}
        province={province}
        onProvinceChange={setProvince}
        provinceOptions={provinceOptions}
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        bboxEnabled={bboxEnabled}
        bbox={bbox}
        onBBoxEnabledChange={setBBoxEnabled}
        onAdd={handleAdd}
        onSeed={() => seedMutation.mutate()}
        seedLoading={seedMutation.isPending}
      />

      {error instanceof Error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error.message}</div>
      )}

      <section className="relative grid min-h-0 flex-1 grid-cols-[minmax(480px,42%)_1fr] overflow-hidden max-lg:grid-cols-1">
        <FeaturesTable
          features={features}
          meta={meta}
          page={page}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          loading={featuresQuery.isFetching}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
          onFocus={focusFeature}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <div className="relative min-h-[420px]">
          <FeatureMap
            features={mapFeatures}
            selectedFeatureId={selectedFeatureId}
            focusRequestId={mapFocusRequestId}
            draftGeometry={draftGeometry}
            bboxEnabled={bboxEnabled}
            onMapClick={handleMapClick}
            onDraftGeometryChange={handleDraftGeometryChange}
            onBoundsChange={handleBoundsChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          {mapFeaturesQuery.isFetching && (
            <div className="absolute left-4 top-4 rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 shadow-sm">
              Loading viewport
            </div>
          )}
          <CategoryLegend categories={categories} />
        </div>

        <FeatureFormPanel
          open={formOpen}
          mode={formMode}
          feature={editingFeature}
          geometry={draftGeometry}
          saving={saving}
          onClose={closeForm}
          onPickLocation={() => setDraftGeometry(draftGeometry ?? draftPointGeometry(DEFAULT_COORDINATES))}
          onGeometryChange={setDraftGeometry}
          onSubmit={handleSubmit}
        />

        <DeleteFeatureDialog
          open={Boolean(deleteTarget)}
          feature={deleteTarget}
          deleting={deleteMutation.isPending}
          onOpenChange={(open) => {
            if (!open) {
              closeDeleteDialog();
            }
          }}
          onConfirm={confirmDelete}
        />
      </section>
    </main>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Please try again.";
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);

    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debounced;
}
