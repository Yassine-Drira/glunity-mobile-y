import http from '@/core/network/http.client';

export type RecipeCategory = 'tunisian' | 'easy' | 'quick';

export interface Recipe {
  _id: string;
  title: string;
  slug: string;
  category: RecipeCategory;
  description: string;
  ingredients: string[];
  steps: string[];
  nutritionInfo: {
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    servingSize?: string;
  };
  photos: string[];
  videos: string[];
  authorId: string;
  isFavorite: boolean;
  favoriteCount: number;
}

export interface RecipesListResponse {
  success: boolean;
  data: {
    items: Recipe[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

const recipesApi = {
  async list(params?: { category?: RecipeCategory; search?: string; page?: number; limit?: number }) {
    const { data } = await http.get<RecipesListResponse>('/recipes', { params });
    return data.data.items;
  },

  async getById(recipeId: string) {
    const { data } = await http.get<{ success: boolean; data: { recipe: Recipe } }>(`/recipes/${recipeId}`);
    return data.data.recipe;
  },

  async setFavorite(recipeId: string, isFavorite: boolean) {
    const { data } = await http.patch<{ success: boolean; data: { recipe: Recipe } }>(
      `/recipes/${recipeId}/favorite`,
      { isFavorite },
    );
    return data.data.recipe;
  },
};

export default recipesApi;
