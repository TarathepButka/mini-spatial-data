export type PointGeometry = {
  type: "Point";
  coordinates: [number, number];
};

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
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type SpatialFeature = {
  id: string;
  type: "Feature";
  geometry: PointGeometry;
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
  geometry: PointGeometry;
  properties: FeatureProperties;
};

export type BoundingBox = [number, number, number, number];
