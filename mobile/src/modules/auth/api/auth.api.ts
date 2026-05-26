import http from '../../../core/network/http.client';
import { TokenStore } from '../../../core/storage/secure-store';

export interface LoginDto {
  email: string;
  password: string;
}

export type RegisterProfileType = 'celiac' | 'proche' | 'pro_commerce' | 'pro_health';

export interface RegisterDto {
  fullName: string;
  email: string;
  password: string;
  profileType: RegisterProfileType;
  language?: string;
}

export interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  bio?: string;
  profileType: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  streakDays: number;
  language: string;
  darkMode: boolean;
}

export interface UpdateProfileDto {
  fullName?: string;
  phone?: string;
  bio?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

const authApi = {
  async login(dto: LoginDto): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/login', dto);
    await TokenStore.setTokens(data.data.accessToken, data.data.refreshToken);
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
};

export default authApi;
