import { AxiosRequestConfig } from 'axios';
import http from '../../../core/network/http.client';

export interface ReelAuthor {
	id: string;
	fullName: string;
	avatarUrl?: string;
	profileType?: string;
}

export interface Reel {
	id: string;
	author: ReelAuthor;
	videoUrl: string;
	thumbnailUrl: string;
	caption: string;
	duration: number;
	viewsCount: number;
	likesCount: number;
	commentsCount: number;
	sharesCount: number;
	isLiked: boolean;
	status: 'processing' | 'ready' | 'failed';
	category: 'all' | 'recipes' | 'tips' | 'products' | 'lifestyle';
	channelRef?: string;
	createdAt: string;
	audioTitle?: string | null;
	audioArtist?: string | null;
	audioUrl?: string | null;
}

export interface ReelComment {
	id: string;
	reelId: string;
	author: ReelAuthor;
	text: string;
	createdAt: string;
}

export interface UploadSignatureResponse {
	isLocalFallback: boolean;
	signature?: string;
	timestamp?: number;
	folder?: string;
	eager?: string;
	apiKey?: string;
	cloudName?: string;
}

export const ReelsService = {
	async getFeed(page: number, limit = 10, category = 'all', config?: AxiosRequestConfig): Promise<{ success: boolean; data: Reel[] }> {
		const response = await http.get<{ success: boolean; data: Reel[] }>(`/reels?page=${page}&limit=${limit}&category=${category}`, config);
		return response.data;
	},

	async toggleLike(reelId: string): Promise<{ success: boolean; data: { liked: boolean; likesCount: number } }> {
		const response = await http.post<{ success: boolean; data: { liked: boolean; likesCount: number } }>(`/reels/${reelId}/like`, {});
		return response.data;
	},

	async recordView(reelId: string): Promise<{ success: boolean }> {
		const response = await http.post<{ success: boolean }>(`/reels/${reelId}/view`, {}, { timeout: 20000 });
		return response.data;
	},

	async recordShare(reelId: string): Promise<{ success: boolean; data: { sharesCount: number } }> {
		const response = await http.post<{ success: boolean; data: { sharesCount: number } }>(`/reels/${reelId}/share`, {});
		return response.data;
	},

	async getUploadSignature(): Promise<{ success: boolean; data: UploadSignatureResponse }> {
		const response = await http.get<{ success: boolean; data: UploadSignatureResponse }>('/reels/signature');
		return response.data;
	},

	async uploadVideoLocal(formData: FormData): Promise<{ success: boolean; data: { videoUrl: string; thumbnailUrl: string; duration: number } }> {
		const response = await http.post<{ success: boolean; data: { videoUrl: string; thumbnailUrl: string; duration: number } }>(
			'/reels/upload',
			formData,
			{
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			}
		);
		return response.data;
	},

	async createReel(payload: { 
		videoUrl: string; 
		thumbnailUrl: string; 
		caption: string; 
		duration: number; 
		category?: string;
		audioTitle?: string | null;
		audioArtist?: string | null;
		audioUrl?: string | null;
	}): Promise<{ success: boolean; data: Reel }> {
		const response = await http.post<{ success: boolean; data: Reel }>('/reels', payload);
		return response.data;
	},

	async getComments(reelId: string, page = 0, limit = 50): Promise<{ success: boolean; data: ReelComment[] }> {
		const response = await http.get<{ success: boolean; data: ReelComment[] }>(`/reels/${reelId}/comments?page=${page}&limit=${limit}`);
		return response.data;
	},

	async postComment(reelId: string, text: string): Promise<{ success: boolean; data: ReelComment }> {
		const response = await http.post<{ success: boolean; data: ReelComment }>(`/reels/${reelId}/comments`, { text });
		return response.data;
	},

	async getUserReels(authorId: string, page = 0, limit = 50): Promise<{ success: boolean; data: Reel[] }> {
		const response = await http.get<{ success: boolean; data: Reel[] }>(`/reels?authorId=${authorId}&page=${page}&limit=${limit}`);
		return response.data;
	},

	async updateReel(reelId: string, payload: { caption?: string; category?: string; audioTitle?: string | null; audioArtist?: string | null }): Promise<{ success: boolean; data: Reel }> {
		const response = await http.put<{ success: boolean; data: Reel }>(`/reels/${reelId}`, payload);
		return response.data;
	},

	async deleteReel(reelId: string): Promise<{ success: boolean }> {
		const response = await http.delete<{ success: boolean }>(`/reels/${reelId}`);
		return response.data;
	}
};
