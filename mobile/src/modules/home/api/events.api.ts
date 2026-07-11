import http from '../../../core/network/http.client';
import type { GlunityEvent } from '../domain/home.types';

interface RawEvent {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  location?: string;
  date?: string;
  type?: string;
  startsAt?: string;
  price?: number;
  currency?: string;
  attendeesCount?: number;
  maxCapacity?: number;
  attendees?: string[];
  locationLat?: number;
  locationLng?: number;
  isCancelled?: boolean;
  status?: string;
}

interface ListResponse {
  success: boolean;
  data: RawEvent[];
  meta?: { total: number; count: number };
}

function mapEvent(it: RawEvent): GlunityEvent {
  return {
    id: it.id,
    title: it.title,
    description: it.description || '',
    imageUrl: it.imageUrl || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=400',
    location: it.location || '',
    date: it.date || it.startsAt || '',
    type: it.type,
    startsAt: it.startsAt,
    price: it.price,
    currency: it.currency,
    attendeesCount: it.attendeesCount || 0,
    attendees: it.attendees || [],
    maxCapacity: it.maxCapacity || 0,
    locationLat: it.locationLat,
    locationLng: it.locationLng,
    isCancelled: it.isCancelled || false,
    status: it.status || 'active',
    onPress: () => {},
  } as any;
}

export const eventsApi = {
  // Note: http.baseURL already includes the `/api` suffix,
  // so route paths here must NOT be prefixed with /api.
  async list(params?: {
    type?: string;
    limit?: number;
    skip?: number;
    search?: string;
  }): Promise<{ items: GlunityEvent[]; total: number }> {
    try {
      const res = await http.get<ListResponse>('/events', { params });
      const items = (res.data?.data ?? []).map(mapEvent);
      const total = res.data?.meta?.total ?? items.length;
      return { items, total };
    } catch (err) {
      throw err;
    }
  },
  async get(id: string): Promise<GlunityEvent> {
    const res = await http.get<{ success: boolean; data: any }>(`/events/${id}`);
    const it = res.data?.data;
    return {
      id: it.id,
      title: it.title,
      description: it.description || '',
      imageUrl: it.imageUrl || '',
      createdBy: it.createdBy || it.created_by || undefined,
      location: it.location || '',
      date: it.date || it.startsAt || '',
      type: it.type,
      startsAt: it.startsAt,
      price: it.price,
      currency: it.currency,
      attendeesCount: it.attendeesCount || 0,
      attendees: it.attendees || [],
      locationLat: it.locationLat,
      locationLng: it.locationLng,
      maxCapacity: it.maxCapacity || 0,
      isCancelled: it.isCancelled || false,
      status: it.status || 'active',
      onPress: () => {},
    } as any;
  },
  async join(id: string): Promise<GlunityEvent> {
    const res = await http.post<{ success: boolean; data: any }>(`/events/${id}/join`);
    const it = res.data?.data;
    return {
      id: it.id,
      title: it.title,
      description: it.description || '',
      createdBy: it.createdBy || it.created_by || undefined,
      imageUrl: it.imageUrl || '',
      location: it.location || '',
      date: it.date || it.startsAt || '',
      type: it.type,
      startsAt: it.startsAt,
      price: it.price,
      currency: it.currency,
      attendeesCount: it.attendeesCount || 0,
      attendees: it.attendees || [],
      locationLat: it.locationLat,
      locationLng: it.locationLng,
      maxCapacity: it.maxCapacity || 0,
      isCancelled: it.isCancelled || false,
      status: it.status || 'active',
      onPress: () => {},
    } as any;
  },
  async leave(id: string): Promise<GlunityEvent> {
    const res = await http.post<{ success: boolean; data: any }>(`/events/${id}/leave`);
    const it = res.data?.data;
    return {
      id: it.id,
      title: it.title,
      description: it.description || '',
      createdBy: it.createdBy || it.created_by || undefined,
      imageUrl: it.imageUrl || '',
      location: it.location || '',
      date: it.date || it.startsAt || '',
      type: it.type,
      startsAt: it.startsAt,
      attendeesCount: it.attendeesCount || 0,
      attendees: it.attendees || [],
      locationLat: it.locationLat,
      locationLng: it.locationLng,
      maxCapacity: it.maxCapacity || 0,
      isCancelled: it.isCancelled || false,
      status: it.status || 'active',
      onPress: () => {},
    } as any;
  },
  async cancel(id: string): Promise<GlunityEvent> {
    const res = await http.post<{ success: boolean; data: any }>(`/events/${id}/cancel`);
    const it = res.data?.data;
    return {
      id: it.id,
      title: it.title,
      description: it.description || '',
      createdBy: it.createdBy || it.created_by || undefined,
      imageUrl: it.imageUrl || '',
      location: it.location || '',
      date: it.date || it.startsAt || '',
      type: it.type,
      startsAt: it.startsAt,
      attendeesCount: it.attendeesCount || 0,
      attendees: it.attendees || [],
      locationLat: it.locationLat,
      locationLng: it.locationLng,
      maxCapacity: it.maxCapacity || 0,
      isCancelled: it.isCancelled || false,
      status: it.status || 'active',
      onPress: () => {},
    } as any;
  },
  async remove(id: string): Promise<GlunityEvent> {
    const res = await http.post<{ success: boolean; data: any }>(`/events/${id}/remove`);
    const it = res.data?.data;
    return {
      id: it.id,
      title: it.title,
      description: it.description || '',
      createdBy: it.createdBy || it.created_by || undefined,
      imageUrl: it.imageUrl || '',
      location: it.location || '',
      date: it.date || it.startsAt || '',
      type: it.type,
      startsAt: it.startsAt,
      attendeesCount: it.attendeesCount || 0,
      attendees: it.attendees || [],
      locationLat: it.locationLat,
      locationLng: it.locationLng,
      maxCapacity: it.maxCapacity || 0,
      isCancelled: it.isCancelled || false,
      status: it.status || 'active',
      onPress: () => {},
    } as any;
  },
  async create(payload: {
    title: string;
    type?: string;
    description?: string;
    startsAt: string;
    endsAt?: string;
    location?: {
      name?: string;
      address?: string;
      city?: string;
      country?: string;
    };
    maxCapacity?: number;
    price?: number;
  }): Promise<GlunityEvent> {
    const res = await http.post<{ success: boolean; data: any }>('/events', payload);
    const it = res.data?.data;
    return {
      id: it.id,
      createdBy: it.createdBy || it.created_by || undefined,
      title: it.title,
      description: it.description || '',
      imageUrl: it.imageUrl || '',
      location: it.location?.name || '',
      date: it.startsAt || '',
      type: it.type,
      startsAt: it.startsAt,
      price: it.price,
      currency: it.currency,
      attendeesCount: 0,
      attendees: [],
      locationLat: it.location?.lat,
      locationLng: it.location?.lng,
      maxCapacity: it.maxCapacity || 0,
      isCancelled: it.isCancelled || false,
      status: it.status || 'active',
      onPress: () => {},
    } as any;
  },
};
