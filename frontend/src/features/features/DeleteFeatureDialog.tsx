import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import type { SpatialFeature } from "../../types/geojson";
import { featureCategory } from "./styles";

type DeleteFeatureDialogProps = {
  open: boolean;
  feature: SpatialFeature | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteFeatureDialog({ open, feature, deleting, onOpenChange, onConfirm }: DeleteFeatureDialogProps) {
  const coordinates = feature?.geometry.coordinates;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-zinc-950/45" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded border border-zinc-200 bg-white shadow-xl outline-none">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-red-50 text-red-600">
                <AlertTriangle size={20} />
              </span>
              <div>
                <Dialog.Title className="text-base font-semibold text-zinc-950">Delete record</Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-zinc-500">
                  This action permanently removes the selected feature.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                title="Close"
                disabled={deleting}
                className="rounded p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="grid gap-3 px-5 py-4 text-sm">
            <div>
              <div className="text-xs font-medium uppercase text-zinc-500">Name</div>
              <div className="mt-1 font-medium text-zinc-950">{feature?.properties.name ?? "-"}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Detail label="Province" value={feature?.properties.province ?? "-"} />
              <Detail label="Confidence" value={feature ? featureCategory(feature) : "-"} />
            </div>
            <Detail
              label="Coordinates"
              value={coordinates ? `${coordinates[0].toFixed(5)}, ${coordinates[1].toFixed(5)}` : "-"}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-4">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={deleting}
                className="inline-flex h-10 items-center justify-center rounded border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!feature || deleting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? <LoaderCircle size={17} className="animate-spin" /> : <Trash2 size={17} />}
              {deleting ? "Deleting" : "Delete"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-zinc-500">{label}</div>
      <div className="mt-1 truncate text-zinc-800">{value}</div>
    </div>
  );
}
