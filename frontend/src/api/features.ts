import type {
  BoundingBox,
  FeatureInput,
  FeaturesResponse,
  SpatialFeature,
} from "../types/geojson";
import { API_PREFIX, request } from "./client";

const FEATURES_PATH = `${API_PREFIX}/features`;

export type FeaturesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  province?: string;
  bbox?: BoundingBox | null;
};

export type SeedResult = {
  numberMatched: number;
  numberReturned: number;
  insertedOrUpdated: number;
};

export async function getFeatures(
  query: FeaturesQuery,
): Promise<FeaturesResponse> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 20));
  if (query.search) {
    params.set("search", query.search);
  }

  if (query.category) {
    params.set("category", query.category);
  }

  if (query.province) {
    params.set("province", query.province);
  }

  if (query.bbox) {
    params.set("bbox", query.bbox.join(","));
  }

  return request<FeaturesResponse>(`${FEATURES_PATH}?${params.toString()}`);
}

export async function createFeature(
  input: FeatureInput,
): Promise<SpatialFeature> {
  return request<SpatialFeature>(FEATURES_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updateFeature(
  id: string,
  input: FeatureInput,
): Promise<SpatialFeature> {
  return request<SpatialFeature>(`${FEATURES_PATH}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function deleteFeature(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`${FEATURES_PATH}/${id}`, {
    method: "DELETE",
  });
}

export async function seedVallaris(): Promise<SeedResult> {
  return request<SeedResult>(`${API_PREFIX}/seed/vallaris`, { method: "POST" });
}
