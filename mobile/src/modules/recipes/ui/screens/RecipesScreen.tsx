import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useAuth } from '@/modules/auth/state/auth.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
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
  const { theme: T } = useTheme();
  const { isRTL } = useLanguage();

  // Search State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<any>(null);

  const toggleSearch = useCallback(() => {
    const next = !searchOpen;
    setSearchOpen(next);
    if (next) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      inputRef.current?.blur();
      setSearchQuery('');
    }
    Animated.timing(searchAnim, {
      toValue: next ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [searchOpen, searchAnim]);

  const searchHeight = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });

  const searchOpacity = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

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
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    userInfo: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      textAlign: isRTL ? 'right' : 'left',
    },
    topIcons: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
      color: T.text,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      marginTop: 10,
      textAlign: isRTL ? 'right' : 'left',
    },
    heroSub: {
      paddingHorizontal: 22,
      marginTop: 4,
      fontSize: 13.5,
      color: T.red,
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
      textTransform: 'capitalize',
      textAlign: isRTL ? 'right' : 'left',
    },

    // Search Input Styles
    searchWrap: {
      overflow: 'hidden',
      borderRadius: 14,
      marginHorizontal: 22,
      marginTop: 10,
    },
    searchInner: {
      height: 44,
      borderRadius: 14,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: T.text,
      paddingVertical: 0,
      backgroundColor: 'transparent',
      includeFontPadding: false,
      textAlign: isRTL ? 'right' : 'left',
    },

    filters: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingHorizontal: 22,
      marginTop: 20,
      gap: 12,
    },
    filterPill: {
      height: 44,
      borderRadius: 22,
      paddingHorizontal: 20,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: 'rgba(0,0,0,0.06)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    filterPillActive: {
      backgroundColor: T.green,
    },
    filterPillIdle: {
      backgroundColor: T.surface,
    },
    filterText: {
      fontSize: 14.5,
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
    },
    filterTextActive: {
      color: '#FFFFFF',
    },
    filterTextIdle: {
      color: T.text,
    },
    cardsRow: {
      gap: 16,
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 16,
      flexDirection: isRTL ? 'row-reverse' : 'row',
    },
    recipeCard: {
      width: 172,
      backgroundColor: T.surface,
      borderRadius: 24,
      padding: 12,
      shadowColor: 'rgba(0,0,0,0.06)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
      alignItems: isRTL ? 'flex-end' : 'flex-start',
    },
    recipeImageContainer: {
      width: 148,
      height: 148,
      borderRadius: 74,
      overflow: 'hidden',
      alignSelf: 'center',
      backgroundColor: T.surfaceAlt,
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
      alignItems: isRTL ? 'flex-end' : 'flex-start',
      width: '100%',
    },
    recipeName: {
      color: T.red,
      fontSize: 15,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      marginBottom: 4,
      textAlign: isRTL ? 'right' : 'left',
      width: '100%',
    },
    recipeDesc: {
      color: T.textSub,
      fontSize: 11,
      lineHeight: 16,
      fontFamily: 'Poppins_400Regular',
      textAlign: isRTL ? 'right' : 'left',
      width: '100%',
    },
    popularHeaderRow: {
      paddingHorizontal: 22,
      paddingTop: 10,
      paddingBottom: 14,
      alignItems: isRTL ? 'flex-end' : 'flex-start',
    },
    popularTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: T.text,
      fontFamily: 'Poppins_700Bold',
      textAlign: isRTL ? 'right' : 'left',
    },
    popCard: {
      marginHorizontal: 22,
      backgroundColor: T.surface,
      borderRadius: 24,
      padding: 12,
      shadowColor: 'rgba(0,0,0,0.06)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 16,
    },
    popImg: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: T.surfaceAlt,
    },
    popInfo: {
      flex: 1,
      paddingRight: isRTL ? 0 : 4,
      paddingLeft: isRTL ? 4 : 0,
      alignItems: isRTL ? 'flex-end' : 'flex-start',
    },
    popName: {
      color: T.red,
      fontSize: 15,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      marginBottom: 4,
      textAlign: isRTL ? 'right' : 'left',
      width: '100%',
    },
    popDesc: {
      color: T.textSub,
      fontSize: 11.5,
      lineHeight: 16,
      fontFamily: 'Poppins_400Regular',
      textAlign: isRTL ? 'right' : 'left',
      width: '100%',
    },
  }), [T, isRTL]);

  const [activeCategory, setActiveCategory] = useState<RecipeCategory>('tunisian');
  const [items, setItems] = useState<Recipe[]>([]);
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    (async () => {
      setLoaded(false);
      try {
        const fromApi = await recipesApi.list({ category: activeCategory, limit: 30 });
        setItems(fromApi);
      } catch {
        setItems(MOCK_RECIPES);
      } finally {
        setLoaded(true);
      }
    })();
  }, [activeCategory]);

  const filtered = useMemo(() => {
    const source = loaded && items.length > 0 ? items : MOCK_RECIPES;
    let list = source.filter((r) => r.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => 
        (r.title && r.title.toLowerCase().includes(q)) || 
        (r.description && r.description.toLowerCase().includes(q)) || 
        (r.ingredients && r.ingredients.some(ing => ing.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [activeCategory, items, loaded, searchQuery]);

  const popular = useMemo(() => {
    const source = loaded && items.length > 0 ? items : MOCK_RECIPES;
    const salad = source.find(r => r.title.toLowerCase().includes('salad') || r.title.toLowerCase().includes('quinoa'));
    return salad ? [salad] : source.slice(2, 3);
  }, [items, loaded]);

  return (
    <AppScaffold
      title="Recipes"
      activeTab="home"
      showSearch
      onSearchPress={toggleSearch}
      searchIcon={searchOpen ? 'x' : 'search'}
      contentStyle={{ backgroundColor: T.bg }}
    >
      <View style={[s.mainContainer, { backgroundColor: T.bg }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          {/* Heading */}
          <Text style={[s.heroTitle, { color: T.text }]}>Gluten-Free Recipes</Text>
          <Text style={[s.heroSub, { color: T.red }]}>Healthy and nutritious food recipes</Text>

          {/* Search Bar */}
          <Animated.View style={[s.searchWrap, { height: searchHeight, opacity: searchOpacity }]}>
            <View style={s.searchInner}>
              <Feather name="search" size={16} color={T.textMuted} />
              <TextInput
                ref={inputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search recipes..."
                placeholderTextColor={T.textMuted}
                underlineColorAndroid="transparent"
                style={s.searchInput}
              />
              {!!searchQuery && (
                <TouchableOpacity activeOpacity={0.8} onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color={T.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* Filter Tabs */}
          <View style={s.filters}>
            {FILTERS.map((f) => {
              const active = f.key === activeCategory;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setActiveCategory(f.key)}
                  activeOpacity={0.85}
                  style={[s.filterPill, active ? s.filterPillActive : [s.filterPillIdle, { backgroundColor: T.surface }]]}
                >
                  {active && (
                    <MaterialCommunityIcons
                      name="bowl-mix-outline"
                      size={18}
                      color="#FFFFFF"
                      style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }}
                    />
                  )}
                  <Text style={[s.filterText, active ? s.filterTextActive : [s.filterTextIdle, { color: T.text }]]}>
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
                style={[s.recipeCard, { backgroundColor: T.surface }]}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('RecipeDetail', { recipeId: item._id, initialRecipe: item })}
              >
                <View style={s.recipeImageContainer}>
                  <Image source={{ uri: getRecipeImage(item) }} style={s.recipeImage} />
                </View>
                <View style={s.recipeBody}>
                  <Text style={[s.recipeName, { color: T.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[s.recipeDesc, { color: T.textSub }]} numberOfLines={2}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            )}
          />

          {/* Popular Section */}
          <View style={s.popularHeaderRow}>
            <Text style={[s.popularTitle, { color: T.text }]}>
              Popular <Text style={{ color: T.green }}>recipes</Text>
            </Text>
          </View>

          {popular.map((item) => (
            <TouchableOpacity
              key={`pop-${item._id}`}
              style={[s.popCard, { backgroundColor: T.surface }]}
              activeOpacity={0.88}
              onPress={() => navigation.navigate('RecipeDetail', { recipeId: item._id, initialRecipe: item })}
            >
              <Image source={{ uri: getRecipeImage(item) }} style={s.popImg} />
              <View style={s.popInfo}>
                <Text style={[s.popName, { color: T.text }]}>{item.title}</Text>
                <Text style={[s.popDesc, { color: T.textSub }]} numberOfLines={3}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </AppScaffold>
  );
}


