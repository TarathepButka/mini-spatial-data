import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Check, ChevronDown, ChevronLeft, ChevronRight, LocateFixed, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FeaturesMeta, SpatialFeature } from "../../types/geojson";
import { geometrySummary } from "./geometry";
import { SummaryChips } from "./SummaryChips";
import { categoryColor, featureCategory } from "./styles";

type FeaturesTableProps = {
  features: SpatialFeature[];
  meta?: FeaturesMeta;
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onFocus: (feature: SpatialFeature) => void;
  onEdit: (feature: SpatialFeature) => void;
  onDelete: (feature: SpatialFeature) => void;
};

const columnHelper = createColumnHelper<SpatialFeature>();

export function FeaturesTable({
  features,
  meta,
  page,
  pageSize,
  pageSizeOptions,
  loading,
  onPageChange,
  onPageSizeChange,
  onFocus,
  onEdit,
  onDelete,
}: FeaturesTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.properties.name, {
        id: "name",
        header: "Name",
        cell: (info) => <span className="font-medium text-zinc-950">{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => row.properties.province ?? "-", {
        id: "province",
        header: "Province",
      }),
      columnHelper.accessor((row) => featureCategory(row), {
        id: "category",
        header: "Category",
        cell: (info) => (
          <span className="inline-flex items-center gap-2 rounded border border-zinc-200 px-2 py-1 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor(info.getValue()) }} />
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor((row) => row.properties.frp, {
        id: "frp",
        header: "FRP",
        cell: (info) => formatNumber(info.getValue()),
      }),
      columnHelper.accessor((row) => geometrySummary(row.geometry), {
        id: "geometry",
        header: "Geometry",
        cell: (info) => <span className="font-mono text-xs text-zinc-600">{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <IconButton
              title="Fly to"
              onClick={(event) => {
                event.stopPropagation();
                onFocus(row.original);
              }}
            >
              <LocateFixed size={16} />
            </IconButton>
            <IconButton
              title="Edit"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(row.original);
              }}
            >
              <Pencil size={16} />
            </IconButton>
            <IconButton
              title="Delete"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(row.original);
              }}
              variant="danger"
            >
              <Trash2 size={16} />
            </IconButton>
          </div>
        ),
      }),
    ],
    [onDelete, onEdit, onFocus],
  );

  const table = useReactTable({ data: features, columns, getCoreRowModel: getCoreRowModel() });
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);
  const totalRecords = meta?.total ?? features.length;
  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalRecords);

  return (
    <section className="flex min-h-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950">Features</h2>
        </div>
        <SummaryChips features={features} meta={meta} />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-50 text-xs uppercase text-zinc-500">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="border-b border-zinc-200 px-4 py-3 font-semibold">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} onClick={() => onFocus(row.original)} className="cursor-pointer border-b border-zinc-100 hover:bg-zinc-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle text-zinc-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && features.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-zinc-500">
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-200 px-4 py-3">
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          <PageSizeDropdown value={pageSize} options={pageSizeOptions} onChange={onPageSizeChange} />
          <span className="min-w-28 text-center text-xs text-zinc-600">
            {rangeStart.toLocaleString()}-{rangeEnd.toLocaleString()} of {totalRecords.toLocaleString()}
          </span>
          <button
            type="button"
            title="Previous page"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-zinc-200 bg-white transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            title="Next page"
            onClick={() => onPageChange(Math.min(totalPages || page + 1, page + 1))}
            disabled={totalPages === 0 || page >= totalPages}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-zinc-200 bg-white transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

function PageSizeDropdown({ value, options, onChange }: { value: number; options: number[]; onChange: (value: number) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  function selectPageSize(nextValue: number) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        title="Rows per page"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 min-w-32 items-center justify-between gap-2 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400"
      >
        <span>{value} per page</span>
        <ChevronDown size={16} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-30 mb-2 w-40 rounded border border-zinc-200 bg-white p-2 text-sm text-zinc-700 shadow-lg"
        >
          {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => selectPageSize(option)}
              className="flex h-9 w-full items-center justify-between rounded px-2 text-left transition hover:bg-zinc-100"
            >
              <span>{option} per page</span>
              {active ? <Check size={16} className="shrink-0 text-zinc-950" /> : null}
            </button>
          );
          })}
        </div>
      ) : null}
    </div>
  );
}

function IconButton({
  title,
  onClick,
  children,
  variant = "ghost",
}: {
  title: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
  variant?: "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded p-2 transition ${variant === "danger" ? "text-red-600 hover:bg-red-50" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"}`}
    >
      {children}
    </button>
  );
}

function formatNumber(value: unknown) {
  if (typeof value !== "number") {
    return "-";
  }

  return value.toFixed(2);
}
