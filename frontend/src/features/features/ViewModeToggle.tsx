import { Columns, Map, Table2 } from "lucide-react";

export type ViewMode = "map" | "split" | "table";

const modes: { value: ViewMode; icon: typeof Map; label: string }[] = [
  { value: "map", icon: Map, label: "Map" },
  { value: "split", icon: Columns, label: "Map + Table" },
  { value: "table", icon: Table2, label: "Table" },
];

type ViewModeToggleProps = {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
};

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div role="group" aria-label="View mode" className="inline-flex h-10 items-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
      {modes.map(({ value, icon: Icon, label }) => {
        const active = mode === value;

        return (
          <button
            key={value}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => onChange(value)}
            className={[
              "relative flex h-full items-center gap-1.5 px-3 text-sm font-medium transition-colors",
              active
                ? "bg-zinc-900 text-white shadow-inner"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700",
            ].join(" ")}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
