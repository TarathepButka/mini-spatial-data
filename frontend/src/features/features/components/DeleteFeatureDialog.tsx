import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { IconButton } from "../../../components/ui/IconButton";
import type { SpatialFeature } from "../../../types/geojson";
import { geometrySummary } from "../utils/geometry";
import { featureCategory } from "../utils/styles";

type DeleteFeatureDialogProps = {
  open: boolean;
  feature: SpatialFeature | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function DeleteFeatureDialog({ open, feature, deleting, onOpenChange, onConfirm }: DeleteFeatureDialogProps) {
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
              <IconButton title="Close" disabled={deleting}>
                <X size={18} />
              </IconButton>
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
            <Detail label="Geometry" value={feature ? geometrySummary(feature.geometry) : "-"} />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-4">
            <Dialog.Close asChild>
              <Button disabled={deleting} variant="secondary">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={onConfirm} disabled={!feature || deleting} variant="danger">
              {deleting ? <LoaderCircle size={17} className="animate-spin" /> : null}
              {deleting ? "Deleting" : "Delete"}
            </Button>
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
