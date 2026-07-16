import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Check, ChevronLeft, ChevronRight, LocateFixed, Pencil, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { DropdownMenu, DropdownMenuItem, DropdownTriggerButton } from "../../../components/ui/DropdownMenu";
import { IconButton } from "../../../components/ui/IconButton";
import type { FeaturesMeta, SpatialFeature } from "../../../types/geojson";
import type { CollectionOption } from "../../../api/features";
import { collectionColor, collectionLabel, featureCollectionKey } from "../utils/collections";
import { geometrySummary } from "../utils/geometry";
import { categoryColor, featureCategory } from "../utils/styles";

type FeaturesTableProps = {
  features: SpatialFeature[];
  collectionOptions: CollectionOption[];
  meta?: FeaturesMeta;
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  loading: boolean;
  canEditFeature: (feature: SpatialFeature) => boolean;
  canDeleteFeature: (feature: SpatialFeature) => boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onFocus: (feature: SpatialFeature) => void;
  onEdit: (feature: SpatialFeature) => void;
  onDelete: (feature: SpatialFeature) => void;
};

const columnHelper = createColumnHelper<SpatialFeature>();

export function FeaturesTable({
  features,
  collectionOptions,
  meta,
  page,
  pageSize,
  pageSizeOptions,
  loading,
  canEditFeature,
  canDeleteFeature,
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
        header: "Name / ID",
        cell: (info) => (
          <div className="flex flex-col">
            <span className="font-medium text-zinc-950">{info.getValue() || "-"}</span>
            <span className="font-mono text-[10px] text-zinc-400" title={info.row.original.id}>
              {info.row.original.id.length > 20 ? info.row.original.id.substring(0, 20) + "..." : info.row.original.id}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor((row) => featureCollectionKey(row), {
        id: "collection",
        header: "Collection",
        cell: (info) => (
          <span className="inline-flex items-center gap-2 rounded border border-zinc-200 px-2 py-1 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: collectionColor(info.getValue(), collectionOptions) }} />
            {collectionLabel(info.getValue(), collectionOptions)}
          </span>
        ),
      }),
      columnHelper.accessor(
        (row) => {
          const { tambol, amphoe, province } = row.properties;
          return [tambol, amphoe, province].filter(Boolean).join(", ");
        },
        {
          id: "location",
          header: "Location",
          cell: (info) => <span className="text-zinc-600">{info.getValue() || "-"}</span>,
        }
      ),
      columnHelper.accessor(
        (row) => {
          const { th_date, th_time, createdAt, updatedAt } = row.properties;
          if (th_date && th_time) return `${th_date} ${th_time}`;
          if (th_date) return th_date;
          if (updatedAt) return new Date(updatedAt as string).toLocaleString("th-TH");
          if (createdAt) return new Date(createdAt as string).toLocaleString("th-TH");
          return "-";
        },
        {
          id: "datetime",
          header: "Date / Time",
          cell: (info) => <span className="text-zinc-600 tabular-nums">{info.getValue()}</span>,
        }
      ),
      columnHelper.accessor((row) => featureCategory(row), {
        id: "category",
        header: "Status",
        cell: (info) => (
          <span className="inline-flex items-center gap-2 rounded border border-zinc-200 px-2 py-1 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor(info.getValue()) }} />
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor((row) => featureDetails(row), {
        id: "details",
        header: "Details",
        cell: ({ row }) => <FeatureDetailsCell feature={row.original} />,
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
            {canEditFeature(row.original) ? (
              <IconButton
                title="Edit"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(row.original);
                }}
              >
                <Pencil size={16} />
              </IconButton>
            ) : null}
            {canDeleteFeature(row.original) ? (
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
            ) : null}
          </div>
        ),
      }),
    ],
    [canDeleteFeature, canEditFeature, onDelete, onEdit, onFocus],
  );

  const table = useReactTable({ data: features, columns, getCoreRowModel: getCoreRowModel() });
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);
  const totalRecords = meta?.total ?? features.length;
  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalRecords);

  return (
    <section className="flex min-h-0 flex-col border-r border-zinc-200 max-lg:border-r-0 max-lg:border-b bg-white">
      <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-950">Features</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <th
                    key={header.id}
                    className={`sticky top-0 border-b border-zinc-200 bg-zinc-50 px-4 py-3 font-semibold ${
                      index === 0 ? "left-0 z-20 border-r" : "z-10"
                    }`}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} onClick={() => onFocus(row.original)} className="group cursor-pointer hover:bg-zinc-50">
                {row.getVisibleCells().map((cell, index) => (
                  <td
                    key={cell.id}
                    className={`border-b border-zinc-100 px-4 py-3 align-middle text-zinc-700 ${
                      index === 0 ? "sticky left-0 z-10 border-r bg-white group-hover:bg-zinc-50" : ""
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && features.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="border-b border-zinc-100 px-4 py-12 text-center text-sm text-zinc-500">
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
  function selectPageSize(nextValue: number, close: () => void) {
    onChange(nextValue);
    close();
  }

  return (
    <DropdownMenu
      menuClassName="absolute bottom-full left-0 z-30 mb-2 w-40 rounded border border-zinc-200 bg-white p-2 text-sm text-zinc-700 shadow-lg"
      renderTrigger={({ open, toggle }) => (
        <DropdownTriggerButton open={open} title="Rows per page" size="sm" onClick={toggle}>
          {value} per page
        </DropdownTriggerButton>
      )}
    >
      {({ close }) =>
        options.map((option) => {
          const active = option === value;

          return (
            <DropdownMenuItem key={option} role="menuitemradio" aria-checked={active} onClick={() => selectPageSize(option, close)}>
              <span>{option} per page</span>
              {active ? <Check size={16} className="shrink-0 text-zinc-950" /> : null}
            </DropdownMenuItem>
          );
        })
      }
    </DropdownMenu>
  );
}

function featureDetails(feature: SpatialFeature) {
  if (featureCollectionKey(feature) === "hotspots") {
    const details = [
      typeof feature.properties.frp === "number" ? `FRP ${feature.properties.frp.toFixed(2)}` : "",
      [feature.properties.satellite, feature.properties.instrument].filter(Boolean).join(" / "),
      feature.properties.hotspotid,
    ].filter(Boolean);

    return details.join(" | ") || geometrySummary(feature.geometry);
  }

  if (typeof feature.properties.description === "string" && feature.properties.description.trim()) {
    return feature.properties.description.trim();
  }

  return geometrySummary(feature.geometry);
}

function FeatureDetailsCell({ feature }: { feature: SpatialFeature }) {
  const isHotspot = featureCollectionKey(feature) === "hotspots";
  const desc = feature.properties.description?.trim();

  if (isHotspot) {
    const frp = typeof feature.properties.frp === "number" ? feature.properties.frp.toFixed(2) : null;
    const sat = [feature.properties.satellite, feature.properties.instrument].filter(Boolean).join(" / ");
    
    return (
      <div className="flex flex-col gap-1.5">
        {(frp || sat) ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {frp ? <span className="rounded bg-orange-50 px-1.5 py-0.5 font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">FRP {frp}</span> : null}
            {sat ? <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 ring-1 ring-inset ring-blue-600/20">{sat}</span> : null}
          </div>
        ) : null}
        
        {desc ? (
          <div className="line-clamp-2 max-w-xs text-xs text-zinc-600" title={desc}>
            {desc}
          </div>
        ) : null}

        {!frp && !sat && !desc ? <span className="text-xs text-zinc-500">{geometrySummary(feature.geometry)}</span> : null}
      </div>
    );
  }

  if (desc) {
    return (
      <div className="line-clamp-2 max-w-xs text-xs text-zinc-600" title={desc}>
        {desc}
      </div>
    );
  }

  return <span className="text-xs text-zinc-500">{geometrySummary(feature.geometry)}</span>;
}
