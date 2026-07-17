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

// Client-side cache for events list
const eventListCache = new Map<string, { data: { items: GlunityEvent[]; total: number }; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export function clearEventsCache() {
  eventListCache.clear();
}

async function requestWithRetry<T>(
  requestFn: () => Promise<T>,
  retries = 2,
  delay = 500
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await requestFn();
    } catch (err: any) {
      lastError = err;
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        throw err;
      }
      // If it's a 4xx error (client error like 401, 403, 404) or local auth issue, do not retry
      if (err.response?.status && err.response.status >= 400 && err.response.status < 500) {
        throw err;
      }
      if (err.code === 'NO_ACCESS_TOKEN') {
        throw err;
      }

      console.warn(`[eventsApi] Request failed (attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`, err.message || err);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }
  throw lastError;
}

export const eventsApi = {
  // Note: http.baseURL already includes the `/api` suffix,
  // so route paths here must NOT be prefixed with /api.
  async list(
    params?: {
      type?: string;
      limit?: number;
      skip?: number;
      search?: string;
    },
    options?: { signal?: AbortSignal }
  ): Promise<{ items: GlunityEvent[]; total: number }> {
    const cacheKey = JSON.stringify(params || {});
    
    // Check cache
    if (eventListCache.has(cacheKey)) {
      const cached = eventListCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
      eventListCache.delete(cacheKey);
    }

    try {
      const result = await requestWithRetry(async () => {
        const res = await http.get<ListResponse>('/events', { 
          params, 
          signal: options?.signal 
        });
        const items = (res.data?.data ?? []).map(mapEvent);
        const total = res.data?.meta?.total ?? items.length;
        return { items, total };
      });

      eventListCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
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
      format: it.format || 'presentiel',
      meetingUrl: it.meetingUrl || '',
      platform: it.platform || '',
      accessCode: it.accessCode || '',
      instructions: it.instructions || '',
      parkingInfo: it.parkingInfo || '',
      ticketName: it.ticketName || '',
      ticketDescription: it.ticketDescription || '',
      maxTicketsPerParticipant: it.maxTicketsPerParticipant,
      salesStart: it.salesStart,
      salesEnd: it.salesEnd,
      refundPolicy: it.refundPolicy || '',
      paymentMethod: it.paymentMethod || 'online',
      payPlaceName: it.payPlaceName || '',
      payAddress: it.payAddress || '',
      payCity: it.payCity || '',
      payCountry: it.payCountry || '',
      payLat: it.payLat,
      payLng: it.payLng,
      payInstructions: it.payInstructions || '',
      payDeadline: it.payDeadline,
      locationDetails: it.locationDetails,
      onPress: () => {},
    } as any;
  },
  async join(id: string): Promise<GlunityEvent> {
    const res = await http.post<{ success: boolean; data: any }>(`/events/${id}/join`);
    const it = res.data?.data;
    clearEventsCache();
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
    clearEventsCache();
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
    clearEventsCache();
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
    clearEventsCache();
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
    clearEventsCache();
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
  async register(id: string, payload: {
    fullName: string;
    email: string;
    phone: string;
    ticketsCount: number;
    notes?: string;
  }): Promise<any> {
    const res = await http.post<{ success: boolean; data: any }>(`/events/${id}/register`, payload);
    clearEventsCache();
    return res.data?.data;
  },
  async getRegistrations(id: string): Promise<any[]> {
    const res = await http.get<{ success: boolean; data: any[] }>(`/events/${id}/registrations`);
    return res.data?.data ?? [];
  },
  async getMyRegistration(id: string): Promise<any | null> {
    const res = await http.get<{ success: boolean; data: any }>(`/events/${id}/my-registration`);
    return res.data?.data ?? null;
  },
  async confirmRegistration(regId: string): Promise<any> {
    const res = await http.post<{ success: boolean; data: any }>(`/events/registrations/${regId}/confirm`);
    clearEventsCache();
    return res.data?.data;
  },
  async cancelRegistration(regId: string): Promise<any> {
    const res = await http.post<{ success: boolean; data: any }>(`/events/registrations/${regId}/cancel`);
    clearEventsCache();
    return res.data?.data;
  },
  async getOwnerRegistrationNotifications(): Promise<any[]> {
    const res = await http.get<{ success: boolean; data: any[] }>('/events/owner/registration-notifications');
    return res.data?.data ?? [];
  },
  async getRegistrationDetails(eventId: string, registrationId: string): Promise<any> {
    const res = await http.get<{ success: boolean; data: any }>(`/events/${eventId}/registrations/${registrationId}`);
    return res.data?.data;
  },
  async approveRegistration(id: string): Promise<any> {
    const res = await http.patch<{ success: boolean; data: any }>(`/registrations/${id}/approve`);
    clearEventsCache();
    return res.data?.data;
  },
  async rejectRegistration(id: string, reason?: string): Promise<any> {
    const res = await http.patch<{ success: boolean; data: any }>(`/registrations/${id}/reject`, { reason });
    clearEventsCache();
    return res.data?.data;
  },
  async getOwnerStats(): Promise<any> {
    const res = await http.get<{ success: boolean; data: any }>('/events/owner/stats');
    return res.data?.data;
  },
};
