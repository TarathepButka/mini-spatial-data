import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createFeature, deleteFeature, getFeatures, seedVallaris, updateFeature } from "../../../api/features";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import type { BoundingBox, FeatureInput, FeaturesResponse, SpatialFeature, SpatialGeometry } from "../../../types/geojson";
import { useAuth } from "../../auth/AuthContext";
import { canDeleteFeature, canEditFeature } from "../../auth/permissionFlags";
import { FeatureMap } from "../map/FeatureMap";
import { DEFAULT_COORDINATES, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, SEARCH_COMMIT_DELAY_MS } from "../utils/constants";
import { draftPointGeometry } from "../utils/geometry";
import { featureCategory } from "../utils/styles";
import { CategoryLegend } from "./CategoryLegend";
import { DeleteFeatureDialog } from "./DeleteFeatureDialog";
import { FeatureFormPanel } from "./FeatureFormPanel";
import { FeaturesTable } from "./FeaturesTable";
import { Toolbar } from "./Toolbar";
import { UserMenu } from "./UserMenu";
import type { ViewMode } from "./ViewModeToggle";

export function FeaturesDashboard() {
  const { user, permissionFlags, logout, switchRole } = useAuth();
  const queryClient = useQueryClient();
  const {
    canCreateFeature: canCreate,
    canEditAnyFeature: canEditAny,
    canSeedVallaris: canSeed,
  } = permissionFlags;
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
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [showOnlyMine, setShowOnlyMine] = useState(false);

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

  const filteredFeatures = useMemo(() => {
    if (!showOnlyMine || !user) {
      return features;
    }
    return features.filter((feature) => {
      const creator = feature.properties.createdBy;
      if (!creator) return false;
      if (creator.sub && creator.sub === user.sub) return true;
      return Boolean(creator.email && creator.email.toLowerCase() === user.email.toLowerCase());
    });
  }, [features, showOnlyMine, user]);

  const filteredMapFeatures = useMemo(() => {
    if (!showOnlyMine || !user) {
      return mapFeatures;
    }
    return mapFeatures.filter((feature) => {
      const creator = feature.properties.createdBy;
      if (!creator) return false;
      if (creator.sub && creator.sub === user.sub) return true;
      return Boolean(creator.email && creator.email.toLowerCase() === user.email.toLowerCase());
    });
  }, [mapFeatures, showOnlyMine, user]);

  const filteredMeta = useMemo(() => {
    if (!showOnlyMine || !meta) {
      return meta;
    }
    return {
      ...meta,
      total: filteredFeatures.length,
      totalPages: 1,
    };
  }, [meta, showOnlyMine, filteredFeatures.length]);

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
    if (!canCreate || !formOpen) {
      return;
    }

    setDraftGeometry(draftPointGeometry(coordinates));
  }

  function handleAdd() {
    if (!canCreate) {
      return;
    }

    setEditingFeature(null);
    setFormMode("create");
    setDraftGeometry(draftGeometry ?? draftPointGeometry(DEFAULT_COORDINATES));
    setFormOpen(true);
  }

  function commitSearch(value: string) {
    setAppliedSearch(value.trim());
  }

  function handleEdit(feature: SpatialFeature) {
    if (!canEditRecord(feature)) {
      return;
    }

    setEditingFeature(feature);
    setFormMode("edit");
    setDraftGeometry(feature.geometry);
    focusFeature(feature);
    setFormOpen(true);
  }

  function handleDraftGeometryChange(geometry: SpatialGeometry | null, meta?: { finished?: boolean }) {
    if (!canCreate) {
      return;
    }

    // While form is open, update the draft geometry live
    if (formOpen) {
      setDraftGeometry(geometry);
      return;
    }

    // Drawing just finished — open the create form with the result
    if (geometry && meta?.finished) {
      setDraftGeometry(geometry);
      setEditingFeature(null);
      setFormMode("create");
      setFormOpen(true);
    }
  }

  function handleDelete(feature: SpatialFeature) {
    if (!canDeleteRecord(feature)) {
      return;
    }

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

    if (!canDeleteRecord(deleteTarget)) {
      return;
    }

    deleteMutation.mutate(deleteTarget.id);
  }

  function canDeleteRecord(feature: SpatialFeature) {
    return canDeleteFeature(user, feature, permissionFlags);
  }

  function canEditRecord(feature: SpatialFeature) {
    return canEditFeature(user, feature, permissionFlags);
  }

  function closeDeleteDialog() {
    if (deleteMutation.isPending) {
      return;
    }

    setDeleteTarget(null);
  }

  function handleSubmit(input: FeatureInput) {
    if (formMode === "edit" && editingFeature) {
      if (!canEditRecord(editingFeature)) {
        return;
      }

      updateMutation.mutate({ id: editingFeature.id, input });

      return;
    }

    if (!canCreate) {
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
        <div className="flex items-center gap-3 select-none">
          <img src="/logo.png?v=3" alt="Logo" className="h-9 w-9 object-contain" />
          <h1 className="text-xl tracking-tight">
            <span className="font-light text-zinc-400">Mini</span>{" "}
            <span className="font-extrabold text-zinc-900">Spatial</span>{" "}
            <span className="font-normal text-zinc-600">Data Platform</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {user ? <UserMenu user={user} onLogout={logout} onSwitchRole={switchRole} /> : null}
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
        canCreate={canCreate}
        canSeed={canSeed}
        onAdd={handleAdd}
        onSeed={() => {
          if (canSeed) {
            seedMutation.mutate();
          }
        }}
        seedLoading={seedMutation.isPending}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showOnlyMine={showOnlyMine}
        onShowOnlyMineChange={setShowOnlyMine}
      />

      {error instanceof Error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error.message}</div>
      )}

      <section
        className={[
          "relative grid min-h-0 flex-1 overflow-hidden",
          viewMode === "split"
            ? "grid-cols-[minmax(480px,42%)_1fr] max-lg:grid-cols-1"
            : "grid-cols-1",
        ].join(" ")}
      >
        {viewMode !== "map" && (
          <FeaturesTable
            features={filteredFeatures}
            meta={filteredMeta}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            loading={featuresQuery.isFetching}
            canEditFeature={canEditRecord}
            canDeleteFeature={canDeleteRecord}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize: number) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
            onFocus={focusFeature}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
        {viewMode !== "table" && (
          <div className="relative min-h-[420px]">
            <FeatureMap
              features={filteredMapFeatures}
              selectedFeatureId={selectedFeatureId}
              focusRequestId={mapFocusRequestId}
              draftGeometry={draftGeometry}
              bboxEnabled={bboxEnabled}
              canCreate={canCreate}
              canEdit={canEditAny}
              canEditFeature={canEditRecord}
              canDeleteFeature={canDeleteRecord}
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
        )}

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
          onOpenChange={(open: boolean) => {
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
