import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  useWindowDimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  TextInput,
  Easing,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { Radius } from '@/shared/utils/theme';
import { useAuth } from '@/modules/auth/state/auth.context';
import productsApi, { Product } from '@/modules/seller/api/products.api';
import type { AppStackParamList } from '@/navigation/types';
import FastImage from '@/shared/components/FastImage';
import PaginationBar from '@/shared/components/PaginationBar';
import { useSearchCache } from '@/shared/hooks/useSearchCache';

// ─── Constants ────────────────────────────────────────────────────────────────
const CARD_GAP = 12;
const H_PAD = 20;

const FILTERS: { key: string; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'certified', label: 'Certified' },
  { key: 'homemade',  label: 'homemade' },
  { key: 'Bakery',    label: 'Bakery' },
];

const CATEGORY_FALLBACKS: Record<string, string> = {
  Bakery:           'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400',
  'Pastry & Cakes': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=400',
  'Breads & Buns':  'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?q=80&w=400',
  'Flour & Mixes':  'https://images.unsplash.com/photo-1574085733277-851d9d856a3a?q=80&w=400',
  Snacks:           'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=400',
  Desserts:         'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=400',
  homemade:         'https://images.unsplash.com/photo-1506459225024-1428097a7e18?q=80&w=400',
};
const DEFAULT_FALLBACK =
  'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=400';

function getProductImage(product: Product): string {
  const raw = product.images?.[0];
  if (raw && !raw.startsWith('blob:') && raw.trim() !== '') return raw;
  return CATEGORY_FALLBACKS[product.category] ?? DEFAULT_FALLBACK;
}

