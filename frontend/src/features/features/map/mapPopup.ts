import type { SpatialFeature } from "../../../types/geojson";
import { collectionLabel, featureCollectionKey } from "../utils/collections";
import { geometrySummary } from "../utils/geometry";
import { featureCategory } from "../utils/styles";

import type { CollectionOption } from "../../../api/features";

export type FeaturePopupCallbacks = {
  canEdit: (feature: SpatialFeature) => boolean;
  canDeleteFeature: (feature: SpatialFeature) => boolean;
  onEdit: (feature: SpatialFeature) => void;
  onDelete: (feature: SpatialFeature) => void;
  collectionOptions?: CollectionOption[];
};

export function createPopup(feature: SpatialFeature, callbacksRef: { readonly current: FeaturePopupCallbacks }) {
  const container = document.createElement("div");
  container.className = "grid min-w-56 gap-2 text-sm";

  const title = document.createElement("strong");
  title.className = "text-zinc-950";
  title.textContent = feature.properties.name;
  container.appendChild(title);

  const details = document.createElement("div");
  details.className = "text-xs text-zinc-600";
  details.textContent = [feature.properties.province, feature.properties.amphoe, feature.properties.village].filter(Boolean).join(" / ");
  container.appendChild(details);

  const meta = document.createElement("div");
  meta.className = "text-xs text-zinc-500";
  meta.textContent = `${collectionLabel(featureCollectionKey(feature), callbacksRef.current.collectionOptions)} | ${featureCategory(feature)} | ${geometrySummary(feature.geometry)}`;
  container.appendChild(meta);

  const canDelete = callbacksRef.current.canDeleteFeature(feature);
  const canEdit = callbacksRef.current.canEdit(feature);
  if (!canEdit && !canDelete) {
    return container;
  }

  const actions = document.createElement("div");
  actions.className = "mt-1 flex gap-2";

  if (canEdit) {
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.className = "rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700";
    editButton.onclick = () => callbacksRef.current.onEdit(feature);
    actions.append(editButton);
  }

  if (canDelete) {
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.className = "rounded border border-red-200 px-2 py-1 text-xs text-red-600";
    deleteButton.onclick = () => callbacksRef.current.onDelete(feature);
    actions.append(deleteButton);
  }

  container.appendChild(actions);

  return container;
}
