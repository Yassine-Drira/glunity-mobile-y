// ── Auth stack ────────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Splash:         undefined;
  Intro:          undefined;
  Welcome:        undefined;
  Login:          { successMessage?: string } | undefined;
  RegisterMethods: undefined;
  Register:       { oauthSignupToken?: string; prefill?: { email: string; fullName: string } } | undefined;
  ForgotPassword: { email?: string } | undefined;
  ResetPassword:  { token: string };
  EmailVerified:  { success: boolean };
};

// ── App (authenticated) stack ─────────────────────────────────────────────────
export type AppStackParamList = {
  Home:            undefined;
  Map:             { latitude?: number; longitude?: number; title?: string; address?: string; fromViewOnMap?: boolean } | undefined;
  Recipes:         undefined;
  RecipeDetail:    { recipeId?: string; initialRecipe?: any };
  Profile:         { userId?: string } | undefined;
  Settings:        undefined;
  EditProfile:     undefined;
  EditStore:       { lang?: string } | undefined;
  /** Pass sellerId when visiting another seller's profile */
  SellerProfile:   { sellerId?: string } | undefined;
  SellerProProfile: undefined;
  AddProduct:      { product?: any } | undefined;
  AddRecipe:       { recipe?: any } | undefined;
  SellerStats:     undefined;
  ProductDetail:   { product?: any; productId?: string };
  ProductsMarket:  { sellerId?: string } | undefined;
  Events:          undefined;
  EventDetail:     { eventId: string };
  AddEvent:        undefined;
  Notifications:   undefined;
  PatientResources: undefined;
  Privacy:         undefined;
  Community:       undefined;
  CommunityJoin:   undefined;
  CommunityMembers: { channelId: string };
  ChannelMembers:   { channelId: string };
  MessagingHome:   undefined;
  CommunityChat:   { channelId?: string; initialChannel?: any } | undefined;
  CreateGroup:     undefined;
  CreateChannel:   undefined;
  ReelsFeed:       { refresh?: boolean; autoOpenReelId?: string } | undefined;
  ReelCapture:     undefined;
  ReelEdit:        undefined;
  ReelShare:       undefined;
  ReelAddCover:    undefined;
  EventRegistrationRequests: { eventId: string; title: string };
  ViewRegistrationForm: { eventId: string; registrationId: string };
};

