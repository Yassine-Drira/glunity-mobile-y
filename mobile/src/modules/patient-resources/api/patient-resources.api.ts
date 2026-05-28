import http from '@/core/network/http.client';

export type ResourceCategory = 'celiac-disease' | 'diet-basics' | 'safe-foods' | 'lifestyle-tips';

export interface PatientArticle {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  category: ResourceCategory;
  icon: string;
  coverImageUrl: string | null;
  readMinutes: number;
  isFeatured: boolean;
  authorName: string;
  publishedAt: string;
}

export interface ResourceVideo {
  id: string;
  title: string;
  presenter: string;
  thumbnailUrl: string;
  videoUrl: string;
  durationMinutes: number;
  category: ResourceCategory;
}

export interface PatientResourcesHomeData {
  featured: PatientArticle | null;
  articles: PatientArticle[];
  videos: ResourceVideo[];
}

const patientResourcesApi = {
  async getHomeData(): Promise<{ success: boolean; data: PatientResourcesHomeData }> {
    const res = await http.get('/patient-resources/home');
    return res.data;
  },

  async list(category?: ResourceCategory): Promise<{ success: boolean; data: PatientArticle[] }> {
    const params = category ? { category } : {};
    const res = await http.get('/patient-resources', { params });
    return res.data;
  },

  async getById(id: string): Promise<{ success: boolean; data: PatientArticle }> {
    const res = await http.get(`/patient-resources/${id}`);
    return res.data;
  },
};

export default patientResourcesApi;
