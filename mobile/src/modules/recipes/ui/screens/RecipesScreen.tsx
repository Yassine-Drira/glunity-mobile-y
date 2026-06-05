import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Animated,
  Easing,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import FastImage from '@/shared/components/FastImageWrapper';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useAuth } from '@/modules/auth/state/auth.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import recipesApi, { Recipe, RecipeCategory } from '../../api/recipes.api';
import PaginationBar from '@/shared/components/PaginationBar';
import { useSearchCache } from '@/shared/hooks/useSearchCache';

type Props = NativeStackScreenProps<AppStackParamList, 'Recipes'>;

const FILTERS: Array<{ key: RecipeCategory; label: string }> = [
  { key: 'tunisian', label: 'Tunisian' },
  { key: 'easy', label: 'Easy' },
  { key: 'quick', label: 'Quick' },
];

// MOCK_RECIPES removed completely.

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

const RecipeCard = React.memo(({ item, onPress, isRTL, T }: { item: Recipe; onPress: (item: Recipe) => void; isRTL: boolean; T: any }) => {
  return (
    <TouchableOpacity
      style={{
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
      }}
      activeOpacity={0.9}
      onPress={() => onPress(item)}
    >
      <View style={{
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
      }}>
        <FastImage source={{ uri: getRecipeImage(item) }} resizeMode={FastImage.resizeMode.cover} style={{ width: '100%', height: '100%' }} />
      </View>
      <View style={{ paddingHorizontal: 4, alignItems: isRTL ? 'flex-end' : 'flex-start', width: '100%' }}>
        <Text style={{ color: T.text, fontSize: 15, fontWeight: '700', fontFamily: 'Poppins_700Bold', marginBottom: 4, textAlign: isRTL ? 'right' : 'left', width: '100%' }} numberOfLines={1}>{item.title}</Text>
        <Text style={{ color: T.textSub, fontSize: 11, lineHeight: 16, fontFamily: 'Poppins_400Regular', textAlign: isRTL ? 'right' : 'left', width: '100%' }} numberOfLines={2}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function RecipesScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme: T } = useTheme();
  const { isRTL } = useLanguage();

  // Search State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVal, setSearchVal] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchVal]);
  const { addQuery, removeQuery, getSuggestions } = useSearchCache('@recipe_search_queries');
  const suggestions = getSuggestions(searchVal);
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
    suggestionsContainer: {
      position: 'absolute',
      top: 48,
      left: 22,
      right: 22,
      backgroundColor: T.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: T.border,
      zIndex: 100,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 5,
      paddingVertical: 6,
    },
    suggestionRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    suggestionLeft: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    suggestionText: {
      fontSize: 13,
      color: T.text,
      fontFamily: 'Poppins_500Medium',
    },
  }), [T, isRTL]);

  const [activeCategory, setActiveCategory] = useState<RecipeCategory>('tunisian');
  const LIMIT = 15;
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRecipePress = useCallback((item: Recipe) => {
    navigation.navigate('RecipeDetail', { recipeId: item._id, initialRecipe: item });
  }, [navigation]);



  const fetchRecipes = useCallback(async (pageNum: number, isRefresh = false) => {
    if (pageNum === 1) {
      if (!isRefresh) setLoaded(false);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await recipesApi.list({
        category: activeCategory,
        search: searchQuery.trim() || undefined,
        page: pageNum,
        limit: LIMIT,
      });

      setRecipes(res.items || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.error('[RecipesScreen] fetch error:', err);
    } finally {
      setLoaded(true);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    setPage(1);
    fetchRecipes(1);
  }, [activeCategory, searchQuery, fetchRecipes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchRecipes(1, true);
  }, [fetchRecipes]);

  const filtered = useMemo(() => recipes, [recipes]);

  const popular = useMemo(() => {
    const salad = recipes.find(r => r.title.toLowerCase().includes('salad') || r.title.toLowerCase().includes('quinoa'));
    return salad ? [salad] : (recipes.length > 2 ? recipes.slice(2, 3) : recipes.slice(0, 1));
  }, [recipes]);

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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[T.green]}
              tintColor={T.green}
            />
          }
        >
          {/* Heading */}
          <Text style={[s.heroTitle, { color: T.text }]}>Gluten-Free Recipes</Text>
          <Text style={[s.heroSub, { color: T.red }]}>Healthy and nutritious food recipes</Text>

          {/* Search Bar */}
          <View style={{ position: 'relative', zIndex: 100 }}>
            <Animated.View style={[s.searchWrap, { height: searchHeight, opacity: searchOpacity }]}>
              <View style={s.searchInner}>
                <Feather name="search" size={16} color={T.textMuted} />
                <TextInput
                  ref={inputRef}
                  value={searchVal}
                  onChangeText={setSearchVal}
                  onSubmitEditing={() => addQuery(searchVal)}
                  placeholder="Search recipes..."
                  placeholderTextColor={T.textMuted}
                  underlineColorAndroid="transparent"
                  style={s.searchInput}
                />
                {!!searchVal && (
                  <TouchableOpacity activeOpacity={0.8} onPress={() => setSearchVal("")}>
                    <Ionicons name="close-circle" size={16} color={T.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>

            {searchOpen && suggestions.length > 0 && (
              <View style={s.suggestionsContainer}>
                {suggestions.map((item, idx) => (
                  <View key={item + idx} style={s.suggestionRow}>
                    <TouchableOpacity
                      style={s.suggestionLeft}
                      onPress={() => {
                        setSearchVal(item);
                        addQuery(item);
                      }}
                    >
                      <Feather name="clock" size={14} color={T.textMuted} />
                      <Text style={s.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeQuery(item)}>
                      <Feather name="x" size={14} color={T.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

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
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews={Platform.OS !== 'web'}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
                  <ActivityIndicator size="small" color={T.green} />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <RecipeCard item={item} onPress={handleRecipePress} isRTL={isRTL} T={T} />
            )}
          />

          {/* Pagination */}
          <PaginationBar
            page={page}
            totalPages={totalPages}
            loading={loadingMore}
            onPageChange={(p) => {
              setPage(p);
              fetchRecipes(p);
            }}
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
              <FastImage source={{ uri: getRecipeImage(item) }} resizeMode={FastImage.resizeMode.cover} style={s.popImg} />
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


