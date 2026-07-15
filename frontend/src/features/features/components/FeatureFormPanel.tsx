import { Check, ChevronDown, Save, Search, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "../../../components/ui/DropdownMenu";
import { Button } from "../../../components/ui/Button";
import { FormField, textControlClassName, textareaControlClassName } from "../../../components/ui/FormField";
import { IconButton } from "../../../components/ui/IconButton";
import type { FeatureInput, SpatialFeature, SpatialGeometry } from "../../../types/geojson";
import { CATEGORY_OPTIONS, DEFAULT_CATEGORY } from "../utils/constants";
import { geometrySummary, geometryToJson, parseGeometryInput } from "../utils/geometry";
import { THAI_PROVINCES } from "../utils/provinces";

type FeatureFormPanelProps = {
  open: boolean;
  mode: "create" | "edit";
  feature?: SpatialFeature | null;
  geometry: SpatialGeometry | null;
  saving: boolean;
  onClose: () => void;
  onGeometryChange: (geometry: SpatialGeometry) => void;
  onSubmit: (input: FeatureInput) => void;
};

export function FeatureFormPanel({
  open,
  mode,
  feature,
  geometry,
  saving,
  onClose,
  onGeometryChange,
  onSubmit,
}: FeatureFormPanelProps) {
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [province, setProvince] = useState("");
  const [description, setDescription] = useState("");
  const [rawGeometry, setRawGeometry] = useState("");
  const [geometryError, setGeometryError] = useState("");
  const [provinceSearch, setProvinceSearch] = useState("");

  const filteredProvinces = useMemo(() => {
    const term = provinceSearch.trim().toLowerCase();
    if (!term) return THAI_PROVINCES;
    return THAI_PROVINCES.filter((p) => p.toLowerCase().includes(term));
  }, [provinceSearch]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(feature?.properties.name ?? "");
    setNameTouched(false);
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

  if (!open) {
    return null;
  }

  return (
    <aside className="absolute right-4 top-4 z-20 flex w-[min(440px,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded border border-zinc-200 bg-white shadow-xl max-sm:left-4 max-sm:w-auto">
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">{mode === "edit" ? "Edit feature" : "Add feature"}</h2>
            <p className="text-xs text-zinc-500">{geometryStatus}</p>
          </div>
          <IconButton title="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <FormField label="Name" required error={nameTouched && name.trim() === "" ? "Name is required" : undefined}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setNameTouched(true)}
            required
            className={textControlClassName}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Category">
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
          </FormField>
          <FormField label="Province">
            <DropdownMenu
              containerClassName="relative"
              menuClassName="absolute left-0 z-30 mt-1 w-full overflow-hidden rounded border border-zinc-200 bg-white text-sm text-zinc-700 shadow-lg"
              renderTrigger={({ open, toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  className={`${textControlClassName} flex w-full items-center justify-between text-left`}
                >
                  <span className="truncate text-zinc-700">{province || "Select"}</span>
                  <ChevronDown size={16} className={`shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`} />
                </button>
              )}
            >
              {({ close }) => (
                <>
                  {/* Search input */}
                  <div className="border-b border-zinc-100 p-1.5">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                      <input
                        value={provinceSearch}
                        onChange={(e) => setProvinceSearch(e.target.value)}
                        placeholder="ค้นหาจังหวัด..."
                        autoComplete="off"
                        className="h-7 w-full rounded border border-zinc-200 bg-zinc-50 pl-7 pr-2 text-xs outline-none transition focus:border-zinc-400"
                      />
                    </div>
                  </div>

                  <div className="max-h-52 overflow-auto overscroll-contain p-1">
                    <DropdownMenuItem
                      role="menuitemradio"
                      aria-checked={!province}
                      active={!province}
                      onClick={() => {
                        setProvince("");
                        setProvinceSearch("");
                        close();
                      }}
                    >
                      <span className="truncate">กรุงเทพมหานคร</span>
                      {!province ? <Check size={16} className="shrink-0 text-zinc-950" /> : null}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {filteredProvinces.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-zinc-400">ไม่พบจังหวัด</div>
                    )}

                    {filteredProvinces.map((option) => {
                      const active = province === option;

                      return (
                        <DropdownMenuItem
                          key={option}
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => {
                            setProvince(option);
                            setProvinceSearch("");
                            close();
                          }}
                        >
                          <span className="truncate">{option}</span>
                          {active ? <Check size={16} className="shrink-0 text-zinc-950" /> : null}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </>
              )}
            </DropdownMenu>
          </FormField>
        </div>



        <FormField label="Raw GeoJSON geometry">
          <textarea
            value={rawGeometry}
            onChange={(event) => changeRawGeometry(event.target.value)}
            rows={8}
            spellCheck={false}
            className={`${textareaControlClassName} font-mono text-xs`}
          />
        </FormField>
        {geometryError ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{geometryError}</div> : null}

        <FormField label="Description">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className={textareaControlClassName}
          />
        </FormField>

        <Button
          type="submit"
          disabled={!geometry || Boolean(geometryError) || saving || name.trim() === ""}
          variant="primary"
        >
          <Save size={17} />
          {saving ? "Saving" : "Save"}
        </Button>
      </form>
    </aside>
  );
}
