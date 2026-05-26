import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../modules/auth/navigation/types';

import HomeScreen        from '../modules/home/ui/screens/HomeScreen';
import { homeScreenMockProps } from '../modules/home/state/homeData';
import RecipesScreen     from '../modules/recipes/ui/screens/RecipesScreen';
import RecipeDetailScreen from '../modules/recipes/ui/screens/RecipeDetailScreen';
import { useAuth } from '../modules/auth/state/auth.context';
import ProfileScreen     from '../modules/profile/ui/screens/ProfileScreen';
import SettingsScreen    from '../modules/profile/ui/screens/SettingsScreen';
import EditProfileScreen from '../modules/profile/ui/screens/EditProfileScreen';
import SellerProfileScreen from '../modules/seller/ui/screens/SellerProfileScreen';
import AddProductScreen   from '../modules/seller/ui/screens/AddProductScreen';
import SellerStatsScreen  from '../modules/seller/ui/screens/SellerStatsScreen';
import ProductsMarketScreen from '../modules/products/ui/screens/ProductsMarketScreen';
import ProductDetailScreen  from '../modules/products/ui/screens/ProductDetailScreen';

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
              return {
                ...item,
                onPress: () => {
                  navigation.navigate('ProductsMarket');
                }
              };
            }
            return item;
          });

          const dynamicRecipes = homeScreenMockProps.recipes.map(recipe => ({
            ...recipe,
            onPress: () => {
              navigation.navigate('RecipeDetail', { recipeId: recipe.id, initialRecipe: recipe });
            }
          }));

          const handleProfileNavigation = () => {
            if (user?.profileType === 'pro_commerce') {
              navigation.navigate('SellerProfile');
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
              onPressRecipesSeeAll={() => navigation.navigate('Recipes')}
              onPressProfilePhoto={handleProfileNavigation}
              onPressNavHome={() => navigation.navigate('Home')}
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
      <Stack.Screen name="SellerProfile"   component={SellerProfileScreen} />
      <Stack.Screen name="AddProduct"      component={AddProductScreen} />
      <Stack.Screen name="SellerStats"     component={SellerStatsScreen} />
      <Stack.Screen name="ProductsMarket"  component={ProductsMarketScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ProductDetail"   component={ProductDetailScreen}  options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

