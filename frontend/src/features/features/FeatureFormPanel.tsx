import { LocateFixed, Save, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { FeatureInput, SpatialFeature, SpatialGeometry } from "../../types/geojson";
import { CATEGORY_OPTIONS, DEFAULT_CATEGORY, DEFAULT_COORDINATES, GEOMETRY_TYPE_OPTIONS } from "./constants";
import { draftPointGeometry, geometrySummary, geometryTemplate, geometryToJson, parseGeometryInput } from "./geometry";

type FeatureFormPanelProps = {
  open: boolean;
  mode: "create" | "edit";
  feature?: SpatialFeature | null;
  geometry: SpatialGeometry | null;
  saving: boolean;
  onClose: () => void;
  onPickLocation: () => void;
  onGeometryChange: (geometry: SpatialGeometry) => void;
  onSubmit: (input: FeatureInput) => void;
};

const textControlClassName = "h-10 rounded border border-zinc-200 px-3 font-normal outline-none focus:border-zinc-400";
const textareaControlClassName = "resize-none rounded border border-zinc-200 px-3 py-2 font-normal outline-none focus:border-zinc-400";

export function FeatureFormPanel({
  open,
  mode,
  feature,
  geometry,
  saving,
  onClose,
  onPickLocation,
  onGeometryChange,
  onSubmit,
}: FeatureFormPanelProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [province, setProvince] = useState("");
  const [description, setDescription] = useState("");
  const [rawGeometry, setRawGeometry] = useState("");
  const [geometryError, setGeometryError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(feature?.properties.name ?? "");
    setCategory(feature?.properties.category ?? feature?.properties.confidence ?? DEFAULT_CATEGORY);
    setProvince(feature?.properties.province ?? "");
    setDescription(feature?.properties.description ?? "");
  }, [feature, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!geometry) {
      setRawGeometry("");
      setGeometryError("");
      return;
    }

    setRawGeometry(geometryToJson(geometry));
    setGeometryError("");
  }, [geometry, open]);

  const geometryType = geometry?.type ?? "Point";
  const geometryStatus = useMemo(() => (geometry ? geometrySummary(geometry) : "No geometry"), [geometry]);

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!geometry || geometryError) {
      return;
    }

    const baseProperties = mode === "edit" && feature ? feature.properties : {};
    onSubmit({
      type: "Feature",
      geometry,
      properties: {
        ...baseProperties,
        name: name.trim(),
        category: category.trim() || DEFAULT_CATEGORY,
        province: province.trim(),
        description: description.trim(),
      },
    });
  }

  function changeGeometryType(type: SpatialGeometry["type"]) {
    const nextGeometry = geometryTemplate(type, geometry);
    onGeometryChange(nextGeometry);
    setRawGeometry(geometryToJson(nextGeometry));
    setGeometryError("");
  }

  function changeRawGeometry(value: string) {
    setRawGeometry(value);
    const result = parseGeometryInput(value);
    if (!result.ok) {
      setGeometryError(result.error);
      return;
    }

    setGeometryError("");
    onGeometryChange(result.geometry);
  }

  function usePointLocation() {
    onPickLocation();

    if (!geometry) {
      const point = draftPointGeometry(DEFAULT_COORDINATES);
      onGeometryChange(point);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <aside className="absolute bottom-4 right-4 top-4 z-20 flex w-[min(440px,calc(100vw-2rem))] flex-col overflow-hidden rounded border border-zinc-200 bg-white shadow-xl max-sm:left-4 max-sm:w-auto">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">{mode === "edit" ? "Edit feature" : "Add feature"}</h2>
            <p className="text-xs text-zinc-500">{geometryStatus}</p>
          </div>
          <button type="button" title="Close" onClick={onClose} className="rounded p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950">
            <X size={18} />
          </button>
        </div>

        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className={textControlClassName}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={textControlClassName}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Province
            <input
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              className={textControlClassName}
            />
          </label>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Geometry type
            <select
              value={geometryType}
              onChange={(event) => changeGeometryType(event.target.value as SpatialGeometry["type"])}
              className={textControlClassName}
            >
              {GEOMETRY_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            title="Use point from map"
            onClick={usePointLocation}
            className="mt-6 inline-flex h-10 items-center justify-center rounded border border-zinc-200 px-3 text-zinc-700 hover:border-zinc-400"
          >
            <LocateFixed size={18} />
          </button>
        </div>

        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Raw GeoJSON geometry
          <textarea
            value={rawGeometry}
            onChange={(event) => changeRawGeometry(event.target.value)}
            rows={8}
            spellCheck={false}
            className={`${textareaControlClassName} font-mono text-xs`}
          />
        </label>
        {geometryError ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{geometryError}</div> : null}

        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className={textareaControlClassName}
          />
        </label>

        <button
          type="submit"
          disabled={!geometry || Boolean(geometryError) || saving || name.trim() === ""}
          className="inline-flex h-10 items-center justify-center gap-2 rounded bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={17} />
          {saving ? "Saving" : "Save"}
        </button>
      </form>
    </aside>
  );
}
