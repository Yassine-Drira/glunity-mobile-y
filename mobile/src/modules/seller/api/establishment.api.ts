import http from '../../../core/network/http.client';

export type EstablishmentCategory =
  | 'Supermarket'
  | 'Restaurant'
  | 'Bakery'
  | 'Health Store'
  | 'Bio Store'
  | 'Pharmacy'
  | 'Other';

export interface EstablishmentCoordinates {
  latitude: number;
  longitude: number;
}

export interface Establishment {
  _id: string;
  owner: string | { _id: string; fullName?: string; email?: string; phone?: string };
  name: string;
  category: EstablishmentCategory;
  description?: string;
  coverImageUrl?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  openTime?: string;
  closeTime?: string;
  daysClosed?: string[];
  coordinates: EstablishmentCoordinates;
  verified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertEstablishmentDto {
  id?: string;
  name: string;
  category: EstablishmentCategory;
  description?: string;
  address?: string;
  phone?: string;
  openTime?: string;
  closeTime?: string;
  daysClosed?: string[];
  latitude?: number;
  longitude?: number;
  coverImageUrl?: string;
  logoUrl?: string;
}

export async function getEstablishmentsApi(params?: { category?: string; search?: string }): Promise<Establishment[]> {
  const { data } = await http.get<{ success: boolean; data: Establishment[] }>('/establishments', { params });
  return data.data;
}

export async function getEstablishmentByIdApi(id: string): Promise<Establishment> {
  const { data } = await http.get<{ success: boolean; data: Establishment }>(`/establishments/${id}`);
  return data.data;
}

export async function getMyEstablishmentsApi(): Promise<Establishment[]> {
  const { data } = await http.get<{ success: boolean; data: Establishment[] }>('/establishments/my/all');
  return data.data;
}

export async function upsertEstablishmentApi(dto: UpsertEstablishmentDto): Promise<Establishment> {
  const { data } = await http.post<{ success: boolean; data: Establishment }>('/establishments/my', dto);
  return data.data;
}

export async function deleteEstablishmentApi(id: string): Promise<void> {
  await http.delete(`/establishments/my/${id}`);
}
