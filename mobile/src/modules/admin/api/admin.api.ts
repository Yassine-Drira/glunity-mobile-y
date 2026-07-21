import http from '../../../core/network/http.client';

import { AdminDashboardStats, ModerationItem, SellerVerificationDossier, AdminUserListItem, PatientResourceItem } from './admin.types';
export * from './admin.types';

export const adminApi = {
  // Fetch Dashboard Stats & Analytics Data from Real Backend DB
  async getDashboardStats(period: 'today' | '7d' | '30d' | '3m' | '1y' = '7d'): Promise<AdminDashboardStats> {
    const res = await http.get(`/admin/stats?period=${period}`);
    return res.data?.data || res.data;
  },

  // Fetch Moderation Items
  async getModerationItems(type: 'all' | 'products' | 'events' | 'recipes' | 'reels'): Promise<ModerationItem[]> {
    const res = await http.get(`/admin/moderation?type=${type}`);
    return res.data?.data || res.data;
  },

  // Approve or Reject Content Item (Triggers In-App + Email)
  async moderateItem(id: string, type: 'product' | 'event' | 'recipe' | 'reel', action: 'approve' | 'reject', reason?: string): Promise<boolean> {
    const res = await http.post(`/admin/moderation/${type}/${id}/${action}`, { reason });
    return res.data?.success;
  },

  // Fetch Pending Seller Verifications
  async getSellerVerifications(): Promise<SellerVerificationDossier[]> {
    const res = await http.get('/admin/sellers/pending');
    return res.data?.data || res.data;
  },

  // Process Seller Verification Request
  async processSellerVerification(id: string, action: 'approve' | 'reject', reason?: string): Promise<boolean> {
    const res = await http.post(`/admin/sellers/${id}/${action}`, { reason });
    return res.data?.success;
  },

  // Fetch Users List
  async getUsers(filter: string = 'all', search: string = ''): Promise<AdminUserListItem[]> {
    const res = await http.get(`/admin/users?filter=${filter}&search=${search}`);
    return res.data?.data || res.data;
  },

  // Suspend / Reactivate User
  async toggleUserStatus(id: string, status: 'active' | 'suspended') {
    return http.patch(`/admin/users/${id}/status`, { status });
  },

  // Fetch Patient Resources (with optional category, type, status filters)
  async getPatientResources(params?: { category?: string; type?: string; status?: string }): Promise<PatientResourceItem[]> {
    const res = await http.get('/admin/resources', { params });
    return res.data?.data || res.data;
  },

  // Create Patient Resource
  async createPatientResource(data: Partial<PatientResourceItem> & { content?: string; author?: string }): Promise<PatientResourceItem> {
    const res = await http.post('/admin/resources', data);
    return res.data?.data;
  },

  // Update Patient Resource
  async updatePatientResource(id: string, data: Partial<PatientResourceItem> & { content?: string; author?: string }): Promise<PatientResourceItem> {
    const res = await http.put(`/admin/resources/${id}`, data);
    return res.data?.data;
  },

  // Delete Patient Resource
  async deletePatientResource(id: string): Promise<boolean> {
    const res = await http.delete(`/admin/resources/${id}`);
    return res.data?.success;
  },

  // Get Patient Resource Analytics
  async getResourceAnalytics() {
    const res = await http.get('/admin/resources/analytics');
    return res.data?.data || res.data;
  },
};

