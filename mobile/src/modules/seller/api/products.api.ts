import http from '../../../core/network/http.client';

export interface ProductDto {
  name: string;
  category: string;
  price: number;
  isGlutenFree: boolean;
  certifiedGF: boolean;
  ingredients: string[];
  images: string[];
  description?: string;
}

export interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  isGlutenFree: boolean;
  certifiedGF: boolean;
  ingredients: string[];
  images: string[];
  sellerId: string | { _id: string; fullName: string };
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListProductsResponse {
  success: boolean;
  data: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

const productsApi = {
  async list(params?: { sellerId?: string; category?: string; search?: string; page?: number; limit?: number }): Promise<ListProductsResponse> {
    const { data } = await http.get<ListProductsResponse>('/products', { params });
    return data;
  },

  async getById(id: string): Promise<{ success: boolean; data: Product }> {
    const { data } = await http.get<{ success: boolean; data: Product }>(`/products/${id}`);
    return data;
  },

  async create(dto: ProductDto): Promise<{ success: boolean; data: Product }> {
    const { data } = await http.post<{ success: boolean; data: Product }>('/products', dto);
    return data;
  },

  async update(id: string, dto: Partial<ProductDto>): Promise<{ success: boolean; data: Product }> {
    const { data } = await http.patch<{ success: boolean; data: Product }>(`/products/${id}`, dto);
    return data;
  },

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await http.delete<{ success: boolean; message: string }>(`/products/${id}`);
    return data;
  },

  /** Fire-and-forget: increment view counter for a product */
  async trackView(id: string): Promise<void> {
    await http.post(`/products/${id}/view`);
  },
};

export default productsApi;
