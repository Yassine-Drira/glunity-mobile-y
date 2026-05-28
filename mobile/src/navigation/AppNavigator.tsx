import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../modules/auth/navigation/types';

import HomeScreen        from '../modules/home/ui/screens/HomeScreen';
import { homeScreenMockProps } from '../modules/home/state/homeData';
import { eventsApi } from '../modules/home/api/events.api';
import RecipesScreen     from '../modules/recipes/ui/screens/RecipesScreen';
import RecipeDetailScreen from '../modules/recipes/ui/screens/RecipeDetailScreen';
import { useAuth } from '../modules/auth/state/auth.context';
import ProfileScreen     from '../modules/profile/ui/screens/ProfileScreen';
import SettingsScreen    from '../modules/profile/ui/screens/SettingsScreen';
import EditProfileScreen from '../modules/profile/ui/screens/EditProfileScreen';
import SellerProfileScreen    from '../modules/seller/ui/screens/SellerProfileScreen';
import SellerProProfileScreen from '../modules/seller/ui/screens/SellerProProfileScreen';
import AddProductScreen        from '../modules/seller/ui/screens/AddProductScreen';
import SellerStatsScreen       from '../modules/seller/ui/screens/SellerStatsScreen';
import ProductsMarketScreen from '../modules/products/ui/screens/ProductsMarketScreen';
import ProductDetailScreen  from '../modules/products/ui/screens/ProductDetailScreen';
import MapScreen            from '../modules/map/ui/screens/MapScreen';
import EventsCalendarScreen from '../modules/events/ui/screens/EventsCalendarScreen';
import EventDetailScreen from '../modules/events/ui/screens/EventDetailScreen';
import AddEventScreen from '../modules/events/ui/screens/AddEventScreen';
import NotificationsScreen from '../modules/notifications/ui/screens/NotificationsScreen';
import PatientResourcesScreen from '../modules/patient-resources/ui/screens/PatientResourcesScreen';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Home">
        {({ navigation }) => {
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
              return { ...item, onPress: () => navigation.navigate('Events') };
            }
            return item;
          });

          const dynamicRecipes = homeScreenMockProps.recipes.map(recipe => ({
            ...recipe,
            onPress: () => {
              navigation.navigate('RecipeDetail', { recipeId: recipe.id, initialRecipe: recipe });
            }
          }));

          const [events, setEvents] = React.useState(homeScreenMockProps.events);

          React.useEffect(() => {
            let mounted = true;
            (async () => {
              try {
                const list = await eventsApi.list();
                if (!mounted) return;
                const withHandlers = list.map(ev => ({ ...ev, onPress: () => navigation.navigate('EventDetail', { eventId: ev.id }) }));
                setEvents(withHandlers);
              } catch (err) {
                // Keep mock events on error
              }
            })();
            return () => { mounted = false; };
          }, [navigation]);

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
              recipes={dynamicRecipes}
              events={events}
              onPressRecipesSeeAll={() => navigation.navigate('Recipes')}
              onPressEventsSeeAll={() => navigation.navigate('Events')}
              onPressProfilePhoto={handleProfileNavigation}
              onPressNavHome={() => navigation.navigate('Home')}
              onPressNavEvents={() => navigation.navigate('Events')}
              onPressNavProfile={handleProfileNavigation}
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Recipes"         component={RecipesScreen} />
      <Stack.Screen name="RecipeDetail"    component={RecipeDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Profile"         component={ProfileScreen}     options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Settings"        component={SettingsScreen} />
      <Stack.Screen name="EditProfile"     component={EditProfileScreen} />
      <Stack.Screen name="SellerProfile"      component={SellerProfileScreen} />
      <Stack.Screen name="SellerProProfile"   component={SellerProProfileScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="AddProduct"         component={AddProductScreen} />
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
              onPressNavReels={() => {}}
              onPressNavProfile={handleProfileNavigation}
              onPressProfilePhoto={handleProfileNavigation}
            />
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Events" component={EventsCalendarScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="AddEvent" component={AddEventScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="PatientResources" component={PatientResourcesScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

