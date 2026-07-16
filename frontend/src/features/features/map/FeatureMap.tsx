import { MapPin, MousePointer2, Pentagon, Route, Trash2 } from "lucide-react";
import maplibregl, { type Map, type Popup } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { GeoJSONStoreFeatures, TerraDraw } from "terra-draw";
import type { BoundingBox, SpatialFeature, SpatialGeometry } from "../../../types/geojson";
import type { CollectionOption } from "../../../api/features";
import { LINE_DRAW_FINISH_HINT, LINE_DRAW_INITIAL_HINT } from "../utils/constants";
import { draftPointGeometry, geometryBounds, geometrySummary } from "../utils/geometry";
import {
  BOUNDS_CHANGE_DELAY_MS,
  FEATURE_CLICK_LAYERS,
  addFeatureLayers,
  boundsToBBox,
  initialMapView,
  rasterStyle,
  updateFeatureSource,
  updateSelectedFilters,
} from "./mapLayers";
import { createTerraDraw, drawModeForGeometry, geometryFromDrawFeature } from "./mapDraw";
import type { DrawFeatureId, DrawMode } from "./mapDraw";
import { createPopup } from "./mapPopup";
import type { FeaturePopupCallbacks } from "./mapPopup";

type FeatureMapProps = {
  features: SpatialFeature[];
  collectionOptions: CollectionOption[];
  selectedFeatureId?: string | null;
  focusRequestId: number;
  draftGeometry: SpatialGeometry | null;
  bboxEnabled: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canEditFeature: (feature: SpatialFeature) => boolean;
  canDeleteFeature: (feature: SpatialFeature) => boolean;
  onMapClick: (coordinates: [number, number]) => void;
  onDraftGeometryChange: (geometry: SpatialGeometry | null, meta?: { finished?: boolean }) => void;
  onBoundsChange: (bbox: BoundingBox) => void;
  onSelectFeature: (feature: SpatialFeature) => void;
  onEdit: (feature: SpatialFeature) => void;
  onDelete: (feature: SpatialFeature) => void;
};

type CallbackRefs = Pick<FeatureMapProps, "onMapClick" | "onDraftGeometryChange" | "onBoundsChange" | "onSelectFeature"> &
  FeaturePopupCallbacks & {
    canCreate: boolean;
    collectionOptions: CollectionOption[];
  };

