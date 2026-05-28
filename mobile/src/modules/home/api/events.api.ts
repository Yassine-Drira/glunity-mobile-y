import http from '../../../core/network/http.client';
import type { GlunityEvent } from '../domain/home.types';

interface ListResponse {
  success: boolean;
  data: Array<{
    id: string;
    title: string;
    imageUrl?: string;
    location?: string;
    date?: string;
    type?: string;
    startsAt?: string;
    attendeesCount?: number;
    maxCapacity?: number;
  }>;
}

export const eventsApi = {
  // Note: http.baseURL already includes the `/api` suffix,
  // so route paths here must NOT be prefixed with /api.
  async list(params?: { type?: string }): Promise<GluunityEvent[]> {
    try {
      const res = await http.get<ListResponse>('/events', { params });
      const items = res.data?.data ?? [];
      return items.map((it) => ({
        id: it.id,
        title: it.title,
        imageUrl: it.imageUrl || '',
        location: it.location || '',
        date: it.date || it.startsAt || '',
        type: it.type,
        startsAt: it.startsAt,
        attendeesCount: it.attendeesCount || 0,
        attendees: it.attendees || [],
        maxCapacity: it.maxCapacity || 0,
        locationLat: it.locationLat,
        locationLng: it.locationLng,
        onPress: () => {},
      } as any));
    } catch (err) {
      // Propagate error to caller to allow fallback to mocks
      throw err;
    }
  },
  async get(id: string): Promise<GluunityEvent> {
    const res = await http.get<{ success: boolean; data: any }>(`/events/${id}`);
    const it = res.data?.data;
    return {
      id: it.id,
      title: it.title,
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
      onPress: () => {},
    } as any;
  },
  async join(id: string): Promise<GluunityEvent> {
    const res = await http.post<{ success: boolean; data: any }>(`/events/${id}/join`);
    const it = res.data?.data;
    return {
      id: it.id,
      title: it.title,
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
      onPress: () => {},
    } as any;
  },
  async leave(id: string): Promise<GluunityEvent> {
    const res = await http.post<{ success: boolean; data: any }>(`/events/${id}/leave`);
    const it = res.data?.data;
    return {
      id: it.id,
      title: it.title,
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
      onPress: () => {},
    } as any;
  },
};
