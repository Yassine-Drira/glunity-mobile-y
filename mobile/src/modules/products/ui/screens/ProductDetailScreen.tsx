import React, { useMemo } from 'react';
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
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
import type { AppStackParamList } from '@/navigation/types';
import type { Product } from '@/modules/seller/api/products.api';

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = 210;  // fixed contained height matching the screenshot

const CATEGORY_FALLBACKS: Record<string, string> = {
  Bakery:           'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800',
  'Pastry & Cakes': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=800',
  'Breads & Buns':  'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?q=80&w=800',
  'Flour & Mixes':  'https://images.unsplash.com/photo-1574085733277-851d9d856a3a?q=80&w=800',
  Snacks:           'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=800',
  Desserts:         'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=800',
  homemade:         'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?q=80&w=800',
};
const DEFAULT_FALLBACK =
  'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=800';

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Bakery:
    'A rustic gluten-free loaf with a crispy crust and chewy interior. Fermented for 24 hours for optimal flavor and digestion.',
  'Pastry & Cakes':
    'Delicate gluten-free pastry made with certified safe flours. Perfectly layered and baked to a golden finish.',
  'Breads & Buns':
    'Soft, fluffy gluten-free bread baked fresh every morning. Made from 100% certified gluten-free grains.',
  'Flour & Mixes':
    'Premium gluten-free flour blend, perfect for home baking. Contains no traces of wheat, rye, or barley.',
  Snacks:
    'Light and crunchy gluten-free snack, ideal for people with celiac disease or gluten intolerance.',
  Desserts:
    'Indulgent gluten-free dessert crafted with the finest safe ingredients. Satisfying and totally wheat-free.',
  homemade:
    'Lovingly crafted at home using traditional recipes adapted for gluten-free diets. Made with natural ingredients.',
};
const DEFAULT_DESCRIPTION =
  'A premium gluten-free product crafted with certified ingredients, safe for people with celiac disease and gluten intolerance.';

function getProductImage(product: Product): string {
  const raw = product.images?.[0];
  if (raw && !raw.startsWith('blob:') && raw.trim() !== '') return raw;
  return CATEGORY_FALLBACKS[product.category] ?? DEFAULT_FALLBACK;
}

