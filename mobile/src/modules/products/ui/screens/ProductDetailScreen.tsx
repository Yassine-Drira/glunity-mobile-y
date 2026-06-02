import React, { useMemo, useEffect } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppScaffold } from '@/shared/components/AppScaffold';
import { Radius } from '@/shared/utils/theme';
import { useAuth } from '@/modules/auth/state/auth.context';
import type { AppStackParamList } from '@/navigation/types';
import productsApi, { Product } from '@/modules/seller/api/products.api';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';

// ─── Constants ────────────────────────────────────────────────────────────────
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
  const { product: initialProduct, productId } = route.params as { product?: Product; productId?: string };
  const [product, setProduct] = React.useState<Product | null>(initialProduct || null);
  const [loading, setLoading] = React.useState(!initialProduct && !!productId);
  const { user }    = useAuth();
  const { theme: T } = useTheme();
  const { t }       = useLanguage();
  const insets      = useSafeAreaInsets();

  React.useEffect(() => {
    if (initialProduct) {
      setProduct(initialProduct);
      return;
    }
    if (productId) {
      let mounted = true;
      (async () => {
        try {
          const res = await productsApi.getById(productId);
          if (res.success && mounted) {
            setProduct(res.data);
          }
        } catch (err) {
          console.warn('Failed to load product by ID:', err);
        } finally {
          if (mounted) setLoading(false);
        }
      })();
      return () => { mounted = false; };
    }
  }, [initialProduct, productId]);

  React.useEffect(() => {
    // Silently track this product view on open (fire-and-forget)
    if (product?._id) {
      productsApi.trackView(product._id).catch(() => {});
    }
  }, [product?._id]);

  const s = React.useMemo(() => StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: T.bg,
    },

    // ── Top header — plain in-flow, never overlaps image
    topHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: T.bg,
    },
    backBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: T.surfaceAlt,
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
      backgroundColor: T.surfaceAlt,
    },
    avatarFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    greeting: {
      fontSize: 16,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.text,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: T.surfaceAlt,
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
      width: '100%',
      height: HERO_H,
      backgroundColor: T.surfaceAlt,
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
      borderColor: T.red,
      borderRadius: Radius.full,
      paddingHorizontal: 14,
      paddingVertical: 5,
      marginBottom: 12,
    },
    categoryPillText: {
      fontSize: 11,
      fontWeight: '600',
      fontFamily: 'Poppins_600SemiBold',
      color: T.red,
    },

    // Product name
    productName: {
      fontSize: 26,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
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
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.text,
      lineHeight: 20,
    },
    infoSub: {
      fontSize: 11,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.green,
      marginTop: 2,
    },

    // Sections
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginBottom: 8,
    },
    description: {
      fontSize: 13,
      color: T.textSub,
      lineHeight: 21,
      marginBottom: 22,
      fontFamily: 'Poppins_400Regular',
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
      borderColor: T.border,
      borderRadius: Radius.full,
      paddingHorizontal: 14,
      paddingVertical: 6,
      backgroundColor: T.surface,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.text,
    },

    // ── Footer: price bar only (nav handled globally)
    footer: {
      position: 'relative',
    },

    // Price + CTA bar
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 14,
      backgroundColor: T.surface,
      borderTopWidth: 1,
      borderTopColor: T.border,
    },
    priceLabel: {
      fontSize: 11,
      color: T.textMuted,
      fontWeight: '400',
      fontFamily: 'Poppins_400Regular',
    },
    priceValue: {
      fontSize: 22,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.green,
      lineHeight: 28,
    },
    viewSellerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: T.green,
      borderRadius: Radius.lg,
      paddingHorizontal: 22,
      paddingVertical: 13,
      shadowColor: T.green,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    viewSellerText: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: '#FFFFFF',
    },
  }), [T]);

  const imageUri    = useMemo(() => product ? getProductImage(product) : '', [product]);
  const sellerName  = useMemo(() => product ? getSellerName(product.sellerId) : '', [product?.sellerId]);
  const description = useMemo(
    () => (product && CATEGORY_DESCRIPTIONS[product.category]) ?? DEFAULT_DESCRIPTION,
    [product?.category],
  );

  const handleProfileNav = () => {
    navigation.navigate(user?.profileType === 'pro_commerce' ? 'SellerProProfile' : 'Profile');
  };

  const headerActions = (
    <View style={s.headerActions}>
      <TouchableOpacity style={[s.iconBtn, { backgroundColor: T.surfaceAlt }]} activeOpacity={0.7} id="detail-search-btn">
        <Feather name="search" size={18} color={T.text} />
      </TouchableOpacity>
      <TouchableOpacity style={[s.iconBtn, { backgroundColor: T.surfaceAlt }]} activeOpacity={0.7} id="detail-notif-btn">
        <Feather name="bell" size={18} color={T.text} />
      </TouchableOpacity>
    </View>
  );

  if (loading || !product) {
    return (
      <AppScaffold
        title={t('Loading...')}
        activeTab="home"
        onBack={() => navigation.goBack()}
        contentStyle={{ backgroundColor: T.bg }}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={T.green} />
        </View>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold
      title={t(product.name)}
      activeTab="home"
      onBack={() => navigation.goBack()}
      rightElement={headerActions}
      onPressHome={() => navigation.navigate('Home')}
      onPressEvents={() => navigation.navigate('Map')}
      onPressCenter={() => {}}
      onPressReels={() => {}}
      onPressProfile={handleProfileNav}
      contentStyle={{ backgroundColor: T.bg }}
    >

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
        <View style={[s.contentArea, { backgroundColor: T.bg }]}>

          {/* Category pill */}
          <View style={[s.categoryPill, { backgroundColor: T.greenLight, borderColor: T.greenBorder }]}>
            <Text style={[s.categoryPillText, { color: T.green }]}>{t(product.category)}</Text>
          </View>

          {/* Product name */}
          <Text style={[s.productName, { color: T.text }]}>{t(product.name)}</Text>

          {/* Info rows */}
          <View style={s.infoSection}>
            <View style={s.infoRow}>
              <Feather name="map-pin" size={15} color={T.red} style={s.infoIcon} />
              <View>
                <Text style={[s.infoMain, { color: T.text }]}>{t('125 Rue Casablanca, Tunis')}</Text>
                <Text style={[s.infoSub, { color: T.textMuted }]}>{t('2.4 km away')}</Text>
              </View>
            </View>

            <View style={s.infoRow}>
              <Feather name="clock" size={15} color={T.red} style={s.infoIcon} />
              <Text style={[s.infoMain, { color: T.text }]}>{t('Open today • 08:00 - 19:00')}</Text>
            </View>

            <View style={s.infoRow}>
              <Feather name="phone" size={15} color={T.red} style={s.infoIcon} />
              <Text style={[s.infoMain, { color: T.text }]}>+216 12 345 678</Text>
            </View>
          </View>

          {/* About section */}
          <Text style={[s.sectionTitle, { color: T.text }]}>{t('About this product')}</Text>
          <Text style={[s.description, { color: T.textSub }]}>{t(description)}</Text>

          {/* Ingredients */}
          {product.ingredients && product.ingredients.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: T.text }]}>{t('Ingredients')}</Text>
              <View style={s.ingredientsWrap}>
                {product.ingredients.map((ing, i) => (
                  <View key={`${ing}-${i}`} style={[s.chip, { backgroundColor: T.surface, borderColor: T.border }]}
                  >
                    <Text style={[s.chipText, { color: T.text }]}>{t(ing)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/*
        ══ FOOTER ══
        A fixed-height in-flow container that holds the price/CTA bar.
        The global nav bar is rendered by AppScaffold.
      */}
      <View style={[s.footer, { paddingBottom: 96 + Math.max(insets.bottom, 8) }]}>
        {/* Price + View Seller bar */}
        <View style={[s.bottomBar, { backgroundColor: T.surface, borderTopColor: T.border }]}>
          <View>
            <Text style={[s.priceLabel, { color: T.textMuted }]}>{t('Price')}</Text>
            <Text style={[s.priceValue, { color: T.green }]}>{product.price}TND</Text>
          </View>

          <TouchableOpacity
            style={[s.viewSellerBtn, { backgroundColor: T.green, shadowColor: T.green }]}
            activeOpacity={0.85}
            onPress={() => {
              const sellerId = typeof product.sellerId === 'object' ? product.sellerId?._id : product.sellerId;
              navigation.navigate('SellerProfile', { sellerId });
            }}
            id="detail-view-seller-btn"
          >
            <Feather name="shopping-bag" size={16} color="#FFFFFF" />
            <Text style={s.viewSellerText}>{t('View Seller')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppScaffold>
  );
}


