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
  Image,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { Colors, Font } from '@/shared/utils/theme';
import { useAuth } from '@/modules/auth/state/auth.context';
import { BottomNavBar } from '@/shared/components/BottomNavBar';
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
    description: 'Homemade GF crust topped with fresh mozzarella and basil.',
    ingredients: ['Gluten-free flour', 'Tomato sauce', 'Mozzarella', 'Basil'],
    steps: ['Prepare dough', 'Add toppings', 'Bake at 220C'],
    nutritionInfo: { calories: 370, carbs: 35, protein: 6.8 },
    photos: ['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400'],
    videos: [],
    authorId: 'mock-author',
    isFavorite: false,
    favoriteCount: 0,
  },
  {
    _id: 'mock-2',
    title: 'Tunisian Brik',
    slug: 'tunisian-brik',
    category: 'tunisian',
    description: 'Crispy gluten-free pastry filled with egg, tuna, and parsley.',
    ingredients: ['GF pastry sheet', 'Egg', 'Tuna', 'Parsley'],
    steps: ['Fill pastry', 'Fold', 'Fry until golden'],
    nutritionInfo: { calories: 290, carbs: 22, protein: 12 },
    photos: ['https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=400'],
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
    description: 'Refreshing salad with quinoa, cucumber, tomatoes, and lemon dressing.',
    ingredients: ['Quinoa', 'Tomato', 'Cucumber', 'Lemon'],
    steps: ['Cook quinoa', 'Mix ingredients', 'Season'],
    nutritionInfo: { calories: 240, carbs: 28, protein: 8.5 },
    photos: ['https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400'],
    videos: [],
    authorId: 'mock-author',
    isFavorite: false,
    favoriteCount: 0,
  },
];

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
    const source = loaded && items.length > 0 ? items : MOCK_RECIPES;
    return source.filter((r) => r.category === activeCategory);
  }, [activeCategory, items, loaded]);

  const popular = useMemo(() => {
    const source = loaded && items.length > 0 ? items : MOCK_RECIPES;
    // Find quinoa salad or get the third item
    const salad = source.find(r => r.title.toLowerCase().includes('salad') || r.title.toLowerCase().includes('quinoa'));
    return salad ? [salad] : source.slice(2, 3);
  }, [items, loaded]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F5F3" />

      <View style={s.mainContainer}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          {/* Header Row */}
          <View style={s.topbar}>
            <View style={s.userInfo}>
              <View style={s.avatarWrap}>
                <Image
                  source={{ uri: user?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' }}
                  style={s.avatar}
                />
                <View style={s.checkBadge}>
                  <Feather name="check" size={8} color="#FFFFFF" />
                </View>
              </View>
              <Text style={s.userName}>{user?.fullName?.split(' ')[0] || 'Yassmine'}</Text>
            </View>
            <View style={s.topIcons}>
              <TouchableOpacity activeOpacity={0.8} style={s.iconBtn}>
                <Feather name="search" size={20} color="#2E2E2E" />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} style={s.iconBtn}>
                <Feather name="bell" size={20} color="#2E2E2E" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Heading */}
          <Text style={s.heroTitle}>Gluten-Free Recipes</Text>
          <Text style={s.heroSub}>Healthy and nutritious food recipes</Text>

          {/* Filter Tabs */}
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
                  {active && (
                    <MaterialCommunityIcons
                      name="bowl-mix-outline"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text style={[s.filterText, active ? s.filterTextActive : s.filterTextIdle]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Recipe Cards List */}
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
                <View style={s.recipeImageContainer}>
                  <Image source={{ uri: getRecipeImage(item) }} style={s.recipeImage} />
                </View>
                <View style={s.recipeBody}>
                  <Text style={s.recipeName} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.recipeDesc} numberOfLines={2}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            )}
          />

          {/* Popular Section */}
          <View style={s.popularHeaderRow}>
            <Text style={s.popularTitle}>
              Popular <Text style={{ color: '#8BC34A' }}>recipes</Text>
            </Text>
          </View>

          {popular.map((item) => (
            <TouchableOpacity
              key={`pop-${item._id}`}
              style={s.popCard}
              activeOpacity={0.88}
              onPress={() => navigation.navigate('RecipeDetail', { recipeId: item._id, initialRecipe: item })}
            >
              <Image source={{ uri: getRecipeImage(item) }} style={s.popImg} />
              <View style={s.popInfo}>
                <Text style={s.popName}>{item.title}</Text>
                <Text style={s.popDesc} numberOfLines={3}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <BottomNavBar
          activeTab="events"
          idPrefix="recipes-nav"
          onPressHome={() => navigation.navigate('Home')}
          onPressEvents={() => {}}
          onPressCenter={() => {}}
          onPressReels={() => {}}
          onPressProfile={() => {
            if (user?.profileType === 'pro_commerce') {
              navigation.navigate('SellerProfile');
            } else {
              navigation.navigate('Profile');
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F6F5F3',
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
    backgroundColor: '#E5E7EB',
  },
  checkBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#8BC34A',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E2E2E',
    fontFamily: Font.bold,
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
  heroTitle: {
    paddingHorizontal: 22,
    fontSize: 27,
    color: '#2E2E2E',
    fontWeight: '700',
    fontFamily: Font.bold,
    marginTop: 10,
  },
  heroSub: {
    paddingHorizontal: 22,
    marginTop: 4,
    fontSize: 13.5,
    color: '#C8102E',
    fontWeight: '600',
    fontFamily: Font.semibold,
    textTransform: 'capitalize',
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginTop: 20,
    gap: 12,
  },
  filterPill: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  filterPillActive: {
    backgroundColor: '#8BC34A',
  },
  filterPillIdle: {
    backgroundColor: '#FFFFFF',
  },
  filterText: {
    fontSize: 14.5,
    fontWeight: '600',
    fontFamily: Font.semibold,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterTextIdle: {
    color: '#2E2E2E',
  },
  cardsRow: {
    gap: 16,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 16,
  },
  recipeCard: {
    width: 172,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  recipeImageContainer: {
    width: 148,
    height: 148,
    borderRadius: 74,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  recipeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  recipeBody: {
    paddingHorizontal: 4,
  },
  recipeName: {
    color: '#C8102E',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Font.bold,
    marginBottom: 4,
  },
  recipeDesc: {
    color: 'rgba(46, 46, 46, 0.5)',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Font.regular,
  },
  popularHeaderRow: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 14,
  },
  popularTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E2E2E',
    fontFamily: Font.bold,
  },
  popCard: {
    marginHorizontal: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  popImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
  },
  popInfo: {
    flex: 1,
    paddingRight: 4,
  },
  popName: {
    color: '#C8102E',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Font.bold,
    marginBottom: 4,
  },
  popDesc: {
    color: 'rgba(46, 46, 46, 0.5)',
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: Font.regular,
  },
});
