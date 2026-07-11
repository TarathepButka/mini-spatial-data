import maplibregl, { Map, Marker } from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { BoundingBox, SpatialFeature } from "../../types/geojson";
import { categoryColor, featureCategory } from "./styles";

type FeatureMapProps = {
  features: SpatialFeature[];
  selectedFeatureId?: string | null;
  focusRequestId: number;
  pendingCoordinates: [number, number] | null;
  bboxEnabled: boolean;
  onMapClick: (coordinates: [number, number]) => void;
  onBoundsChange: (bbox: BoundingBox) => void;
  onEdit: (feature: SpatialFeature) => void;
  onDelete: (feature: SpatialFeature) => void;
};

type CallbackRefs = Pick<FeatureMapProps, "onMapClick" | "onBoundsChange" | "onEdit" | "onDelete">;

const rasterStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

export function FeatureMap({
  features,
  selectedFeatureId,
  focusRequestId,
  pendingCoordinates,
  bboxEnabled,
  onMapClick,
  onBoundsChange,
  onEdit,
  onDelete,
}: FeatureMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const pendingMarkerRef = useRef<Marker | null>(null);
  const moveTimerRef = useRef<number | null>(null);
  const lastHandledFocusRequestRef = useRef(0);
  const callbacksRef = useRef<CallbackRefs>({ onMapClick, onBoundsChange, onEdit, onDelete });

  callbacksRef.current = { onMapClick, onBoundsChange, onEdit, onDelete };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: rasterStyle,
      center: [100.75, 15.2],
      zoom: 5,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("click", (event) => {
      callbacksRef.current.onMapClick([event.lngLat.lng, event.lngLat.lat]);
    });

    const emitBounds = () => {
      if (moveTimerRef.current) window.clearTimeout(moveTimerRef.current);
      moveTimerRef.current = window.setTimeout(() => {
        callbacksRef.current.onBoundsChange(boundsToBBox(map));
      }, 300);
    };

    map.on("load", emitBounds);
    map.on("moveend", emitBounds);

    return () => {
      if (moveTimerRef.current) window.clearTimeout(moveTimerRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = features.map((feature) => {
      const markerNode = document.createElement("button");
      markerNode.type = "button";
      markerNode.className = "spatial-marker";
      markerNode.title = feature.properties.name;
      markerNode.style.backgroundColor = categoryColor(featureCategory(feature));
      if (feature.id === selectedFeatureId) markerNode.classList.add("spatial-marker-selected");
      markerNode.addEventListener("click", (event) => event.stopPropagation());

      const popup = new maplibregl.Popup({ offset: 18 }).setDOMContent(createPopup(feature, callbacksRef));
      return new maplibregl.Marker({ element: markerNode, anchor: "bottom" })
        .setLngLat(feature.geometry.coordinates)
        .setPopup(popup)
        .addTo(map);
    });
  }, [features, selectedFeatureId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pendingMarkerRef.current?.remove();
    pendingMarkerRef.current = null;
    if (!pendingCoordinates) return;

    const markerNode = document.createElement("div");
    markerNode.className = "spatial-marker spatial-marker-pending";
    pendingMarkerRef.current = new maplibregl.Marker({ element: markerNode, anchor: "bottom" })
      .setLngLat(pendingCoordinates)
      .addTo(map);
  }, [pendingCoordinates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedFeatureId || focusRequestId === 0) return;
    if (lastHandledFocusRequestRef.current === focusRequestId) return;
    const feature = features.find((item) => item.id === selectedFeatureId);
    if (!feature) return;
    lastHandledFocusRequestRef.current = focusRequestId;
    map.flyTo({ center: feature.geometry.coordinates, zoom: Math.max(map.getZoom(), 10), essential: true });
  }, [features, focusRequestId, selectedFeatureId]);

  useEffect(() => {
    if (!bboxEnabled || !mapRef.current) return;
    callbacksRef.current.onBoundsChange(boundsToBBox(mapRef.current));
  }, [bboxEnabled]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function createPopup(feature: SpatialFeature, callbacksRef: React.MutableRefObject<CallbackRefs>) {
  const container = document.createElement("div");
  container.className = "grid min-w-56 gap-2 text-sm";

  const title = document.createElement("strong");
  title.className = "text-zinc-950";
  title.textContent = feature.properties.name;
  container.appendChild(title);

  const details = document.createElement("div");
  details.className = "text-xs text-zinc-600";
  details.textContent = [feature.properties.province, feature.properties.amphoe, feature.properties.village]
    .filter(Boolean)
    .join(" / ");
  container.appendChild(details);

  const meta = document.createElement("div");
  meta.className = "text-xs text-zinc-500";
  meta.textContent = `${featureCategory(feature)} | ${feature.geometry.coordinates[0].toFixed(5)}, ${feature.geometry.coordinates[1].toFixed(5)}`;
  container.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "mt-1 flex gap-2";
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "Edit";
  editButton.className = "rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700";
  editButton.onclick = () => callbacksRef.current.onEdit(feature);
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.className = "rounded border border-red-200 px-2 py-1 text-xs text-red-600";
  deleteButton.onclick = () => callbacksRef.current.onDelete(feature);
  actions.append(editButton, deleteButton);
  container.appendChild(actions);

  return container;
}

function boundsToBBox(map: Map): BoundingBox {
  const bounds = map.getBounds();
  return [
    clamp(bounds.getWest(), -180, 180),
    clamp(bounds.getSouth(), -90, 90),
    clamp(bounds.getEast(), -180, 180),
    clamp(bounds.getNorth(), -90, 90),
  ];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

