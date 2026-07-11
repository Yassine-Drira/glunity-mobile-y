import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { AppStackParamList } from '../modules/auth/navigation/types';

import HomeScreen        from '../modules/home/ui/screens/HomeScreen';
import { homeScreenMockProps } from '../modules/home/state/homeData';
import { eventsApi } from '../modules/home/api/events.api';
import RecipesScreen     from '../modules/recipes/ui/screens/RecipesScreen';
import RecipeDetailScreen from '../modules/recipes/ui/screens/RecipeDetailScreen';
import recipesApi from '../modules/recipes/api/recipes.api';
import { useAuth } from '../modules/auth/state/auth.context';
import ProfileScreen     from '../modules/profile/ui/screens/ProfileScreen';
import SettingsScreen    from '../modules/profile/ui/screens/SettingsScreen';
import PrivacyScreen     from '../modules/profile/ui/screens/PrivacyScreen';
import EditProfileScreen from '../modules/profile/ui/screens/EditProfileScreen';
import EditStoreScreen from '../modules/seller/ui/screens/EditStoreScreen';
import SellerProfileScreen    from '../modules/seller/ui/screens/SellerProfileScreen';
import SellerProProfileScreen from '../modules/seller/ui/screens/SellerProProfileScreen';
import AddProductScreen        from '../modules/seller/ui/screens/AddProductScreen';
import AddRecipeScreen         from '../modules/seller/ui/screens/AddRecipeScreen';
import SellerStatsScreen       from '../modules/seller/ui/screens/SellerStatsScreen';
import ProductsMarketScreen from '../modules/products/ui/screens/ProductsMarketScreen';
import ProductDetailScreen  from '../modules/products/ui/screens/ProductDetailScreen';
import MapScreen            from '../modules/map/ui/screens/MapScreen';
import EventsCalendarScreen from '../modules/events/ui/screens/EventsCalendarScreen';
import EventDetailScreen from '../modules/events/ui/screens/EventDetailScreen';
import AddEventScreen from '../modules/events/ui/screens/AddEventScreen';
import NotificationsScreen from '../modules/notifications/ui/screens/NotificationsScreen';
import PatientResourcesScreen from '../modules/patient-resources/ui/screens/PatientResourcesScreen';
import CommunityJoinScreen from '../modules/community/ui/screens/CommunityJoinScreen';
import CommunityJoin from '../modules/community/ui/screens/CommunityJoin';
import CommunityChatScreen from '../modules/community/ui/screens/CommunityChatScreen';
import MessagingHome from '../modules/community/ui/screens/MessagingHome';
import CreateGroupScreen from '../modules/community/ui/screens/CreateGroupScreen';
import CreateChannelScreen from '../modules/community/ui/screens/CreateChannelScreen';
import CommunityMembersList from '../modules/community/ui/screens/CommunityMembersList';
import ChannelMembersScreen from '../modules/community/ui/screens/ChannelMembersScreen';
import ReelsFeedScreen from '../modules/reels/ui/screens/ReelsFeedScreen';
import CaptureScreen from '../modules/reels/ui/screens/CaptureScreen';
import EditScreen from '../modules/reels/ui/screens/EditScreen';
import ShareScreen from '../modules/reels/ui/screens/ShareScreen';
import AddCoverScreen from '../modules/reels/ui/screens/AddCoverScreen';

const Stack = createNativeStackNavigator<AppStackParamList>();

