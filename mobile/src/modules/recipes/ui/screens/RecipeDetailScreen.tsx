import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/navigation/types';
import { Colors, Font } from '@/shared/utils/theme';
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
    'Mix flour, yeast, and water to form the dough.',
    'Let the dough rise for 30 minutes.',
    'Spread tomato sauce and add mozzarella.',
    'Bake until crust is golden and cheese melts.',
  ],
  nutritionInfo: { calories: 370, carbs: 35, protein: 6.8 },
  photos: [],
  videos: [],
  authorId: 'fallback-author',
  isFavorite: false,
  favoriteCount: 0,
};

export default function RecipeDetailScreen({ navigation, route }: Props) {
  const [recipe, setRecipe] = React.useState<Recipe>(route.params?.initialRecipe || FALLBACK_RECIPE);

  React.useEffect(() => {
    const recipeId = route.params?.recipeId;
    if (!recipeId) return;

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
    { value: recipe.nutritionInfo.calories ?? 0, label: 'Calories' },
    { value: recipe.nutritionInfo.carbs ?? 0, label: 'Carbo' },
    { value: recipe.nutritionInfo.protein ?? 0, label: 'Protein' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.topbar}>
          <View style={s.userRow}>
            <View style={s.avatar}><Text style={s.avatarText}>Y</Text></View>
            <Text style={s.greeting}>Yassmine</Text>
          </View>
          <View style={s.topIcons}>
            <TouchableOpacity style={s.iconBtn}><Feather name="search" size={18} color={Colors.dark} /></TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}><Feather name="bell" size={18} color={Colors.dark} /></TouchableOpacity>
          </View>
        </View>

        <View style={s.backRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={22} color={Colors.dark} />
          </TouchableOpacity>
        </View>

        <Text style={s.title}>{recipe.title}</Text>

        <View style={s.nutritionHeader}>
          <Text style={s.sectionTitle}>Nutritions</Text>
        </View>
        <View style={s.nutritionHeroRow}>
          <View style={s.nutritionList}>
            {nutritionRows.map((n) => (
              <View key={n.label} style={s.nutritionRow}>
                <View style={s.nutriCircle}><Text style={s.nutriValue}>{n.value}</Text></View>
                <View style={s.nutriBar}>
                  <Text style={s.nutriLabel}>{n.label}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={s.heroFood}>
            <MaterialCommunityIcons name="food" size={120} color="#6AA332" />
          </View>
        </View>

        <View style={s.sectionHeaderRow}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={22} color={Colors.green} />
          <Text style={s.sectionTitle}>Ingredients</Text>
        </View>
        <View style={s.ingredientsWrap}>
          {recipe.ingredients.map((ing, idx) => (
            <Text key={`${idx}-${ing}`} style={s.ingredientsText}>• {ing}</Text>
          ))}
        </View>

        <View style={s.sectionHeaderRow}>
          <MaterialCommunityIcons name="chef-hat" size={22} color={Colors.green} />
          <Text style={s.sectionTitle}>Recipe Preparation</Text>
        </View>
        <View style={s.stepsWrap}>
          {recipe.steps.map((step, idx) => (
            <Text key={`${idx}-${step}`} style={s.stepText}>{idx + 1}. {step}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F5F3' },
  content: { paddingBottom: 34 },

  topbar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontWeight: Font.bold },
  greeting: { fontSize: 18, fontWeight: Font.medium, color: '#343831' },
  topIcons: { flexDirection: 'row', gap: 12 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F6F5F3',
    borderWidth: 1,
    borderColor: '#E8E6E0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backRow: { paddingHorizontal: 22, paddingTop: 12 },
  backBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },

  title: {
    paddingHorizontal: 22,
    paddingTop: 8,
    fontSize: 25,
    fontWeight: Font.bold,
    color: '#2E2E2E',
  },
  nutritionHeader: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 6,
  },
  nutritionHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  heroFood: {
    width: 128,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 8,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 6,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 25,
    lineHeight: 30,
    color: '#2E2E2E',
    fontWeight: Font.bold,
  },

  nutritionList: { flex: 1, gap: 8 },
  nutritionRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  nutriCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  nutriValue: { color: Colors.white, fontWeight: Font.bold, fontSize: 18 },
  nutriBar: {
    flex: 1,
    maxWidth: 140,
    height: 24,
    borderRadius: 70,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  nutriLabel: { color: '#2E2E2E', fontSize: 14, fontWeight: Font.bold },

  ingredientsWrap: { paddingHorizontal: 20, paddingTop: 4, gap: 2 },
  ingredientsText: {
    fontSize: 17,
    color: 'rgba(46,46,46,0.7)',
    lineHeight: 26,
  },

  stepsWrap: { paddingHorizontal: 20, paddingTop: 6, gap: 8 },
  stepText: {
    fontSize: 17,
    lineHeight: 26,
    color: '#2E2E2E',
  },
});
