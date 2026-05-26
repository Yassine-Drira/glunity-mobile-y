import http from '../../../core/network/http.client';
import type { LocationFilters, MapLocation } from '../domain/location.types';

interface ListLocationsParams extends LocationFilters {
  lng?: number;
  lat?: number;
  radius?: number;
  limit?: number;
  skip?: number;
}

interface ListResponse {
  success: boolean;
  data: MapLocation[];
  meta: { total: number; count: number };
}

interface OneResponse {
  success: boolean;
  data: MapLocation;
}

function buildParams(params: ListLocationsParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (params.lng !== undefined)        out.lng = params.lng;
  if (params.lat !== undefined)        out.lat = params.lat;
  if (params.radius !== undefined)     out.radius = params.radius;
  if (params.category && params.category !== 'all') out.category = params.category;
  if (params.glutenFree !== undefined) out.glutenFree = params.glutenFree;
  if (params.certified !== undefined)  out.certified = params.certified;
  if (params.search)                   out.search = params.search;
  if (params.limit !== undefined)      out.limit = params.limit;
  if (params.skip !== undefined)       out.skip = params.skip;
  return out;
}

export const locationsApi = {
  // Note: http.baseURL already includes the `/api` suffix,
  // so route paths here must NOT be prefixed with /api.
  async list(params: ListLocationsParams = {}): Promise<MapLocation[]> {
    const res = await http.get<ListResponse>('/locations', { params: buildParams(params) });
    return res.data?.data ?? [];
  },

  async getById(id: string): Promise<MapLocation> {
    const res = await http.get<OneResponse>(`/locations/${id}`);
    return res.data.data;
  },
};