function getSellerName(sellerId: Product['sellerId']): string {
  if (typeof sellerId === 'object' && sellerId !== null && 'fullName' in sellerId) {
    return (sellerId as { _id: string; fullName: string }).fullName;
  }
  return 'GlUnity Bakery';
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = NativeStackScreenProps<AppStackParamList, 'ProductDetail'>;

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProductDetailScreen({ route, navigation }: Props) {
  const { product } = route.params as { product: Product };
  const { user }    = useAuth();
  const insets      = useSafeAreaInsets();

  const imageUri    = useMemo(() => getProductImage(product), [product]);
  const sellerName  = useMemo(() => getSellerName(product.sellerId), [product.sellerId]);
  const description = useMemo(
    () => CATEGORY_DESCRIPTIONS[product.category] ?? DEFAULT_DESCRIPTION,
    [product.category],
  );

  const handleProfileNav = () => {
    navigation.navigate(user?.profileType === 'pro_commerce' ? 'SellerProfile' : 'Profile');
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      {/*
        ══ TOP HEADER ══
        Plain in-flow View — sits above the image, always fully visible.
        NOT absolute, NOT transparent.
      */}
      <View style={s.topHeader}>
        {/* Left: back arrow */}
        <TouchableOpacity
          style={s.backBtn}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          id="detail-back-btn"
        >
          <Feather name="arrow-left" size={20} color="#393C40" />
        </TouchableOpacity>

        {/* Centre: user name */}
        <View style={s.userRow}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Feather name="user" size={16} color={Colors.muted} />
            </View>
          )}
          <Text style={s.greeting}>{user?.fullName?.split(' ')[0] ?? 'You'}</Text>
        </View>

        {/* Right: search + bell */}
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} id="detail-search-btn">
            <Feather name="search" size={18} color="#393C40" />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} id="detail-notif-btn">
            <Feather name="bell" size={18} color="#393C40" />
          </TouchableOpacity>
        </View>
      </View>

      {/*
        ══ SCROLLABLE BODY ══
        Fills all space between the top header and the fixed bottom bar.
        The hero image is the first child — it is a contained block, not full-screen.
      */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero image: full width, fixed height, no radius, below header */}
        <Image
          source={{ uri: imageUri }}
          style={s.heroImage}
          resizeMode="cover"
        />

        {/* ── Text content sits on the bg-coloured area below the image */}
        <View style={s.contentArea}>

          {/* Category pill */}
          <View style={s.categoryPill}>
            <Text style={s.categoryPillText}>{product.category}</Text>
          </View>

          {/* Product name */}
          <Text style={s.productName}>{product.name}</Text>

          {/* Info rows */}
          <View style={s.infoSection}>
            <View style={s.infoRow}>
              <Feather name="map-pin" size={15} color={Colors.primaryRed} style={s.infoIcon} />
              <View>
                <Text style={s.infoMain}>125 Rue Casablanca, Tunis</Text>
                <Text style={s.infoSub}>2.4 km away</Text>
              </View>
            </View>

            <View style={s.infoRow}>
              <Feather name="clock" size={15} color={Colors.primaryRed} style={s.infoIcon} />
              <Text style={s.infoMain}>Open today • 08:00 - 19:00</Text>
            </View>

            <View style={s.infoRow}>
              <Feather name="phone" size={15} color={Colors.primaryRed} style={s.infoIcon} />
              <Text style={s.infoMain}>+216 12 345 678</Text>
            </View>
          </View>

          {/* About section */}
          <Text style={s.sectionTitle}>About this product</Text>
          <Text style={s.description}>{description}</Text>

          {/* Ingredients */}
          {product.ingredients && product.ingredients.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Ingredients</Text>
              <View style={s.ingredientsWrap}>
                {product.ingredients.map((ing, i) => (
                  <View key={`${ing}-${i}`} style={s.chip}>
                    <Text style={s.chipText}>{ing}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/*
        ══ FOOTER ══
        A fixed-height in-flow container that holds BOTH the price/CTA bar
        and the BottomNavBar. Neither is absolute relative to the screen —
        they stack vertically inside this footer, so both are always visible.
      */}
      <View style={s.footer}>
        {/* Price + View Seller bar */}
        <View style={s.bottomBar}>
          <View>
            <Text style={s.priceLabel}>Price</Text>
            <Text style={s.priceValue}>{product.price}TND</Text>
          </View>

          <TouchableOpacity
            style={s.viewSellerBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SellerProfile')}
            id="detail-view-seller-btn"
          >
            <Feather name="shopping-bag" size={16} color={Colors.white} />
            <Text style={s.viewSellerText}>View Seller</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Nav — rendered inline inside footer, NOT position:absolute relative to screen */}
        <BottomNavBar
          activeTab="home"
          idPrefix="detail-nav"
          onPressHome={() => navigation.navigate('Home')}
          onPressEvents={() => {}}
          onPressCenter={() => {}}
          onPressReels={() => {}}
          onPressProfile={handleProfileNav}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // ── Top header — plain in-flow, never overlaps image
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.bg,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EDEDEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E5E7EB',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 16,
    fontWeight: Font.medium,
    color: '#343831',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EDEDEB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scroll area
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },

  // ── Hero image — contained block, full width, no border radius
  heroImage: {
    width: SCREEN_W,
    height: HERO_H,
    backgroundColor: '#E5E7EB',
  },

  // ── Text content below image
  contentArea: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  // Category pill
  categoryPill: {
    alignSelf: 'flex-start',
    borderWidth: 1.2,
    borderColor: Colors.primaryRed,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 12,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: Font.semibold,
    color: Colors.primaryRed,
  },

  // Product name
  productName: {
    fontSize: 26,
    fontWeight: Font.bold,
    color: Colors.dark,
    lineHeight: 34,
    marginBottom: 20,
  },

  // Info rows
  infoSection: {
    gap: 14,
    marginBottom: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoMain: {
    fontSize: 13,
    fontWeight: Font.medium,
    color: Colors.dark,
    lineHeight: 20,
  },
  infoSub: {
    fontSize: 11,
    fontWeight: Font.bold,
    color: Colors.green,
    marginTop: 2,
  },

  // Sections
  sectionTitle: {
    fontSize: 16,
    fontWeight: Font.bold,
    color: Colors.dark,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: 'rgba(46,46,46,0.65)',
    lineHeight: 21,
    marginBottom: 22,
  },

  // Ingredient chips
  ingredientsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.white,
  },
  chipText: {
    fontSize: 12,
    fontWeight: Font.medium,
    color: Colors.dark,
  },

  // ── Footer: contains price bar + nav bar stacked vertically
  // The BottomNavBar component has position:absolute internally — wrapping both
  // in a fixed-height container keeps them in-flow and always visible.
  footer: {
    // BottomNavBar renders itself as 96px tall with position:absolute.
    // We must give the footer a minHeight that matches the nav so the
    // nav doesn't escape the container. We also add the priceBar height.
    minHeight: 96 + 64,      // navBar(96) + priceBar(~64)
    position: 'relative',    // BottomNavBar's absolute is relative to this
    overflow: 'hidden',
  },

  // Price + CTA bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: Font.regular,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: Font.bold,
    color: Colors.green,
    lineHeight: 28,
  },
  viewSellerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.green,
    borderRadius: Radius.lg,
    paddingHorizontal: 22,
    paddingVertical: 13,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  viewSellerText: {
    fontSize: 14,
    fontWeight: Font.bold,
    color: Colors.white,
  },
});
