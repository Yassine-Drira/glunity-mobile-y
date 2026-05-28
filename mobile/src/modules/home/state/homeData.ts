import type {
  GlunityEvent,
  HomeScreenProps,
  QuickAccessItem,
  Recipe,
} from "../domain/home.types";

export const homeScreenText = {
  qrSubtitle: "Instantly Check for Gluten & Find Safe Alternatives",
  tryItNow: "Try It Now",
  quickAccessTitle: "Quick Access",
  checkRecipesTitle: "Check recipes",
  checkEventsTitle: "Check Events",
  seeAll: "See All ->",
  recipesPoints: "3 GP",
} as const;

export const quickAccessItemsMock: QuickAccessItem[] = [
  {
    id: "find-products",
    label: "Find Products",
    icon: "search-outline",
    onPress: () => {},
  },
  {
    id: "community",
    label: "Community",
    icon: "people-outline",
    onPress: () => {},
  },
  {
    id: "patient-resources",
    label: "Patient Resources",
    icon: "heart-outline",
    onPress: () => {},
  },
  {
    id: "map",
    label: "Map",
    icon: "location-outline",
    onPress: () => {},
  },
];

export const recipesMock: Recipe[] = [
  {
    id: "recipe-1",
    title: "Gluten-Free Pizza",
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
    onPress: () => {},
  },
  {
    id: "recipe-2",
    title: "Protein GF Pancakes",
    imageUrl: "https://images.unsplash.com/photo-1528207776546-365bb710ee93",
    onPress: () => {},
  },
  {
    id: "recipe-3",
    title: "Healthy Quinoa Bowl",
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
    onPress: () => {},
  },
];

// Static events removed — only dynamic events from the database should be rendered.
export const eventsMock: GlunityEvent[] = [];

export const homeScreenMockProps: HomeScreenProps = {
  user: {
    name: "Yasmine",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
  },
  hasNotification: true,
  onPressScan: () => {},
  onPressSearch: () => {},
  onPressNotification: () => {},
  onPressProfilePhoto: () => {},
  quickAccessItems: quickAccessItemsMock,
  recipes: recipesMock,
  onPressRecipesSeeAll: () => {},
  events: [],
  onPressEventsSeeAll: () => {},
  onPressNavHome: () => {},
  onPressNavEvents: () => {},
  onPressNavFab: () => {},
  onPressNavReels: () => {},
  onPressNavProfile: () => {},
};