function HomeScreenContainer() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const displayUser = user ? {
    name: user.fullName || homeScreenMockProps.user.name,
    avatarUrl: user.avatarUrl || homeScreenMockProps.user.avatarUrl,
  } : homeScreenMockProps.user;

  const dynamicQuickAccessItems = homeScreenMockProps.quickAccessItems.map(item => {
    if (item.id === 'find-products') {
      return { ...item, onPress: () => navigation.navigate('ProductsMarket') };
    }
    if (item.id === 'map') {
      return { ...item, onPress: () => navigation.navigate('Map') };
    }
    if (item.id === 'patient-resources') {
      return { ...item, onPress: () => navigation.navigate('PatientResources') };
    }
    if (item.id === 'community') {
      return { ...item, onPress: () => navigation.navigate('Community') };
    }
    return item;
  });

  const [recipes, setRecipes] = React.useState<any[]>([]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Limit to exactly 3 recipes on the Home screen
        const res = await recipesApi.list({ limit: 3 });
        if (!mounted) return;
        const withHandlers = res.items.map(recipe => ({
          id: recipe._id,
          title: recipe.title,
          imageUrl: (recipe.photos && recipe.photos.length > 0 && recipe.photos[0]) || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400',
          onPress: () => {
            navigation.navigate('RecipeDetail', { recipeId: recipe._id, initialRecipe: recipe });
          }
        }));
        setRecipes(withHandlers);
      } catch (err) {
        // Keep empty on error
      }
    })();
    return () => { mounted = false; };
  }, []);

  const [events, setEvents] = React.useState(homeScreenMockProps.events);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { items: list } = await eventsApi.list();
        if (!mounted) return;
        const withHandlers = list.map(ev => ({ ...ev, onPress: () => navigation.navigate('EventDetail', { eventId: ev.id }) }));
        setEvents(withHandlers);
      } catch (err) {
        // Keep mock events on error
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleProfileNavigation = () => {
    if (user?.profileType === 'pro_commerce') {
      navigation.navigate('SellerProProfile');
    } else {
      navigation.navigate('Profile');
    }
  };

  return (
    <HomeScreen
      {...homeScreenMockProps}
      user={displayUser}
      quickAccessItems={dynamicQuickAccessItems}
      recipes={recipes}
      events={events}
      onPressRecipesSeeAll={() => navigation.navigate('Recipes')}
      onPressEventsSeeAll={() => navigation.navigate('Events')}
      onPressProfilePhoto={handleProfileNavigation}
      onPressNotification={() => navigation.navigate('Notifications')}
      onPressNavHome={() => navigation.navigate('Home')}
      onPressNavEvents={() => navigation.navigate('Events')}
      onPressNavReels={() => navigation.navigate('ReelsFeed')}
      onPressNavProfile={handleProfileNavigation}
    />
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Home" component={HomeScreenContainer} />
      <Stack.Screen name="Recipes"         component={RecipesScreen} />
      <Stack.Screen name="RecipeDetail"    component={RecipeDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Profile"         component={ProfileScreen}     options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Settings"        component={SettingsScreen} />
      <Stack.Screen name="Privacy"         component={PrivacyScreen}     options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="EditProfile"     component={EditProfileScreen} />
      <Stack.Screen name="EditStore"       component={EditStoreScreen} />
      <Stack.Screen name="SellerProfile"      component={SellerProfileScreen} />
      <Stack.Screen name="SellerProProfile"   component={SellerProProfileScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="AddProduct"         component={AddProductScreen} />
      <Stack.Screen name="AddRecipe"          component={AddRecipeScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="SellerStats"        component={SellerStatsScreen} />
      <Stack.Screen name="ProductsMarket"  component={ProductsMarketScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ProductDetail"   component={ProductDetailScreen}  options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Map">
        {({ navigation }) => {
          const { user } = useAuth();
          const handleProfileNavigation = () => {
            if (user?.profileType === 'pro_commerce') {
              navigation.navigate('SellerProProfile');
            } else {
              navigation.navigate('Profile');
            }
          };

          return (
            <MapScreen
              userName={user?.fullName || 'Guest'}
              userAvatarUri={user?.avatarUrl || null}
              onPressNavHome={() => navigation.navigate('Home')}
              onPressNavEvents={() => navigation.navigate('Events')}
              onPressNavReels={() => navigation.navigate('ReelsFeed')}
              onPressNavProfile={handleProfileNavigation}
              onPressProfilePhoto={handleProfileNavigation}
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Events" component={EventsCalendarScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Community" component={CommunityJoinScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CommunityJoin" component={CommunityJoin} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="MessagingHome" component={MessagingHome} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CreateChannel" component={CreateChannelScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CommunityChat" component={CommunityChatScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CommunityMembers" component={CommunityMembersList} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ChannelMembers" component={ChannelMembersScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="AddEvent" component={AddEventScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="PatientResources" component={PatientResourcesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ReelsFeed" component={ReelsFeedScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ReelCapture" component={CaptureScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ReelEdit" component={EditScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ReelShare" component={ShareScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ReelAddCover" component={AddCoverScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

