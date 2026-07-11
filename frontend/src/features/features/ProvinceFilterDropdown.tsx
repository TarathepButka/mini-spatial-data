import { Check, ChevronDown, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ProvinceFilterDropdownProps = {
  province: string;
  provinceOptions: string[];
  onChange: (province: string) => void;
};

export function ProvinceFilterDropdown({ province, provinceOptions, onChange }: ProvinceFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const label = province || "All provinces";

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

  function selectProvince(nextProvince: string) {
    onChange(nextProvince);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        title="Province filter"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 min-w-44 items-center justify-between gap-2 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <MapPin size={16} />
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
            role="menuitemradio"
            aria-checked={!province}
            onClick={() => selectProvince("")}
            className={`flex h-9 w-full items-center justify-between rounded px-2 text-left transition hover:bg-zinc-100 ${
              !province ? "font-medium text-zinc-950" : ""
            }`}
          >
            <span className="truncate">All provinces</span>
            {!province ? <Check size={16} /> : null}
          </button>

          <div className="my-2 h-px bg-zinc-100" />

          {provinceOptions.map((option) => {
            const active = province === option;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => selectProvince(option)}
                className="flex h-9 w-full items-center justify-between rounded px-2 text-left transition hover:bg-zinc-100"
              >
                <span className="truncate">{option}</span>
                {active ? <Check size={16} className="shrink-0 text-zinc-950" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
