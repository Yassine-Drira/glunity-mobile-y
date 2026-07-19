import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export interface QuickAccessItem {
  id: string;
  label: string;
  icon: IoniconName;
  onPress: () => void;
}

export interface Recipe {
  id: string;
  title: string;
  imageUrl: string;
  onPress: () => void;
}

export interface GlunityEvent {
  id: string;
  title: string;
  imageUrl: string;
  location: string | { name?: string; address?: string };
  date: string;
  onPress: () => void;
  // optional extended fields from API
  type?: string;
  description?: string;
  startsAt?: string | null;
  attendeesCount?: number;
  attendees?: string[];
  locationLat?: number;
  locationLng?: number;
  maxCapacity?: number;
  price?: number;
  currency?: string;
  isCancelled?: boolean;
  status?: string;
  ownerId?: string;
  createdBy?: string;
  pendingRequestsCount?: number;
}

export interface HomeScreenProps {
  user: {
    name: string;
    avatarUrl: string;
  };
  hasNotification?: boolean;
  onPressScan: () => void;
  onPressSearch: () => void;
  onPressNotification: () => void;
  onPressProfilePhoto?: () => void;
  quickAccessItems: QuickAccessItem[];
  recipes: Recipe[];
  onPressRecipesSeeAll: () => void;
  events: GlunityEvent[];
  onPressEventsSeeAll: () => void;
  onPressNavHome?: () => void;
  onPressNavEvents?: () => void;
  onPressNavFab?: () => void;
  onPressNavReels?: () => void;
  onPressNavProfile?: () => void;
}
