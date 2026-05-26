// ── Auth stack ────────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Splash:         undefined;
  Intro:          undefined;
  Welcome:        undefined;
  Login:          { successMessage?: string } | undefined;
  Register:       undefined;
  ForgotPassword: { email?: string } | undefined;
  ResetPassword:  { token: string };   // ← arrives via deep link ?token=xxx
  EmailVerified:  { success: boolean }; // ← arrives via deep link ?verified=1
};

// ── App (authenticated) stack ─────────────────────────────────────────────────
export type AppStackParamList = {
  Home:          undefined;
  Recipes:       undefined;
  RecipeDetail:  { recipeId?: string; initialRecipe?: any };
  Map:           undefined;
  Profile:       undefined;
  Settings:      undefined;
  EditProfile:   undefined;
  SellerProfile: undefined;
  AddProduct:    { product?: any } | undefined;
  SellerStats:   undefined;
};
