import type { Position, SpatialGeometry } from "../../../types/geojson";

export const DEFAULT_COORDINATES: Position = [100.5018, 13.7563];
export const DEFAULT_CATEGORY = "manual";
export const CATEGORY_OPTIONS = ["manual", "low", "nominal", "high", "unknown"];

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];
export const SEARCH_COMMIT_DELAY_MS = 3000;
export const SUGGESTION_DEBOUNCE_MS = 250;
export const SUGGESTION_PAGE_SIZE = 5;

export const MAP_DEFAULT_CENTER: Position = [100.75, 15.2];
export const MAP_DEFAULT_ZOOM = 5;
export const MAP_BOUNDS_DEBOUNCE_MS = 300;

export const GEOMETRY_TYPE_OPTIONS: SpatialGeometry["type"][] = ["Point", "LineString", "Polygon"];
export const LINE_DRAW_FINISH_HINT = "Double-click or press Enter to finish.";
export const LINE_DRAW_INITIAL_HINT = `Click map to add vertices. ${LINE_DRAW_FINISH_HINT}`;
