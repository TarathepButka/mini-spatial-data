import { LocateFixed, Save, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { FeatureInput, SpatialFeature } from "../../types/geojson";

type FeatureFormPanelProps = {
  open: boolean;
  mode: "create" | "edit";
  feature?: SpatialFeature | null;
  coordinates: [number, number] | null;
  saving: boolean;
  onClose: () => void;
  onPickLocation: () => void;
  onSubmit: (input: FeatureInput) => void;
};

export function FeatureFormPanel({
  open,
  mode,
  feature,
  coordinates,
  saving,
  onClose,
  onPickLocation,
  onSubmit,
}: FeatureFormPanelProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("manual");
  const [province, setProvince] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(feature?.properties.name ?? "");
    setCategory(feature?.properties.category ?? feature?.properties.confidence ?? "manual");
    setProvince(feature?.properties.province ?? "");
    setDescription(feature?.properties.description ?? "");
  }, [feature, open]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!coordinates) return;
    const baseProperties = mode === "edit" && feature ? feature.properties : {};
    onSubmit({
      type: "Feature",
      geometry: { type: "Point", coordinates },
      properties: {
        ...baseProperties,
        name: name.trim(),
        category: category.trim() || "manual",
        province: province.trim(),
        description: description.trim(),
      },
    });
  }

  if (!open) return null;

  return (
    <aside className="absolute right-4 top-20 z-20 w-[min(420px,calc(100vw-2rem))] rounded border border-zinc-200 bg-white shadow-xl">
      <form onSubmit={submit} className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">{mode === "edit" ? "Edit feature" : "Add feature"}</h2>
            <p className="text-xs text-zinc-500">{coordinates ? formatCoordinates(coordinates) : "No location selected"}</p>
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
            className="h-10 rounded border border-zinc-200 px-3 font-normal outline-none focus:border-zinc-400"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-10 rounded border border-zinc-200 px-3 font-normal outline-none focus:border-zinc-400"
            >
              <option value="manual">manual</option>
              <option value="low">low</option>
              <option value="nominal">nominal</option>
              <option value="high">high</option>
              <option value="unknown">unknown</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Province
            <input
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              className="h-10 rounded border border-zinc-200 px-3 font-normal outline-none focus:border-zinc-400"
            />
          </label>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Coordinates
            <input
              value={coordinates ? formatCoordinates(coordinates) : ""}
              readOnly
              className="h-10 rounded border border-zinc-200 bg-zinc-50 px-3 font-mono text-xs font-normal text-zinc-600 outline-none"
            />
          </label>
          <button
            type="button"
            title="Pick location on map"
            onClick={onPickLocation}
            className="mt-6 inline-flex h-10 items-center justify-center rounded border border-zinc-200 px-3 text-zinc-700 hover:border-zinc-400"
          >
            <LocateFixed size={18} />
          </button>
        </div>

        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="resize-none rounded border border-zinc-200 px-3 py-2 font-normal outline-none focus:border-zinc-400"
          />
        </label>

        <button
          type="submit"
          disabled={!coordinates || saving || name.trim() === ""}
          className="inline-flex h-10 items-center justify-center gap-2 rounded bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={17} />
          {saving ? "Saving" : "Save"}
        </button>
      </form>
    </aside>
  );
}

function formatCoordinates([lng, lat]: [number, number]) {
  return `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
}
