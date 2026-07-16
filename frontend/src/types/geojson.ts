export type Position = [number, number];

export type PointGeometry = {
  type: "Point";
  coordinates: Position;
};

export type LineStringGeometry = {
  type: "LineString";
  coordinates: Position[];
};

export type PolygonGeometry = {
  type: "Polygon";
  coordinates: Position[][];
};

export type SpatialGeometry = PointGeometry | LineStringGeometry | PolygonGeometry;

export type FeatureProperties = {
  name: string;
  category?: string;
  confidence?: string;
  province?: string;
  amphoe?: string;
  tambol?: string;
  village?: string;
  landUse?: string;
  description?: string;
  hotspotid?: string;
  frp?: number;
  bright_ti4?: number;
  bright_ti5?: number;
  th_date?: string;
  th_time?: string;
  source?: string;
  sourceId?: string;
  createdBy?: {
    sub?: string;
    email?: string;
    name?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type SpatialFeature = {
  id: string;
  type: "Feature";
  collection: string;
  geometry: SpatialGeometry;
  properties: FeatureProperties;
};

export type FeatureCollection = {
  type: "FeatureCollection";
  features: SpatialFeature[];
};

export type FeaturesMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type FeaturesResponse = {
  data: FeatureCollection;
  meta: FeaturesMeta;
};

export type FeatureInput = {
  type: "Feature";
  collection: string;
  geometry: SpatialGeometry;
  properties: FeatureProperties;
};

export type BoundingBox = [number, number, number, number];
