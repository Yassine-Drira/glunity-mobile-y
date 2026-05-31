import http from '../../../core/network/http.client';

export type NotificationType = 'system' | 'event' | 'product' | 'community';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface ListNotificationsResponse {
  success: boolean;
  data: Notification[];
}

const notificationsApi = {
  async list(): Promise<ListNotificationsResponse> {
    const { data } = await http.get<ListNotificationsResponse>('/notifications');
    return data;
  },

  async markAsRead(id: string): Promise<{ success: boolean; data: Notification }> {
    const { data } = await http.post<{ success: boolean; data: Notification }>(`/notifications/${id}/read`);
    return data;
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    const { data } = await http.post<{ success: boolean }>('/notifications/read-all');
    return data;
  },

  async remove(id: string): Promise<{ success: boolean }> {
    const { data } = await http.delete<{ success: boolean }>(`/notifications/${id}`);
    return data;
  },

  async removeAll(): Promise<{ success: boolean }> {
    const { data } = await http.delete<{ success: boolean }>('/notifications');
    return data;
  },
};

export default notificationsApi;
