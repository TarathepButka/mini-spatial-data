import { Check, ChevronDown, Save, Search, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "../../../components/ui/DropdownMenu";
import { Button } from "../../../components/ui/Button";
import { FormField, textControlClassName, textareaControlClassName } from "../../../components/ui/FormField";
import { IconButton } from "../../../components/ui/IconButton";
import type { FeatureInput, SpatialFeature, SpatialGeometry } from "../../../types/geojson";
import type { CollectionOption } from "../../../api/features";
import { CATEGORY_OPTIONS, DEFAULT_CATEGORY } from "../utils/constants";
import { COLLECTION_OPTIONS as DEFAULT_COLLECTION_OPTIONS } from "../utils/collections";
import { geometrySummary, geometryToJson, parseGeometryInput } from "../utils/geometry";
import { THAI_PROVINCES } from "../utils/provinces";

type FeatureFormPanelProps = {
  open: boolean;
  mode: "create" | "edit";
  feature?: SpatialFeature | null;
  geometry: SpatialGeometry | null;
  saving: boolean;
  collectionOptions: CollectionOption[];
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
  collectionOptions,
  onClose,
  onGeometryChange,
  onSubmit,
}: FeatureFormPanelProps) {
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [collection, setCollection] = useState("");
  const [collectionTouched, setCollectionTouched] = useState(false);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [province, setProvince] = useState("");
  const [provinceTouched, setProvinceTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [rawGeometry, setRawGeometry] = useState("");
  const [geometryError, setGeometryError] = useState("");
  const [provinceSearch, setProvinceSearch] = useState("");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  const filteredProvinces = useMemo(() => {
    const term = provinceSearch.trim().toLowerCase();
    if (!term) return THAI_PROVINCES;
    return THAI_PROVINCES.filter((p) => p.toLowerCase().includes(term));
  }, [provinceSearch]);

  const filteredCollectionOptions = useMemo(() => {
    const term = collectionSearch.trim().toLowerCase();
    const options = collectionOptions.length > 0 ? collectionOptions : DEFAULT_COLLECTION_OPTIONS;
    if (!term) return options;
    return options.filter((c) => c.label.toLowerCase().includes(term) || c.id.toLowerCase().includes(term));
  }, [collectionSearch, collectionOptions]);

  const filteredCategoryOptions = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    if (!term) return CATEGORY_OPTIONS;
    return CATEGORY_OPTIONS.filter((c) => c.toLowerCase().includes(term));
  }, [categorySearch]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(feature?.properties.name ?? "");
    setNameTouched(false);
    setCollection(feature?.collection ?? "");
    setCollectionTouched(false);
    setCategory(feature?.properties.category ?? feature?.properties.confidence ?? DEFAULT_CATEGORY);
    setProvince(feature?.properties.province ?? "");
    setProvinceTouched(false);
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

    setNameTouched(true);
    setCollectionTouched(true);
    setProvinceTouched(true);

    if (!geometry || geometryError || name.trim() === "" || collection === "" || province === "") {
      return;
    }

    const baseProperties = mode === "edit" && feature ? feature.properties : {};
    onSubmit({
      type: "Feature",
      collection,
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
    <aside className="fixed right-4 top-4 z-30 flex w-[min(440px,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded border border-zinc-200 bg-white shadow-xl max-sm:left-4 max-sm:w-auto">
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
            placeholder="ตรวจพบจุดความร้อนดอยสุเทพ"
            required
            className={textControlClassName}
          />
        </FormField>

        <FormField label="Collection" required error={collectionTouched && collection === "" ? "Collection is required" : undefined}>
          <DropdownMenu
            containerClassName="relative"
            menuClassName="absolute left-0 z-30 mt-1 w-full overflow-hidden rounded border border-zinc-200 bg-white text-sm text-zinc-700 shadow-lg"
            renderTrigger={({ open, toggle }) => (
              <button
                type="button"
                onClick={() => {
                  setCollectionTouched(true);
                  toggle();
                }}
                className={`${textControlClassName} flex w-full items-center justify-between text-left`}
              >
                <span className={`truncate ${collection ? "text-zinc-700" : "text-zinc-400"}`}>
                  {collection
                    ? (collectionOptions.length > 0 ? collectionOptions : DEFAULT_COLLECTION_OPTIONS).find((c) => c.id === collection)?.label ?? collection
                    : "Observations"}
                </span>
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
                      value={collectionSearch}
                      onChange={(e) => setCollectionSearch(e.target.value)}
                      placeholder="ค้นหาคอลเลกชัน..."
                      autoComplete="off"
                      className="h-7 w-full rounded border border-zinc-200 bg-zinc-50 pl-7 pr-2 text-xs outline-none transition focus:border-zinc-400"
                    />
                  </div>
                </div>

                <div className="max-h-52 overflow-auto overscroll-contain p-1">
                  {filteredCollectionOptions.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-zinc-400">ไม่พบคอลเลกชัน</div>
                  )}

                  {filteredCollectionOptions.map((option) => {
                    const active = collection === option.id;

                    return (
                      <DropdownMenuItem
                        key={option.id}
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => {
                          setCollection(option.id);
                          setCollectionSearch("");
                          close();
                        }}
                      >
                        <span className="inline-flex min-w-0 items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
                          <span className="truncate">{option.label}</span>
                        </span>
                        {active ? <Check size={16} className="shrink-0 text-zinc-950" /> : null}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </>
            )}
          </DropdownMenu>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Status / Category">
            <DropdownMenu
              containerClassName="relative"
              menuClassName="absolute left-0 z-30 mt-1 w-full overflow-hidden rounded border border-zinc-200 bg-white text-sm text-zinc-700 shadow-lg"
              renderTrigger={({ open, toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  className={`${textControlClassName} flex w-full items-center justify-between text-left`}
                >
                  <span className={`truncate ${category ? "text-zinc-700" : "text-zinc-400"}`}>
                    {category || "Select category"}
                  </span>
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
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="ค้นหาหมวดหมู่..."
                        autoComplete="off"
                        className="h-7 w-full rounded border border-zinc-200 bg-zinc-50 pl-7 pr-2 text-xs outline-none transition focus:border-zinc-400"
                      />
                    </div>
                  </div>

                  <div className="max-h-52 overflow-auto overscroll-contain p-1">
                    {filteredCategoryOptions.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-zinc-400">ไม่พบหมวดหมู่</div>
                    )}

                    {filteredCategoryOptions.map((option) => {
                      const active = category === option;

                      return (
                        <DropdownMenuItem
                          key={option}
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => {
                            setCategory(option);
                            setCategorySearch("");
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
          <FormField label="Province" required error={provinceTouched && province === "" ? "Province is required" : undefined}>
            <DropdownMenu
              containerClassName="relative"
              menuClassName="absolute left-0 z-30 mt-1 w-full overflow-hidden rounded border border-zinc-200 bg-white text-sm text-zinc-700 shadow-lg"
              renderTrigger={({ open, toggle }) => (
                <button
                  type="button"
                  onClick={() => {
                    setProvinceTouched(true);
                    toggle();
                  }}
                  className={`${textControlClassName} flex w-full items-center justify-between text-left`}
                >
                  <span className={`truncate ${province ? "text-zinc-700" : "text-zinc-400"}`}>
                    {province}
                  </span>
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
            placeholder="รายงานพบกลุ่มควันไฟป่าบริเวณดอยสุเทพ เวลา 14:00 น."
            rows={3}
            className={textareaControlClassName}
          />
        </FormField>

        <Button
          type="submit"
          disabled={!geometry || Boolean(geometryError) || saving || name.trim() === "" || collection === ""}
          variant="primary"
        >
          <Save size={17} />
          {saving ? "Saving" : "Save"}
        </Button>
      </form>
    </aside>
  );
}
