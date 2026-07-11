import { Check, ChevronDown, ListFilter } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_CATEGORIES, categoryColor } from "./styles";

type CategoryFilterDropdownProps = {
  categories: string[];
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
};

export function CategoryFilterDropdown({ categories, selectedCategories, onChange }: CategoryFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories])).filter(Boolean);
  const allSelected = selectedCategories.length === 0;
  const label = allSelected
    ? "All confidence"
    : selectedCategories.length <= 2
      ? selectedCategories.join(", ")
      : `${selectedCategories.length} selected`;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function toggle(category: string) {
    if (selectedCategories.includes(category)) {
      onChange(selectedCategories.filter((item) => item !== category));
      return;
    }
    onChange([...selectedCategories, category]);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        title="Confidence filter"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 min-w-44 items-center justify-between gap-2 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <ListFilter size={16} />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-30 mt-2 max-h-80 w-60 overflow-auto rounded border border-zinc-200 bg-white p-2 text-sm text-zinc-700 shadow-lg"
        >
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={allSelected}
            onClick={() => onChange([])}
            className={`flex h-9 w-full items-center justify-between rounded px-2 text-left transition hover:bg-zinc-100 ${
              allSelected ? "font-medium text-zinc-950" : ""
            }`}
          >
            <span>All confidence</span>
            {allSelected ? <Check size={16} /> : null}
          </button>

          <div className="my-2 h-px bg-zinc-100" />

          {options.map((category) => {
            const active = selectedCategories.includes(category);
            return (
              <button
                key={category}
                type="button"
                role="menuitemcheckbox"
                aria-checked={active}
                onClick={() => toggle(category)}
                className="flex h-9 w-full items-center justify-between rounded px-2 text-left transition hover:bg-zinc-100"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(category) }} />
                  <span className="truncate">{category}</span>
                </span>
                {active ? <Check size={16} className="shrink-0 text-zinc-950" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