export function FeatureMap({
  features,
  collectionOptions,
  selectedFeatureId,
  focusRequestId,
  draftGeometry,
  bboxEnabled,
  canCreate,
  canEdit,
  canEditFeature,
  canDeleteFeature,
  onMapClick,
  onDraftGeometryChange,
  onBoundsChange,
  onSelectFeature,
  onEdit,
  onDelete,
}: FeatureMapProps) {
  const [drawMode, setDrawModeState] = useState<DrawMode>("select");
  const [lineDrawHint, setLineDrawHint] = useState(LINE_DRAW_INITIAL_HINT);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const featuresRef = useRef<SpatialFeature[]>(features);
  const moveTimerRef = useRef<number | null>(null);
  const drawModeRef = useRef<DrawMode>("select");
  const ignoreNextMapClickRef = useRef(false);
  const ignoreMapClickUntilRef = useRef(0);
  const loadingDraftRef = useRef(false);
  const drawGeometryJsonRef = useRef("");
  const lastHandledFocusRequestRef = useRef(0);
  const callbacksRef = useRef<CallbackRefs>({
    canCreate,
    canEdit: canEditFeature,
    canDeleteFeature,
    onMapClick,
    onDraftGeometryChange,
    onBoundsChange,
    onSelectFeature,
    onEdit,
    onDelete,
    collectionOptions,
  });

  featuresRef.current = features;
  callbacksRef.current = { canCreate, canEdit: canEditFeature, canDeleteFeature, onMapClick, onDraftGeometryChange, onBoundsChange, onSelectFeature, onEdit, onDelete, collectionOptions };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: rasterStyle,
      center: initialMapView.center,
      zoom: initialMapView.zoom,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.getCanvas().tabIndex = 0;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    const handleFeatureClick = (event: maplibregl.MapMouseEvent) => {
      const layers = FEATURE_CLICK_LAYERS.filter((layerId) => map.getLayer(layerId));

      if (layers.length === 0) {
        return null;
      }

      // Add a small 5px bounding box to make clicking points/lines easier
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [event.point.x - 5, event.point.y - 5],
        [event.point.x + 5, event.point.y + 5],
      ];
      const renderedFeatures = map.queryRenderedFeatures(bbox, { layers });
      for (const renderedFeature of renderedFeatures) {
        // MapLibre might drop string IDs, so we check properties.id as a fallback
        const rawId = renderedFeature.id ?? renderedFeature.properties?.id;
        const featureId = rawId == null ? "" : String(rawId);
        const feature = featuresRef.current.find((item) => item.id === featureId);

        if (feature) {
          return feature;
        }
      }

      return null;
    };

    const openFeaturePopup = (feature: SpatialFeature, lngLat: maplibregl.LngLat) => {
      callbacksRef.current.onSelectFeature(feature);
      popupRef.current?.remove();

      const popup = new maplibregl.Popup({ offset: 18 }).setLngLat(lngLat).setDOMContent(createPopup(feature, callbacksRef)).addTo(map);
      popup.on("close", () => {
        if (popupRef.current === popup) {
          popupRef.current = null;
        }
      });
      popupRef.current = popup;
    };

    const setPointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const unsetPointer = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", (event) => {
      if (Date.now() < ignoreMapClickUntilRef.current) {
        return;
      }

      if (drawModeRef.current !== "select") {
        return;
      }

      const feature = handleFeatureClick(event);
      if (feature) {
        openFeaturePopup(feature, event.lngLat);

        return;
      }

      if (!callbacksRef.current.canCreate) {
        return;
      }

      const coordinates: [number, number] = [event.lngLat.lng, event.lngLat.lat];
      callbacksRef.current.onMapClick(coordinates);
      callbacksRef.current.onDraftGeometryChange(draftPointGeometry(coordinates));
    });

    const handleLineFinishClick = (event: MouseEvent) => {
      if (drawModeRef.current !== "linestring" || event.detail < 2) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      finishCurrentLine();
    };

    const handleLineDoubleClick = (event: MouseEvent) => {
      if (drawModeRef.current !== "linestring") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      finishCurrentLine();
    };

    map.getCanvas().addEventListener("click", handleLineFinishClick, true);
    map.getCanvas().addEventListener("dblclick", handleLineDoubleClick, true);

    const emitBounds = () => {
      if (moveTimerRef.current) {
        window.clearTimeout(moveTimerRef.current);
      }

      moveTimerRef.current = window.setTimeout(() => {
        callbacksRef.current.onBoundsChange(boundsToBBox(map));
      }, BOUNDS_CHANGE_DELAY_MS);
    };

    map.on("load", () => {
      addFeatureLayers(map);
      updateFeatureSource(map, featuresRef.current, collectionOptions);
      updateSelectedFilters(map, selectedFeatureId);
      FEATURE_CLICK_LAYERS.forEach((layerId) => {
        map.on("mouseenter", layerId, setPointer);
        map.on("mouseleave", layerId, unsetPointer);
      });

      const draw = createTerraDraw(map);
      drawRef.current = draw;
      draw.on("finish", (id) => syncDraftFromDraw(draw, id as DrawFeatureId));
      draw.on("change", () => syncDraftFromDraw(draw));
      draw.start();
      draw.setMode("select");
      emitBounds();
    });
    map.on("moveend", emitBounds);

    return () => {
      if (moveTimerRef.current) {
        window.clearTimeout(moveTimerRef.current);
      }

      map.getCanvas().removeEventListener("click", handleLineFinishClick, true);
      map.getCanvas().removeEventListener("dblclick", handleLineDoubleClick, true);
      popupRef.current?.remove();
      popupRef.current = null;
      drawRef.current?.stop();
      drawRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    updateFeatureSource(map, features, collectionOptions);
  }, [features, collectionOptions]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    updateSelectedFilters(map, selectedFeatureId);
  }, [selectedFeatureId]);

  useEffect(() => {
    const draw = drawRef.current;

    if (!draw || drawModeRef.current !== "select") {
      return;
    }

    const nextJson = draftGeometry ? JSON.stringify(draftGeometry) : "";

    if (nextJson === drawGeometryJsonRef.current) {
      return;
    }

    loadingDraftRef.current = true;
    draw.clear();

    if (draftGeometry) {
      const featureId = draw.getFeatureId();
      draw.addFeatures([
        {
          id: featureId,
          type: "Feature",
          geometry: draftGeometry,
          properties: { mode: drawModeForGeometry(draftGeometry) },
        } as GeoJSONStoreFeatures,
      ]);
      draw.selectFeature(featureId);
    }

    drawGeometryJsonRef.current = nextJson;
    loadingDraftRef.current = false;
  }, [draftGeometry]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !selectedFeatureId || focusRequestId === 0) {
      return;
    }

    if (lastHandledFocusRequestRef.current === focusRequestId) {
      return;
    }

    const feature = features.find((item) => item.id === selectedFeatureId);

    if (!feature) {
      return;
    }

    lastHandledFocusRequestRef.current = focusRequestId;

    if (feature.geometry.type === "Point") {
      map.flyTo({ center: feature.geometry.coordinates, zoom: Math.max(map.getZoom(), 10), essential: true });

      return;
    }

    const [minLng, minLat, maxLng, maxLat] = geometryBounds(feature.geometry);
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 80, maxZoom: 12, essential: true },
    );
  }, [features, focusRequestId, selectedFeatureId]);

  useEffect(() => {
    if (!bboxEnabled || !mapRef.current) {
      return;
    }

    callbacksRef.current.onBoundsChange(boundsToBBox(mapRef.current));
  }, [bboxEnabled]);

  useEffect(() => {
    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || drawModeRef.current !== "linestring") {
        return;
      }

      if (isEditableEventTarget(event.target)) {
        return;
      }

      event.preventDefault();
      finishCurrentLine();
    };

    document.addEventListener("keydown", handleDocumentKeyDown);

    return () => document.removeEventListener("keydown", handleDocumentKeyDown);
  }, []);

  function setDrawMode(mode: DrawMode) {
    drawRef.current?.setMode(mode);
    drawModeRef.current = mode;
    setDrawModeState(mode);

    if (mode === "linestring") {
      setLineDrawHint(LINE_DRAW_INITIAL_HINT);
    }

    if (mode !== "select") {
      mapRef.current?.getCanvas().focus();
    }
  }

  function clearDraft() {
    loadingDraftRef.current = true;
    drawRef.current?.clear();
    drawGeometryJsonRef.current = "";
    loadingDraftRef.current = false;
    callbacksRef.current.onDraftGeometryChange(null);
    setDrawMode("select");
  }

  function syncDraftFromDraw(draw: TerraDraw, finishedId?: DrawFeatureId) {
    if (loadingDraftRef.current) {
      return;
    }

    const snapshot = draw.getSnapshot();
    const supported = snapshot
      .map((feature) => ({ id: feature.id, geometry: geometryFromDrawFeature(feature) }))
      .filter((item): item is { id: DrawFeatureId; geometry: SpatialGeometry } => item.geometry !== null);

    if (supported.length === 0) {
      drawGeometryJsonRef.current = "";
      callbacksRef.current.onDraftGeometryChange(null);

      if (drawModeRef.current === "linestring") {
        setLineDrawHint(LINE_DRAW_INITIAL_HINT);
      }

      return;
    }

    const chosen = finishedId ? supported.find((item) => item.id === finishedId) ?? supported[supported.length - 1] : supported[supported.length - 1];
    const extras = supported.map((item) => item.id).filter((id) => id !== chosen.id);

    if (extras.length > 0) {
      draw.removeFeatures(extras);
    }

    drawGeometryJsonRef.current = JSON.stringify(chosen.geometry);

    if (drawModeRef.current === "linestring" && chosen.geometry.type === "LineString") {
      setLineDrawHint(`${geometrySummary(chosen.geometry)}. ${LINE_DRAW_FINISH_HINT}`);
    }

    if (finishedId) {
      ignoreMapClickUntilRef.current = Date.now() + 500;
    }

    callbacksRef.current.onDraftGeometryChange(chosen.geometry, { finished: Boolean(finishedId) });
  }

  function finishCurrentLine() {
    const map = mapRef.current;

    if (!map || drawModeRef.current !== "linestring") {
      return;
    }

    map.getCanvas().dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true, cancelable: true }));
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {canCreate ? (
        <div className="absolute left-4 top-4 z-10 flex overflow-hidden rounded border border-zinc-200 bg-white shadow-sm">
          <DrawButton active={drawMode === "select"} title="Select" onClick={() => setDrawMode("select")}>
            <MousePointer2 size={16} />
          </DrawButton>
          <DrawButton active={drawMode === "point"} title="Draw point" onClick={() => setDrawMode("point")}>
            <MapPin size={16} />
          </DrawButton>
          <DrawButton active={drawMode === "linestring"} title="Draw line. Double-click or press Enter to finish." onClick={() => setDrawMode("linestring")}>
            <Route size={16} />
          </DrawButton>
          <DrawButton active={drawMode === "polygon"} title="Draw polygon" onClick={() => setDrawMode("polygon")}>
            <Pentagon size={16} />
          </DrawButton>
          <DrawButton active={false} title="Clear draft" onClick={clearDraft} danger>
            <Trash2 size={16} />
          </DrawButton>
        </div>
      ) : null}
      {drawMode === "linestring" ? (
        <div className="absolute left-4 top-16 z-10 max-w-[calc(100%-2rem)] rounded border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm sm:max-w-md">
          {lineDrawHint}
        </div>
      ) : null}
    </div>
  );
}

function isEditableEventTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return target.isContentEditable || tagName === "input" || tagName === "textarea" || tagName === "select";
}

function DrawButton({
  active,
  title,
  onClick,
  children,
  danger = false,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center border-r border-zinc-200 text-sm transition last:border-r-0 ${active
          ? "bg-zinc-950 text-white"
          : danger
            ? "bg-white text-red-600 hover:bg-red-50"
            : "bg-white text-zinc-700 hover:bg-zinc-100"
        }`}
    >
      {children}
    </button>
  );
}
