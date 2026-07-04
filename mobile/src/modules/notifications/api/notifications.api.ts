import http from '../../../core/network/http.client';

export type NotificationType =
  | 'system'
  | 'event'
  | 'product'
  | 'community'
  | 'achievement'
  | 'REEL_LIKE'
  | 'REEL_COMMENT'
  | 'REEL_SHARE'
  | 'COMMENT_LIKE'
  | 'COMMENT_REPLY';

export interface Notification {
  id: string;
  _id?: string;
  userId: string;
  recipientId?: string;
  actorId?: string;
  actor?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  } | null;
  reelId?: string;
  reel?: {
    id: string;
    thumbnailUrl?: string | null;
  } | null;
  commentId?: string;
  comment?: {
    id: string;
    text?: string | null;
  } | null;
  replyId?: string;
  reply?: {
    id: string;
    text?: string | null;
  } | null;
  title: string;
  body: string;
  message?: string;
  type: NotificationType;
  isRead: boolean;
  readAt?: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface ListNotificationsResponse {
  success: boolean;
  data: Notification[];
}

const notificationsApi = {
  async list(params?: { limit?: number; skip?: number }): Promise<ListNotificationsResponse> {
    const { data } = await http.get<ListNotificationsResponse>('/notifications', { params });
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
