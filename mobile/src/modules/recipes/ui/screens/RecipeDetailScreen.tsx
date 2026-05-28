import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useTheme } from '@/shared/context/theme.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import recipesApi, { Recipe } from '../../api/recipes.api';

type Props = NativeStackScreenProps<AppStackParamList, 'RecipeDetail'>;

const FALLBACK_RECIPE: Recipe = {
  _id: 'fallback',
  title: 'Gluten-Free Pizza',
  slug: 'gluten-free-pizza',
  category: 'tunisian',
  description: 'Healthy and delicious gluten-free recipe.',
  ingredients: [
    'Gluten-free pizza flour blend',
    'Yeast and warm water',
    'Tomato sauce',
    'Fresh mozzarella cheese',
    'Fresh basil leaves',
    'Olive oil',
  ],
  steps: [
    'Mix flour, yeast, and water to form the dough.Let the dough rise for 30 minutes.',
  ],
  nutritionInfo: { calories: 370, carbs: 35, protein: 6.8 },
  photos: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400'],
  videos: [],
  authorId: 'fallback-author',
  isFavorite: false,
  favoriteCount: 0,
};

function getRecipeImage(recipe: Recipe): string {
  if (recipe.photos && recipe.photos.length > 0 && recipe.photos[0]) {
    return recipe.photos[0];
  }
  if (recipe.title.toLowerCase().includes('pizza')) {
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400';
  }
  if (recipe.title.toLowerCase().includes('brik')) {
    return 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=400';
  }
  if (recipe.title.toLowerCase().includes('salad') || recipe.title.toLowerCase().includes('quinoa')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400';
  }
  return 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400';
}

export default function RecipeDetailScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { theme: T } = useTheme();

  const s = React.useMemo(() => StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: T.bg,
    },
    mainContainer: {
      flex: 1,
      position: 'relative',
      paddingBottom: 96,
    },
    content: {
      paddingBottom: 40,
    },
    topbar: {
      paddingHorizontal: 22,
      paddingTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatarWrap: {
      position: 'relative',
      width: 42,
      height: 42,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: T.surfaceAlt,
    },
    checkBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 15,
      height: 15,
      borderRadius: 7.5,
      backgroundColor: T.green,
      borderWidth: 1.5,
      borderColor: T.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userName: {
      fontSize: 16,
      fontWeight: '700',
      color: T.text,
      fontFamily: 'Poppins_700Bold',
    },
    topIcons: {
      flexDirection: 'row',
      gap: 16,
    },
    iconBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingTop: 16,
      gap: 12,
      marginBottom: 18,
    },
    backBtn: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 27,
      fontWeight: '700',
      color: T.text,
      fontFamily: 'Poppins_700Bold',
    },
    sectionTitle: {
      paddingHorizontal: 22,
      fontSize: 22,
      fontWeight: '700',
      color: T.text,
      fontFamily: 'Poppins_700Bold',
      marginBottom: 16,
    },
    nutritionHeroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 22,
      gap: 16,
    },
    nutritionList: {
      flex: 1,
      gap: 12,
    },
    nutritionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    nutriCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: T.green,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
      shadowColor: '#000000',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 6,
      elevation: 3,
    },
    nutriValue: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 15,
      fontFamily: 'Poppins_700Bold',
    },
    nutriPill: {
      backgroundColor: T.surface,
      borderRadius: 18,
      paddingLeft: 22,
      paddingRight: 16,
      height: 36,
      justifyContent: 'center',
      marginLeft: -14,
      zIndex: 1,
      shadowColor: 'rgba(0,0,0,0.04)',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 6,
      elevation: 2,
    },
    nutriLabel: {
      color: T.text,
      fontSize: 11,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
    },
    heroFoodContainer: {
      width: 176,
      height: 176,
      borderRadius: 88,
      overflow: 'hidden',
      backgroundColor: T.surfaceAlt,
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
      elevation: 5,
    },
    heroFoodImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    ingredientsWrap: {
      paddingHorizontal: 22,
      gap: 6,
    },
    ingredientsText: {
      fontSize: 15,
      color: T.textSub,
      lineHeight: 22,
      fontFamily: 'Poppins_400Regular',
    },
    stepsWrap: {
      paddingHorizontal: 22,
    },
    stepText: {
      fontSize: 15,
      lineHeight: 22,
      color: T.textSub,
      fontFamily: 'Poppins_400Regular',
    },
  }), [T]);

  const [recipe, setRecipe] = React.useState<Recipe>(route.params?.initialRecipe || FALLBACK_RECIPE);

  React.useEffect(() => {
    const recipeId = route.params?.recipeId;
    if (!recipeId || recipeId.startsWith('mock-')) return;

    (async () => {
      try {
        const fromApi = await recipesApi.getById(recipeId);
        setRecipe(fromApi);
      } catch {
        // Keep initial/fallback content if API request fails.
      }
    })();
  }, [route.params?.recipeId]);

  const nutritionRows = [
    { value: recipe.nutritionInfo?.calories ?? 370, label: 'Calories' },
    { value: recipe.nutritionInfo?.carbs ?? 35, label: 'Carbo' },
    { value: recipe.nutritionInfo?.protein ?? 6.8, label: 'Protein' },
  ];

  return (
    <AppScaffold
      title={recipe.title}
      activeTab="home"
      onBack={() => navigation.goBack()}
      onPressHome={() => navigation.navigate('Home')}
      onPressEvents={() => navigation.navigate('Map')}
      onPressCenter={() => {}}
      onPressReels={() => {}}
      onPressProfile={() => {
        if (user?.profileType === 'pro_commerce') {
          navigation.navigate('SellerProProfile');
        } else {
          navigation.navigate('Profile');
        }
      }}
      contentStyle={{ backgroundColor: T.bg }}
    >
      <View style={[s.mainContainer, { backgroundColor: T.bg }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          {/* Nutrition Section */}
          <Text style={[s.sectionTitle, { color: T.text }]}>Nutritions</Text>

          {/* Hero Row: Stacked circles on Left, Circular food plate on Right */}
          <View style={s.nutritionHeroRow}>
            <View style={s.nutritionList}>
              {nutritionRows.map((n) => (
                <View key={n.label} style={s.nutritionRow}>
                  <View style={s.nutriCircle}>
                    <Text style={s.nutriValue}>{n.value}</Text>
                  </View>
                  <View style={[s.nutriPill, { backgroundColor: T.surface }]}>
                    <Text style={[s.nutriLabel, { color: T.text }]}>{n.label}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={s.heroFoodContainer}>
              <Image source={{ uri: getRecipeImage(recipe) }} style={s.heroFoodImage as any} />
            </View>
          </View>

          {/* Ingredients Section */}
          <Text style={[s.sectionTitle, { color: T.text, marginTop: 24, marginBottom: 8 }]}>Ingredients</Text>
          <View style={s.ingredientsWrap}>
            {(recipe.ingredients || []).map((ing, idx) => (
              <Text key={`${idx}-${ing}`} style={[s.ingredientsText, { color: T.textSub }]}>
                • {ing}
              </Text>
            ))}
          </View>

          {/* Recipe Preparation Section */}
          <Text style={[s.sectionTitle, { color: T.text, marginTop: 24, marginBottom: 8 }]}>Recipe Preparation</Text>
          <View style={s.stepsWrap}>
            {(recipe.steps || []).map((step, idx) => (
              <Text key={`${idx}-${step}`} style={[s.stepText, { color: T.textSub }]}>
                {step}
              </Text>
            ))}
          </View>
        </ScrollView>

      </View>
    </AppScaffold>
  );
}


