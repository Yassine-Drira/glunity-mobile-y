import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BottomNavBar } from '@/shared/components/BottomNavBar';
import { Colors, Font, Radius, Spacing } from '@/shared/utils/theme';
import { useAuth } from '@/modules/auth/state/auth.context';
import productsApi, { Product } from '@/modules/seller/api/products.api';
import type { AppStackParamList } from '@/navigation/types';

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 12;
const H_PAD = 20;
const CARD_W = (SCREEN_W - H_PAD * 2 - CARD_GAP) / 2;

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
const ProductCard = React.memo(({ product, onPress }: { product: Product; onPress: () => void }) => {
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const imageUri   = useMemo(() => getProductImage(product), [product]);
  const sellerName = useMemo(() => getSellerName(product.sellerId), [product.sellerId]);

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: CARD_W }}>
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
  const insets   = useSafeAreaInsets();

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
    navigation.navigate(user?.profileType === 'pro_commerce' ? 'SellerProfile' : 'Profile');
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
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      {/*
        ══ Top header ══
        Rendered outside the FlatList in its own fixed View.
        It is NEVER inside a conditional, so it can never cause the
        BottomNavBar to shift when data or filter state changes.
      */}
      <View style={s.topHeader}>
        <View style={s.userRow}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarPlaceholder]}>
              <Feather name="user" size={18} color={Colors.muted} />
            </View>
          )}
          <Text style={s.greeting}>{user?.fullName?.split(' ')[0] ?? 'You'}</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} id="market-search-btn">
            <Feather name="search" size={18} color="#393C40" />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} id="market-notif-btn">
            <Feather name="bell" size={18} color="#393C40" />
          </TouchableOpacity>
        </View>
      </View>

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
                <Feather name="package" size={48} color={Colors.muted} />
                <Text style={s.emptyText}>No products found</Text>
                <Text style={s.emptySubText}>Try a different filter or check back later.</Text>
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.green]}
              tintColor={Colors.green}
            />
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
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
          <View style={s.spinnerOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={Colors.green} />
          </View>
        )}
      </View>

      {/*
        ══ Bottom Nav ══
        Always mounted last, always at the same visual position.
      */}
      <BottomNavBar
        activeTab="home"
        idPrefix="market-nav"
        onPressHome={() => navigation.navigate('Home')}
        onPressEvents={() => {}}
        onPressCenter={() => {}}
        onPressReels={() => {}}
        onPressProfile={handleProfileNav}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Fixed top header — never inside a conditional
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.bg,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 18,
    fontWeight: Font.medium,
    color: '#343831',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0EFED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List wrapper — fills all space between top header and BottomNavBar
  listContainer: {
    flex: 1,
    position: 'relative',
  },

  // Full-area overlay spinner — purely cosmetic, zero layout impact
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },

  // FlatList content
  listContent: {
    paddingHorizontal: H_PAD,
    paddingTop: Spacing.sm,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },

  // List header items
  pageTitle: {
    fontSize: 22,
    fontWeight: Font.bold,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillActive: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  filterText: {
    fontSize: 12,
    fontWeight: Font.medium,
    color: Colors.dark,
  },
  filterTextActive: {
    color: Colors.white,
    fontWeight: Font.semibold,
  },

  // Product card
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  imageWrap: {
    width: '100%',
    height: CARD_W,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  certBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.green,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  certBadgeText: {
    fontSize: 9,
    fontWeight: Font.bold,
    color: Colors.white,
  },
  cardBody: {
    padding: 10,
    gap: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: Font.bold,
    color: Colors.dark,
    lineHeight: 18,
  },
  sellerName: {
    fontSize: 11,
    color: Colors.primaryRed,
    fontWeight: Font.medium,
  },
  price: {
    fontSize: 13,
    fontWeight: Font.bold,
    color: Colors.green,
    marginTop: 2,
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
    fontWeight: Font.semibold,
    color: Colors.dark,
  },
  emptySubText: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
