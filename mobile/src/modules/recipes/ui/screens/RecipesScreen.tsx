import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/navigation/types';
import { Colors, Font } from '@/shared/utils/theme';
import { useAuth } from '@/modules/auth/state/auth.context';
import recipesApi, { Recipe, RecipeCategory } from '../../api/recipes.api';

type Props = NativeStackScreenProps<AppStackParamList, 'Recipes'>;

const FILTERS: Array<{ key: RecipeCategory; label: string }> = [
  { key: 'tunisian', label: 'Tunisian' },
  { key: 'easy', label: 'Easy' },
  { key: 'quick', label: 'Quick' },
];

const MOCK_RECIPES: Recipe[] = [
  {
    _id: 'mock-1',
    title: 'Gluten-Free Pizza',
    slug: 'gluten-free-pizza',
    category: 'tunisian',
    description: 'Homemade GF crust topped with mozzarella and basil.',
    ingredients: ['Gluten-free flour', 'Tomato sauce', 'Mozzarella', 'Basil'],
    steps: ['Prepare dough', 'Add toppings', 'Bake at 220C'],
    nutritionInfo: { calories: 370, carbs: 35, protein: 6.8 },
    photos: [],
    videos: [],
    authorId: 'mock-author',
    isFavorite: false,
    favoriteCount: 0,
  },
  {
    _id: 'mock-2',
    title: 'Tunisian Brik',
    slug: 'tunisian-brik',
    category: 'easy',
    description: 'Crispy gluten-free pastry with tuna and egg.',
    ingredients: ['GF pastry sheet', 'Egg', 'Tuna', 'Parsley'],
    steps: ['Fill pastry', 'Fold', 'Fry until golden'],
    nutritionInfo: { calories: 290, carbs: 22, protein: 12 },
    photos: [],
    videos: [],
    authorId: 'mock-author',
    isFavorite: false,
    favoriteCount: 0,
  },
  {
    _id: 'mock-3',
    title: 'Quinoa Salad',
    slug: 'quinoa-salad',
    category: 'quick',
    description: 'Fresh quinoa salad with lemon dressing.',
    ingredients: ['Quinoa', 'Tomato', 'Cucumber', 'Lemon'],
    steps: ['Cook quinoa', 'Mix ingredients', 'Season'],
    nutritionInfo: { calories: 240, carbs: 28, protein: 8.5 },
    photos: [],
    videos: [],
    authorId: 'mock-author',
    isFavorite: false,
    favoriteCount: 0,
  },
];

export default function RecipesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<RecipeCategory>('tunisian');
  const [items, setItems] = useState<Recipe[]>([]);
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const fromApi = await recipesApi.list({ limit: 30 });
        setItems(fromApi);
      } catch {
        setItems(MOCK_RECIPES);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const source = loaded ? items : MOCK_RECIPES;
    return source.filter((r) => r.category === activeCategory);
  }, [activeCategory, items, loaded]);

  const popular = useMemo(() => {
    const source = loaded ? items : MOCK_RECIPES;
    return source.slice(0, 3);
  }, [items, loaded]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.topbar}>
          <View style={s.userInfo}>
            <View style={s.avatar}><Text style={s.avatarText}>{(user?.fullName || 'U').slice(0, 1)}</Text></View>
            <Text style={s.userName}>{user?.fullName?.split(' ')[0] || 'User'}</Text>
          </View>
          <View style={s.topIcons}>
            <TouchableOpacity style={s.iconBtn}><Feather name="search" size={18} color={Colors.dark} /></TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}><Feather name="bell" size={18} color={Colors.dark} /></TouchableOpacity>
          </View>
        </View>

        <Text style={s.heroTitle}>Gluten-Free Recipes</Text>
        <Text style={s.heroSub}>Healthy and nutritious food recipes</Text>

        <View style={s.filters}>
          {FILTERS.map((f) => {
            const active = f.key === activeCategory;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setActiveCategory(f.key)}
                activeOpacity={0.85}
                style={[s.filterPill, active ? s.filterPillActive : s.filterPillIdle]}
              >
                {active && <Feather name="clock" size={14} color={Colors.white} style={{ marginRight: 6 }} />}
                <Text style={[s.filterText, active && s.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          horizontal
          data={filtered}
          keyExtractor={(item) => item._id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.cardsRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.recipeCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('RecipeDetail', { recipeId: item._id, initialRecipe: item })}
            >
              <View style={s.recipeHero}>
                <MaterialCommunityIcons name="food" size={58} color="#6AA332" />
              </View>
              <View style={s.recipeBody}>
                <Text style={s.recipeName}>{item.title}</Text>
                <Text style={s.recipeDesc} numberOfLines={2}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          )}
        />

        <View style={s.popularHeaderRow}>
          <MaterialCommunityIcons name="chef-hat" size={22} color={Colors.green} />
          <Text style={s.popularTitle}>Popular <Text style={{ color: Colors.green }}>recipes</Text></Text>
        </View>

        {popular.map((item) => (
          <TouchableOpacity
            key={`pop-${item._id}`}
            style={s.popCard}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('RecipeDetail', { recipeId: item._id, initialRecipe: item })}
          >
            <View style={s.popImg}><MaterialCommunityIcons name="silverware-fork-knife" size={38} color="#6AA332" /></View>
            <View style={s.popInfo}>
              <Text style={s.popName}>{item.title}</Text>
              <Text style={s.popDesc} numberOfLines={2}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F5F3' },
  content: { paddingBottom: 30 },

  topbar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontWeight: Font.bold },
  userName: { marginLeft: 8, fontSize: 18, fontWeight: Font.medium, color: '#343831' },
  topIcons: { flexDirection: 'row', gap: 10 },
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

  heroTitle: {
    paddingHorizontal: 22,
    marginTop: 16,
    fontSize: 25,
    lineHeight: 38,
    color: '#2E2E2E',
    fontWeight: Font.bold,
  },
  heroSub: {
    paddingHorizontal: 22,
    marginTop: 4,
    fontSize: 14,
    color: '#C8102E',
    fontWeight: Font.medium,
  },

  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 16,
    gap: 10,
  },
  filterPill: {
    height: 41,
    borderRadius: 30,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: Colors.green,
  },
  filterPillIdle: {
    backgroundColor: Colors.white,
  },
  filterText: { fontSize: 15, color: '#2E2E2E', fontWeight: Font.medium },
  filterTextActive: { color: Colors.white },

  cardsRow: { gap: 11, paddingHorizontal: 15, paddingTop: 16 },
  recipeCard: {
    width: 180,
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  recipeHero: {
    height: 160,
    backgroundColor: '#e8f5d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeBody: { paddingHorizontal: 10, paddingBottom: 14, paddingTop: 8 },
  recipeName: { color: '#C8102E', fontSize: 15, fontWeight: Font.bold },
  recipeDesc: { marginTop: 4, color: 'rgba(46,46,46,0.7)', fontSize: 11, lineHeight: 16 },

  popularHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 10,
  },
  popularTitle: {
    fontSize: 20,
    fontWeight: Font.bold,
    color: '#2E2E2E',
  },
  popCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Colors.white,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 126,
  },
  popImg: {
    width: 145,
    backgroundColor: '#EAF5D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popInfo: { paddingHorizontal: 14, paddingVertical: 18, flex: 1 },
  popName: { color: '#C8102E', fontSize: 15, fontWeight: Font.bold },
  popDesc: { marginTop: 4, color: 'rgba(46,46,46,0.7)', fontSize: 11, lineHeight: 16 },
});
