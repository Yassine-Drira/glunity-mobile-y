import http from '../../../core/network/http.client';
import { TokenStore } from '../../../core/storage/secure-store';

export interface LoginDto {
  email: string;
  password: string;
}

export type RegisterProfileType = 'celiac' | 'proche' | 'pro_commerce' | 'pro_health';

export interface CeliacQuestionnaire {
  diagnosisDate?: string | null;
  symptoms?: string[];
  severity?: string;
  clinicalDiagnosis?: boolean;
  familyHistory?: boolean;
}

export interface RegisterDto {
  fullName: string;
  email?: string;
  password?: string;
  profileType: RegisterProfileType;
  language?: string;
  phone?: string;
  birthDate: string;
  location: string;
  gender?: string;
  dietaryPreference?: string;
  consentVersion: string;
  consentTimestamp: string;
  celiacQuestionnaire?: CeliacQuestionnaire;
  storeInfo?: StoreInfo;
  oauthSignupToken?: string;
}

export interface StoreInfo {
  storeName?: string;
  description?: string;
  address?: string;
  operatingHours?: string;
  phone?: string;
  imageUrl?: string;
  mapClicks?: number;
}

export interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  role?: string;
  phone?: string;
  bio?: string;
  storeInfo?: StoreInfo;
  profileType: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  streakDays: number;
  points: number;
  lastCheckInAt?: string | null;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    pointsRequired: number;
  }>;
  language: string;
  darkMode: boolean;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  twoFactorEnabled?: boolean;
  dataSharingEnabled?: boolean;
  publicProfileEnabled?: boolean;
}

export interface UpdateProfileDto {
  fullName?: string;
  phone?: string;
  bio?: string;
  storeInfo?: StoreInfo;
  avatarUrl?: string;
  darkMode?: boolean;
  language?: string;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  twoFactorEnabled?: boolean;
  dataSharingEnabled?: boolean;
  publicProfileEnabled?: boolean;
}

export interface SellerStats {
  // Traffic
  views: number;
  viewsLast30Days: number;
  mapClicks: number;
  mapClicksLast30Days: number;
  // Reviews
  rating: string | null;
  totalReviews: number;
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  // Products
  productsCount: number;
  certifiedGFCount: number;
  avgPrice: number;
  topCategories: { name: string; count: number }[];
  mostViewedProduct: string;
  // Reels
  reelsCount: number;
  reelsViewsCount: number;
  reelsLikesCount: number;
  reelsCommentsCount: number;
  reelsEngagementRate: number;
  // Engagement
  topInteractionDay: string;
  // Charts
  chartData: number[];      // 7 days (Sun→Sat)
  chartData30d: number[];   // 30 days
  chartLabels?: string[];
  // Account
  memberSince: string;
  accountAgeDays: number;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user?: AuthUser;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    twoFactorRequired?: boolean;
    userId?: string;
    isNewUser?: boolean;
    oauthSignupToken?: string;
    prefill?: {
      email: string;
      fullName: string;
    };
  };
}

const authApi = {
  async login(dto: LoginDto): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/login', dto);
    if (data.data && data.data.accessToken && data.data.refreshToken) {
      await TokenStore.setTokens(data.data.accessToken, data.data.refreshToken);
    }
    return data;
  },

  async oauthLogin(provider: 'google' | 'facebook', token: string): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/oauth', { provider, token });
    if (data.data && data.data.accessToken && data.data.refreshToken) {
      await TokenStore.setTokens(data.data.accessToken, data.data.refreshToken);
    }
    return data;
  },

  async verify2Fa(userId: string, code: string): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/verify-2fa', { userId, code });
    if (data.data && data.data.accessToken && data.data.refreshToken) {
      await TokenStore.setTokens(data.data.accessToken, data.data.refreshToken);
    }
    return data;
  },

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/register', dto);
    return data;
  },

  async logout(): Promise<void> {
    await http.post('/auth/logout');
    await TokenStore.clearTokens();
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await http.get<{ success: boolean; data: { user: AuthUser } }>('/auth/me');
    return data.data.user;
  },

  async updateProfile(dto: UpdateProfileDto): Promise<AuthUser> {
    const { data } = await http.patch<{ success: boolean; data: { user: AuthUser } }>('/users/me', dto);
    return data.data.user;
  },

  async getSellerStats(): Promise<SellerStats> {
    const { data } = await http.get<{ success: boolean; data: SellerStats }>('/users/me/seller-stats');
    return data.data;
  },
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const { data } = await http.post<{ success: boolean; message: string }>('/auth/forgot-password', { email });
    return data;
  },

  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    const { data } = await http.post<{ success: boolean; message: string }>('/auth/reset-password', { token, password });
    return data;
  },

  async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    const { data } = await http.post<{ success: boolean; message: string }>('/auth/resend-verification', { email });
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const { data } = await http.post<{ success: boolean; message: string }>('/users/change-password', { currentPassword, newPassword });
    return data;
  },
  async checkIn(): Promise<{ success: boolean; data: { pointsEarned: number; streakDays: number; user: AuthUser } }> {
    const { data } = await http.post<{ success: boolean; data: { pointsEarned: number; streakDays: number; user: AuthUser } }>('/users/check-in');
    return data;
  },
  async getUserById(id: string): Promise<AuthUser> {
    const { data } = await http.get<{ success: boolean; data: AuthUser }>(`/users/${id}`);
    return data.data;
  },
};

export default authApi;