function getSellerName(sellerId: Product['sellerId']): string {
  if (typeof sellerId === 'object' && sellerId !== null && 'fullName' in sellerId) {
    return (sellerId as { _id: string; fullName: string }).fullName;
  }
  return 'Bakery';
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = NativeStackScreenProps<AppStackParamList, 'ProductsMarket'>;

// ─── Product Card ─────────────────────────────────────────────────────────────
const ProductCard = React.memo(({ product, onPress, cardWidth, isOwnProducts }: { product: Product; onPress: (product: Product) => void; cardWidth: number; isOwnProducts?: boolean }) => {
  const { theme: T } = useTheme();
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const imageUri   = useMemo(() => getProductImage(product), [product]);
  const sellerName = useMemo(() => getSellerName(product.sellerId), [product.sellerId]);

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: Platform.OS !== 'web', speed: 50 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 50 }).start();

  const s = React.useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: T.surface,
      borderRadius: Radius.lg, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
    },
    imageWrap: { width: '100%', height: cardWidth, backgroundColor: T.surfaceAlt, position: 'relative' },
    cardImage: { width: '100%', height: '100%' },
    certBadge: {
      position: 'absolute', top: 6, right: 6, backgroundColor: T.green,
      borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    },
    certBadgeText: { fontSize: 9, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: '#FFFFFF' },
    cardBody: { padding: 10, gap: 2 },
    productName: { fontSize: 13, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.text, lineHeight: 18, height: 36 },
    sellerName: { fontSize: 11, color: T.red, fontWeight: '500', fontFamily: 'Poppins_500Medium' },
    price: { fontSize: 13, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.green, marginTop: 2 },
  }), [T, cardWidth]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: cardWidth }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress(product)}
        style={s.card}
        id={`product-card-${product._id}`}
      >
        <View style={s.imageWrap}>
          <FastImage source={{ uri: imageUri }} style={s.cardImage} resizeMode="cover" />
          {product.certifiedGF && (
            <View style={s.certBadge}>
              <Text style={s.certBadgeText}>GF</Text>
            </View>
          )}
        </View>
        <View style={s.cardBody}>
          <Text style={s.productName} numberOfLines={2}>{product.name}</Text>
          <Text style={s.sellerName}  numberOfLines={1}>{sellerName}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
            <Text style={s.price}>{product.price}DT</Text>
            {isOwnProducts && (
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: T.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="edit-2" size={11} color={T.text} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProductsMarketScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { theme: T } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets   = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const screenWidth = Math.min(windowWidth, 600);
  const cardWidth = (screenWidth - H_PAD * 2 - CARD_GAP) / 2;

  const isOwnProducts = !!(route?.params?.sellerId && user?._id && route.params.sellerId === user._id);

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
  const { addQuery, removeQuery, getSuggestions } = useSearchCache('@product_search_queries');
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
    safe: { flex: 1, backgroundColor: T.bg },
    topHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 8,
      backgroundColor: T.bg,
    },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surfaceAlt },
    avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    greeting: { fontSize: 18, fontWeight: '500', fontFamily: 'Poppins_500Medium', color: T.text },
    headerActions: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 },
    iconBtn: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: T.surfaceAlt,
      alignItems: 'center', justifyContent: 'center',
    },

    // Search input styles
    searchWrap: {
      overflow: 'hidden',
      borderRadius: 14,
      marginBottom: 12,
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

    // List wrapper — fills all space beneath the global header
    listContainer: {
      flex: 1,
      position: 'relative',
    },

    // Full-area overlay spinner — purely cosmetic, zero layout impact
    spinnerOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: T.bg,
    },

    // FlatList content
    listContent: {
      paddingHorizontal: H_PAD,
      paddingTop: 8,
    },
    columnWrapper: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      marginBottom: CARD_GAP,
    },

    // List header items
    pageTitle: {
      fontSize: 22,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginBottom: 16,
      textAlign: isRTL ? 'right' : 'left',
    },
    filterRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 8,
      marginBottom: 16,
      flexWrap: 'wrap',
    },
    filterPill: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: Radius.full,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
    },
    filterPillActive: {
      backgroundColor: T.green,
      borderColor: T.green,
    },
    filterText: {
      fontSize: 12,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.text,
    },
    filterTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
    },

    // Empty state
    emptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      gap: 12,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
      color: T.text,
    },
    emptySubText: {
      fontSize: 13,
      color: T.textSub,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    paginationContainer: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 24,
      width: '100%',
    },
    fab: {
      position: 'absolute',
      bottom: insets.bottom + 90,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: T.green,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: T.green,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 8,
      zIndex: 99,
    },
    suggestionsContainer: {
      position: 'absolute',
      top: 48,
      left: 0,
      right: 0,
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
  }), [T, isRTL, insets.bottom]);

  // All products fetched once from the API
  const LIMIT = 20;
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const handleProductPress = useCallback((item: Product) => {
    if (isOwnProducts) {
      navigation.navigate('AddProduct', { product: item });
    } else {
      navigation.navigate('ProductDetail', { product: item });
    }
  }, [isOwnProducts, navigation]);



  const fetchProducts = useCallback(async (pageNum: number, isRefresh = false) => {
    if (pageNum === 1) {
      if (!isRefresh) setInitialLoad(true);
    } else {
      setLoadingMore(true);
    }

    try {
      let categoryParam: string | undefined = undefined;
      if (activeFilter === 'Bakery') categoryParam = 'Bakery';
      if (activeFilter === 'homemade') categoryParam = 'homemade';

      const res = await productsApi.list({
        page: pageNum,
        limit: LIMIT,
        search: searchQuery.trim() || undefined,
        category: categoryParam,
        sellerId: route?.params?.sellerId,
      });

      setProducts(res.data ?? []);

      if (res.pagination) {
        setTotalPages(res.pagination.pages || 1);
      } else {
        setTotalPages(1);
      }
    } catch (err) {
      console.error('[ProductsMarket] fetch error:', err);
    } finally {
      setInitialLoad(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activeFilter, searchQuery, route?.params?.sellerId]);

  useEffect(() => {
    setPage(1);
    fetchProducts(1);
  }, [activeFilter, searchQuery, fetchProducts]);

  // Refresh on screen focus to pick up edits/deletions/creations
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProducts(1);
    });
    return unsubscribe;
  }, [navigation, fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchProducts(1, true);
  }, [fetchProducts]);

  const displayed = useMemo(() => {
    if (activeFilter === 'certified') {
      return products.filter(p => p.certifiedGF);
    }
    return products;
  }, [products, activeFilter]);

  const ListFooter = useMemo(() => (
    <View style={{ paddingBottom: 110 + insets.bottom }}>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        loading={loadingMore}
        onPageChange={(p) => {
          setPage(p);
          fetchProducts(p);
        }}
      />
    </View>
  ), [page, totalPages, loadingMore, fetchProducts, insets.bottom]);

  const isFilteredBySeller = !!route?.params?.sellerId;

  // ── List header — memoised so it only re-renders when the active pill or search changes
  const ListHeader = useMemo(() => (
    <>
      <Text style={s.pageTitle}>
        {isOwnProducts
          ? t('My Products')
          : isFilteredBySeller
          ? t("Seller's Products")
          : t('Gluten free products')}
      </Text>
      
      <View style={{ position: 'relative', zIndex: 100 }}>
        <Animated.View style={[s.searchWrap, { height: searchHeight, opacity: searchOpacity }]}>
          <View style={s.searchInner}>
            <Feather name="search" size={16} color={T.textMuted} />
            <TextInput
              ref={inputRef}
              value={searchVal}
              onChangeText={setSearchVal}
              onSubmitEditing={() => addQuery(searchVal)}
              placeholder={t('Search products...')}
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

      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setActiveFilter(f.key)}
            style={[s.filterPill, activeFilter === f.key && s.filterPillActive]}
            activeOpacity={0.8}
            id={`filter-${f.key}`}
          >
            <Text style={[s.filterText, activeFilter === f.key && s.filterTextActive]}>
              {t(f.label)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  ), [activeFilter, searchHeight, searchOpacity, searchVal, T, s, t, isFilteredBySeller, searchOpen, suggestions, addQuery, removeQuery]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppScaffold
      title={t('Market')}
      activeTab="home"
      showSearch
      onSearchPress={toggleSearch}
      searchIcon={searchOpen ? 'x' : 'search'}
      onBack={isFilteredBySeller ? () => navigation.goBack() : undefined}
      contentStyle={{ backgroundColor: T.bg }}
    >

      {/*
        ══ List area ══
        The FlatList is ALWAYS mounted — even during initial load we render it
        with an empty array. The absolute spinner overlay paints on top of the
        list area without changing any layout measurements.
      */}
      <View style={s.listContainer}>
        <FlatList<Product>
          data={initialLoad ? [] : displayed}
          keyExtractor={item => item._id}
          numColumns={2}
          columnWrapperStyle={s.columnWrapper}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={
            !initialLoad ? (
            <View style={s.emptyWrap}>
                <Feather name="package" size={48} color={T.textMuted} />
                <Text style={[s.emptyText, { color: T.text }]}>{t('No products found')}</Text>
                <Text style={[s.emptySubText, { color: T.textSub }]}>{t('Try a different filter or check back later.')}</Text>
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[T.green]}
              tintColor={T.green}
            />
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              cardWidth={cardWidth}
              isOwnProducts={isOwnProducts}
              onPress={handleProductPress}
            />
          )}
        />

        {isOwnProducts && (
          <TouchableOpacity
            style={s.fab}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddProduct')}
            id="btn-market-add-product"
          >
            <Feather name="plus" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/*
          Absolute overlay spinner — rendered on top of the list area.
          Uses `pointerEvents="none"` so taps pass through once hidden.
          Critically, this does NOT affect the layout of siblings.
        */}
        {initialLoad && (
          <View style={[s.spinnerOverlay, { backgroundColor: T.bg }]} pointerEvents="none">
            <ActivityIndicator size="large" color={T.green} />
          </View>
        )}
      </View>
    </AppScaffold>
  );
}


