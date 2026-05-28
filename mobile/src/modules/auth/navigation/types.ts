// ── Auth stack ────────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Splash: undefined;
  Intro: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: { email?: string } | undefined;
  ResetPassword: { token: string };   // ← arrives via deep link ?token=xxx
  EmailVerified: { success: boolean }; // ← arrives via deep link ?verified=1
};

// ── App (authenticated) stack ─────────────────────────────────────────────────
export type AppStackParamList = {
  Home: undefined;
  Recipes: undefined;
  RecipeDetail: { recipeId?: string; initialRecipe?: any };
  Profile: undefined;
  Settings: undefined;
  EditProfile: undefined;
  SellerProfile: { sellerId?: string; seller?: any } | undefined;
  AddProduct: { product?: any } | undefined;
  SellerStats: undefined;
  ProductsMarket: undefined;
  ProductDetail: { product: any };
  Map: undefined;
  Events: undefined;
  EventDetail: { eventId: string };
  SellerProProfile: undefined;
};
