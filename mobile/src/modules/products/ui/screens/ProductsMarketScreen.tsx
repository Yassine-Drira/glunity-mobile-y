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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { Radius } from '@/shared/utils/theme';
import { useAuth } from '@/modules/auth/state/auth.context';
import productsApi, { Product } from '@/modules/seller/api/products.api';
import type { AppStackParamList } from '@/navigation/types';

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
const ProductCard = React.memo(({ product, onPress, cardWidth }: { product: Product; onPress: () => void; cardWidth: number }) => {
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
    productName: { fontSize: 13, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.text, lineHeight: 18 },
    sellerName: { fontSize: 11, color: T.red, fontWeight: '500', fontFamily: 'Poppins_500Medium' },
    price: { fontSize: 13, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.green, marginTop: 2 },
  }), [T, cardWidth]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: cardWidth }}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={s.card}
        id={`product-card-${product._id}`}
      >
        <View style={s.imageWrap}>
          <Image source={{ uri: imageUri }} style={s.cardImage} resizeMode="cover" />
          {product.certifiedGF && (
            <View style={s.certBadge}>
              <Text style={s.certBadgeText}>GF</Text>
            </View>
          )}
        </View>
        <View style={s.cardBody}>
          <Text style={s.productName} numberOfLines={2}>{product.name}</Text>
          <Text style={s.sellerName}  numberOfLines={1}>{sellerName}</Text>
          <Text style={s.price}>{product.price}DT</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProductsMarketScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme: T, isDark } = useTheme();
  const insets   = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const screenWidth = Math.min(windowWidth, 600);
  const cardWidth = (screenWidth - H_PAD * 2 - CARD_GAP) / 2;

  const s = React.useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    topHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 8,
      backgroundColor: T.bg,
    },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surfaceAlt },
    avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    greeting: { fontSize: 18, fontWeight: '500', fontFamily: 'Poppins_500Medium', color: T.text },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBtn: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: T.surfaceAlt,
      alignItems: 'center', justifyContent: 'center',
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
    },
    filterRow: {
      flexDirection: 'row',
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
  }), [T]);

  // All products fetched once from the API
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Only true on the very first mount — never reset to true on filter change
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const [activeFilter, setActiveFilter] = useState('all');

  // ── Fetch ALL products once; filtering is 100% client-side ──────────────────
  const fetchProducts = useCallback(async () => {
    try {
      const res = await productsApi.list();
      setAllProducts(res.data ?? []);
    } catch (err) {
      console.error('[ProductsMarket] fetch error:', err);
    } finally {
      setInitialLoad(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  // ── Client-side filter — instant, zero loading state needed ─────────────────
  const displayed = useMemo(() => {
    switch (activeFilter) {
      case 'certified': return allProducts.filter(p => p.certifiedGF);
      case 'homemade':  return allProducts.filter(p => p.category?.toLowerCase() === 'homemade');
      case 'Bakery':    return allProducts.filter(p => p.category === 'Bakery');
      default:          return allProducts;
    }
  }, [allProducts, activeFilter]);

  // ── Profile navigation ───────────────────────────────────────────────────────
  const handleProfileNav = useCallback(() => {
    navigation.navigate(user?.profileType === 'pro_commerce' ? 'SellerProProfile' : 'Profile');
  }, [user, navigation]);

  // ── List header — memoised so it only re-renders when the active pill changes
  const ListHeader = useMemo(() => (
    <>
      <Text style={s.pageTitle}>Gluten free products</Text>
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
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [activeFilter]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  const headerActions = (
    <View style={s.headerActions}>
      <TouchableOpacity style={[s.iconBtn, { backgroundColor: T.surfaceAlt }]} activeOpacity={0.7} id="market-search-btn">
        <Feather name="search" size={18} color={T.text} />
      </TouchableOpacity>
      <TouchableOpacity style={[s.iconBtn, { backgroundColor: T.surfaceAlt }]} activeOpacity={0.7} id="market-notif-btn">
        <Feather name="bell" size={18} color={T.text} />
      </TouchableOpacity>
    </View>
  );

  return (
    <AppScaffold
      title="Market"
      activeTab="home"
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
          contentContainerStyle={[
            s.listContent,
            { paddingBottom: 110 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            !initialLoad ? (
            <View style={s.emptyWrap}>
                <Feather name="package" size={48} color={T.textMuted} />
                <Text style={[s.emptyText, { color: T.text }]}>No products found</Text>
                <Text style={[s.emptySubText, { color: T.textSub }]}>Try a different filter or check back later.</Text>
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
              onPress={() => navigation.navigate('ProductDetail', { product: item })}
            />
          )}
        />

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


