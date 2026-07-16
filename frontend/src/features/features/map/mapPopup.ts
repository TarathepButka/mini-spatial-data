import type { SpatialFeature } from "../../../types/geojson";
import { collectionLabel, featureCollectionKey } from "../utils/collections";
import { geometrySummary } from "../utils/geometry";
import { featureCategory } from "../utils/styles";

import type { CollectionOption } from "../../../api/features";

const DESCRIPTION_PREVIEW_LENGTH = 160;

export type FeaturePopupCallbacks = {
  canEdit: (feature: SpatialFeature) => boolean;
  canDeleteFeature: (feature: SpatialFeature) => boolean;
  onEdit: (feature: SpatialFeature) => void;
  onDelete: (feature: SpatialFeature) => void;
  collectionOptions?: CollectionOption[];
};

export type FeaturePopupDetails = {
  title: string;
  collection: string;
  status: string;
  location?: string;
  dateTime?: string;
  geometry: string;
  hotspotDetails?: string;
  description?: string;
};

export function buildFeaturePopupDetails(feature: SpatialFeature, collectionOptions: CollectionOption[] = []): FeaturePopupDetails {
  const properties = feature.properties;

  return {
    title: stringValue(properties.name) || "Untitled feature",
    collection: collectionLabel(featureCollectionKey(feature), collectionOptions),
    status: featureCategory(feature),
    location: joinDefined([properties.village, properties.tambol, properties.amphoe, properties.province], " / "),
    dateTime: formatFeatureDateTime(feature),
    geometry: geometrySummary(feature.geometry),
    hotspotDetails: joinDefined(
      [
        typeof properties.frp === "number" ? `FRP ${properties.frp.toFixed(2)}` : undefined,
        stringValue(properties.hotspotid) ? `Hotspot ${stringValue(properties.hotspotid)}` : undefined,
        joinDefined([properties.satellite, properties.instrument], " / "),
      ],
      " | ",
    ),
    description: truncateDescription(properties.description),
  };
}

export function createPopup(feature: SpatialFeature, callbacksRef: { readonly current: FeaturePopupCallbacks }) {
  const details = buildFeaturePopupDetails(feature, callbacksRef.current.collectionOptions);
  const container = document.createElement("div");
  container.className = "grid w-72 max-w-[calc(100vw-3rem)] gap-3 text-sm";

  const title = document.createElement("strong");
  title.className = "text-sm font-semibold leading-snug text-zinc-950";
  title.textContent = details.title;
  container.appendChild(title);

  const badges = document.createElement("div");
  badges.className = "flex flex-wrap gap-1.5";
  badges.append(createBadge(details.collection), createBadge(details.status));
  container.appendChild(badges);

  const detailRows = [
    { label: "Location", value: details.location },
    { label: "Date / Time", value: details.dateTime },
    { label: "Geometry", value: details.geometry },
    { label: "Hotspot", value: details.hotspotDetails },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value));

  if (detailRows.length > 0) {
    const rows = document.createElement("dl");
    rows.className = "grid gap-1.5 text-xs";
    detailRows.forEach((row) => rows.append(createDetailRow(row.label, row.value)));
    container.appendChild(rows);
  }

  if (details.description) {
    const description = document.createElement("p");
    description.className = "border-t border-zinc-100 pt-2 text-xs leading-relaxed text-zinc-600";
    description.textContent = details.description;
    container.appendChild(description);
  }

  const canDelete = callbacksRef.current.canDeleteFeature(feature);
  const canEdit = callbacksRef.current.canEdit(feature);
  if (!canEdit && !canDelete) {
    return container;
  }

  const actions = document.createElement("div");
  actions.className = "mt-1 grid grid-cols-2 gap-2 pt-2";

  if (canDelete) {
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.className = "flex w-full items-center justify-center rounded-md bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm ring-1 ring-inset ring-red-200 transition-colors hover:bg-red-50";
    deleteButton.onclick = () => callbacksRef.current.onDelete(feature);
    actions.append(deleteButton);
  }

  if (canEdit) {
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.className = "flex w-full items-center justify-center rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-zinc-800";
    editButton.onclick = () => callbacksRef.current.onEdit(feature);
    actions.append(editButton);
  }

  container.appendChild(actions);

  return container;
}

function createBadge(value: string) {
  const badge = document.createElement("span");
  badge.className = "rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700";
  badge.textContent = value;

  return badge;
}

function createDetailRow(label: string, value: string) {
  const row = document.createElement("div");
  row.className = "grid grid-cols-[72px_1fr] gap-2";

  const term = document.createElement("dt");
  term.className = "text-zinc-400";
  term.textContent = label;

  const description = document.createElement("dd");
  description.className = "min-w-0 text-zinc-700";
  description.textContent = value;

  row.append(term, description);

  return row;
}

function formatFeatureDateTime(feature: SpatialFeature) {
  const { th_date, th_time, updatedAt, createdAt } = feature.properties;
  const thailandDate = joinDefined([th_date, th_time], " ");

  if (thailandDate) {
    return thailandDate;
  }

  return formatDateTime(updatedAt) || formatDateTime(createdAt);
}

function formatDateTime(value: unknown) {
  const rawValue = stringValue(value);

  if (!rawValue) {
    return undefined;
  }

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }

  return date.toLocaleString("th-TH");
}

function truncateDescription(value: unknown) {
  const description = stringValue(value);

  if (!description) {
    return undefined;
  }

  if (description.length <= DESCRIPTION_PREVIEW_LENGTH) {
    return description;
  }

  return `${description.slice(0, DESCRIPTION_PREVIEW_LENGTH - 3).trimEnd()}...`;
}

function joinDefined(values: unknown[], separator: string) {
  const parts = values.map(stringValue).filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(separator) : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
