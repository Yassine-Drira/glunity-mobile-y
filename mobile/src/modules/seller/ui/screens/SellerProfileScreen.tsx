import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Radius } from '@/shared/utils/theme';
import { Feather, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useAuth } from '@/modules/auth/state/auth.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import productsApi, { Product } from '../../api/products.api';

type Props = NativeStackScreenProps<AppStackParamList, 'SellerProfile'>;

const REVIEWS = [
  {
    id: '1',
    author: 'Aziz Ayari',
    rating: 4,
    comment: 'The gluten-free croissants are absolutely wonderful! Best bakery in Tunis.',
    time: '2 hours ago',
    initials: 'AA',
    bgColor: '#E8F5E9',
  },
  {
    id: '2',
    author: 'Aziz Ayari',
    rating: 4,
    comment: "100% safe for celiac. Their bread doesn't crumble at all! Highly recommend.",
    time: 'Yesterday',
    initials: 'AA',
    bgColor: '#E8F5E9',
  },
  {
    id: '3',
    author: 'Aziz Ayari',
    rating: 4,
    comment: 'Very tasty treats and friendly staff. Love the Tunis branch.',
    time: '3 days ago',
    initials: 'AA',
    bgColor: '#E8F5E9',
  },
];

const getProductImage = (images?: string[], category?: string) => {
  const uri = images?.[0];
  if (uri && !uri.startsWith('blob:')) {
    return uri;
  }
  
  // High-quality category-specific Unsplash fallbacks
  switch (category) {
    case 'Bakery':
      return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400';
    case 'Pastry & Cakes':
      return 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=400';
    case 'Breads & Buns':
      return 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?q=80&w=400';
    case 'Flour & Mixes':
      return 'https://images.unsplash.com/photo-1574085733277-851d9d856a3a?q=80&w=400';
    case 'Snacks':
      return 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=400';
    case 'Desserts':
      return 'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=400';
    default:
      return 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=400';
  }
};

export default function SellerProfileScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { theme: T } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 600);
  
  const targetSellerId = route?.params?.sellerId;
  const targetSeller = route?.params?.seller;
  const isOwnProfile = !targetSellerId || targetSellerId === user?._id;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const s = React.useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    flex: { flex: 1 },
    content: { paddingHorizontal: 28, paddingTop: 16 },

    // Top Header Styling
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: T.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: 'rgba(0,0,0,0.05)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    avatarContainer: {
      position: 'relative',
      width: 40,
      height: 40,
    },
    avatarImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: T.border,
    },
    verifiedBadge: {
      position: 'absolute',
      bottom: -1,
      right: -1,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: T.green,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: T.bg,
    },
    greeting: {
      fontSize: 18,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.text,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: T.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    notifIndicator: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: T.green,
      borderWidth: 1.5,
      borderColor: T.bg,
    },

    // Hero Cover Image
    heroContainer: {
      width: '100%',
      height: 256,
      borderRadius: 40,
      overflow: 'hidden',
      marginBottom: 16,
    },
    heroImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },

    // Title section
    bakeryHeaderRow: {
      marginBottom: 14,
      paddingHorizontal: 4,
    },
    bakeryName: {
      fontSize: 20.4,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginBottom: 4,
    },
    gfTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    gfTagText: {
      fontSize: 11.9,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.textMuted,
    },

    // Recommended Alert Card
    recommendedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.greenLight,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 20,
      marginHorizontal: 4,
    },
    recommendedIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: T.green,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    recommendedTexts: {
      flex: 1,
    },
    recommendedTitle: {
      fontSize: 11.9,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
    },
    recommendedSub: {
      fontSize: 10.2,
      fontWeight: '400',
      fontFamily: 'Poppins_400Regular',
      color: T.textMuted,
      marginTop: 1,
    },

    // Details list
    detailsList: {
      gap: 16,
      marginBottom: 24,
      paddingHorizontal: 4,
    },
    detailsItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailsIconBox: {
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    detailsTextBox: {
      flex: 1,
    },
    detailsText: {
      fontSize: 11.9,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.text,
    },
    detailsDistance: {
      fontSize: 10.2,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.green,
      marginTop: 2,
    },

    // Action Grid
    actionGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 28,
      paddingHorizontal: 4,
    },
    actionButton: {
      width: (screenWidth - 72) / 3,
      height: 91.78,
      borderRadius: 16,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: T.surface,
      shadowColor: 'rgba(0,0,0,0.05)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    whiteButton: {
      backgroundColor: T.surface,
    },
    greenButton: {
      backgroundColor: T.green,
      shadowColor: T.green,
    },
    actionIconContainer: {
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    actionText: {
      fontSize: 10.2,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      textAlign: 'center',
    },
    whiteText: {
      color: '#FFFFFF',
    },
    actionMultiLineText: {
      alignItems: 'center',
    },

    // Customer Actions Row (Follow/Message)
    customerActionsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 28,
      paddingHorizontal: 4,
    },
    customerActionBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    customerFollowBtn: {
      backgroundColor: T.green,
    },
    customerFollowText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      fontSize: 14,
    },
    customerMessageBtn: {
      backgroundColor: T.surface,
      borderWidth: 1.5,
      borderColor: T.green,
    },
    customerMessageText: {
      color: T.green,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      fontSize: 14,
    },

    // Section Headers
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    sectionTitle: {
      fontSize: 15.3,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
    },
    seeAllText: {
      fontSize: 11.9,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.green,
    },

    // Products Menu Horizontal List
    productsScrollContainer: {
      paddingHorizontal: 4,
      paddingBottom: 24,
      gap: 16,
    },
    productCard: {
      width: 150,
      backgroundColor: T.surface,
      borderRadius: 20,
      padding: 10,
      shadowColor: 'rgba(0,0,0,0.06)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    productImageContainer: {
      width: '100%',
      height: 120,
      borderRadius: 14,
      overflow: 'hidden',
      position: 'relative',
      marginBottom: 10,
    },
    productImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    gfProductBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: T.green,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    gfProductBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: '#FFFFFF',
    },
    productInfo: {
      paddingHorizontal: 4,
    },
    productCategory: {
      fontSize: 9.5,
      color: T.textMuted,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    productName: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginBottom: 8,
    },
    productPriceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    productPrice: {
      fontSize: 13.6,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.green,
    },
    editProductBtn: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: T.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Reviews Header
    reviewsHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ratingText: {
      fontSize: 11.9,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
    },

    // Reviews list & Cards
    reviewsList: {
      gap: 16,
      paddingHorizontal: 4,
    },
    reviewCard: {
      backgroundColor: T.surface,
      borderRadius: Radius.lg,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    reviewUserInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    reviewAvatarImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    reviewAuthorBox: {
      flex: 1,
      justifyContent: 'center',
    },
    reviewAuthor: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginBottom: 2,
    },
    starsRow: {
      flexDirection: 'row',
    },
    reviewComment: {
      fontSize: 12,
      color: T.textSub,
      lineHeight: 18,
    },
  }), [T, screenWidth]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const sid = isOwnProfile ? user?._id : targetSellerId;
      if (sid) {
        const res = await productsApi.list({ sellerId: sid });
        setProducts(res.data);
      }
    } catch (error) {
      console.error('Error fetching seller products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user?._id, targetSellerId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProducts();
    });
    return unsubscribe;
  }, [navigation, user?._id, targetSellerId]);

  const displayName = isOwnProfile 
    ? (user?.fullName || 'Pure Treats Bakery') 
    : (targetSeller?.fullName || 'Pure Treats Bakery');

  return (
    <AppScaffold
      title={displayName}
      activeTab={isOwnProfile ? 'profile' : 'home'}
      onBack={!isOwnProfile ? () => navigation.goBack() : undefined}
      rightIcon="bell-outline"
      onPressHome={() => navigation.navigate('Home')}
      onPressEvents={() => navigation.navigate('Map')}
      onPressCenter={() => {}}
      onPressReels={() => {}}
      onPressProfile={() => {
        if (user?.profileType === 'pro_commerce') {
          navigation.navigate('SellerProProfile');
        } else {
          navigation.navigate('Profile');
        }
      }}
      contentStyle={{ backgroundColor: T.bg }}
    >
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >


        {/* ── Bakery Hero Image Cover ───────────────────────────────────────── */}
        <View style={s.heroContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600' }}
            style={s.heroImage}
          />
        </View>

        {/* ── Bakery Info Header ────────────────────────────────────────────── */}
        <View style={s.bakeryHeaderRow}>
          <Text style={s.bakeryName}>{displayName}</Text>
          <View style={s.gfTag}>
            <MaterialCommunityIcons name="storefront" size={14} color={T.textMuted} />
            <Text style={s.gfTagText}>100% Gluten-Free Bakery</Text>
          </View>
        </View>

        {/* ── Recommended by Glutenia Card ───────────────────────────────────── */}
        <View style={s.recommendedCard}>
          <View style={s.recommendedIconBox}>
            <Feather name="check" size={20} color="#FFFFFF" />
          </View>
          <View style={s.recommendedTexts}>
            <Text style={s.recommendedTitle}>Recommended by Glutenia</Text>
            <Text style={s.recommendedSub}>Verified safe establishment</Text>
          </View>
        </View>

        {/* ── Contact and Location Details ──────────────────────────────────── */}
        <View style={s.detailsList}>
          {/* Address */}
          <View style={s.detailsItem}>
            <View style={s.detailsIconBox}>
              <Feather name="map-pin" size={15} color={T.red} />
            </View>
            <View style={s.detailsTextBox}>
              <Text style={s.detailsText}>125 Rue Casablanca, Tunis</Text>
              <Text style={s.detailsDistance}>2.4 km away</Text>
            </View>
          </View>

          {/* Operating Hours */}
          <View style={s.detailsItem}>
            <View style={s.detailsIconBox}>
              <Feather name="clock" size={15} color={T.red} />
            </View>
            <View style={s.detailsTextBox}>
              <Text style={s.detailsText}>Open today • 08:00 - 19:00</Text>
            </View>
          </View>

          {/* Phone */}
          <View style={s.detailsItem}>
            <View style={s.detailsIconBox}>
              <Feather name="phone" size={15} color={T.red} />
            </View>
            <View style={s.detailsTextBox}>
              <Text style={s.detailsText}>+216 12 345 678</Text>
            </View>
          </View>
        </View>

        {/* ── Quick Action Grid or Follow/Message Buttons ────────────────────── */}
        {!isOwnProfile ? (
          <View style={s.customerActionsRow}>
            <TouchableOpacity
              style={[s.customerActionBtn, s.customerFollowBtn]}
              activeOpacity={0.8}
              id="seller-follow-btn"
            >
              <Feather name="plus" size={16} color="#FFFFFF" />
              <Text style={s.customerFollowText}>Follow</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.customerActionBtn, s.customerMessageBtn]}
              activeOpacity={0.8}
              id="seller-message-btn"
            >
              <Feather name="message-square" size={16} color={T.green} />
              <Text style={s.customerMessageText}>Message</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.actionGrid}>
            {/* Edit Info Button */}
            <TouchableOpacity style={[s.actionButton, s.whiteButton]} activeOpacity={0.7} id="action-edit-info">
              <View style={s.actionIconContainer}>
                <Feather name="edit-2" size={20} color={T.text} />
              </View>
              <Text style={[s.actionText, { color: T.text }]}>Edit Info</Text>
            </TouchableOpacity>

            {/* Add Product Button */}
            <TouchableOpacity
              style={[s.actionButton, s.greenButton]}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('AddProduct')}
              id="action-add-product"
            >
              <View style={s.actionIconContainer}>
                <Feather name="plus" size={20} color="#FFFFFF" />
              </View>
              <View style={s.actionMultiLineText}>
                <Text style={[s.actionText, s.whiteText, { fontSize: 10.2 }]}>Add</Text>
                <Text style={[s.actionText, s.whiteText, { fontSize: 10.2 }]}>Product</Text>
              </View>
            </TouchableOpacity>

            {/* Dashboard Stats Button */}
            <TouchableOpacity
              style={[s.actionButton, s.whiteButton]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('SellerStats')}
              id="action-view-dashboard"
            >
              <View style={s.actionIconContainer}>
                <Feather name="bar-chart-2" size={20} color={T.text} />
              </View>
              <Text style={[s.actionText, { color: T.text }]}>Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Products Menu Header ───────────────────────────────────────────── */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Bakery Menu</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={s.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {/* ── Products List (Horizontal Scroll) ──────────────────────────────── */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={s.productsScrollContainer}
        >
          {loading ? (
            <View style={{ paddingVertical: 20, paddingHorizontal: 12 }}>
              <ActivityIndicator color={T.green} />
            </View>
          ) : products.length === 0 ? (
            <View style={{ paddingVertical: 20, paddingHorizontal: 12 }}>
              <Text style={{ color: T.textMuted, fontSize: 13.6, fontFamily: 'Poppins_500Medium' }}>No products in the menu yet.</Text>
            </View>
          ) : (
            products.map((prod) => (
              <TouchableOpacity 
                key={prod._id} 
                style={s.productCard}
                activeOpacity={0.9}
                onPress={() => {
                  if (isOwnProfile) {
                    navigation.navigate('AddProduct', { product: prod });
                  } else {
                    navigation.navigate('ProductDetail', { product: prod });
                  }
                }}
              >
                <View style={s.productImageContainer}>
                  <Image 
                    source={{ uri: getProductImage(prod.images, prod.category) }} 
                    style={s.productImage} 
                  />
                  {prod.isGlutenFree && (
                    <View style={s.gfProductBadge}>
                      <Text style={s.gfProductBadgeText}>GF</Text>
                    </View>
                  )}
                </View>
                <View style={s.productInfo}>
                  <Text style={s.productCategory}>{prod.category}</Text>
                  <Text style={s.productName} numberOfLines={1}>{prod.name}</Text>
                  <View style={s.productPriceRow}>
                    <Text style={s.productPrice}>{prod.price} TND</Text>
                    {isOwnProfile && (
                      <TouchableOpacity 
                        style={s.editProductBtn} 
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('AddProduct', { product: prod })}
                      >
                        <Feather name="edit-2" size={14} color={T.text} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* ── Recent Reviews Header ─────────────────────────────────────────── */}
        <View style={s.reviewsHeaderRow}>
          <Text style={s.sectionTitle}>Recent Reviews</Text>
          <View style={s.ratingContainer}>
            <Text style={s.ratingText}>4.8</Text>
            <FontAwesome name="star" size={14} color={T.red} style={{ marginLeft: 6 }} />
          </View>
        </View>

        {/* ── Reviews Feed ─────────────────────────────────────────────────── */}
        <View style={s.reviewsList}>
          {REVIEWS.map((rev, idx) => (
            <View key={idx} style={s.reviewCard}>
              <View style={s.reviewUserInfoRow}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150' }}
                  style={s.reviewAvatarImage}
                />
                <View style={s.reviewAuthorBox}>
                  <Text style={s.reviewAuthor}>{rev.author}</Text>
                  <View style={s.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FontAwesome
                        key={star}
                        name="star"
                        size={12}
                        color={star <= rev.rating ? T.red : T.border}
                        style={{ marginRight: 3 }}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <Text style={s.reviewComment}>{rev.comment}</Text>
            </View>
          ))}
        </View>

        {/* Spacer for bottom navigation overlap prevention */}
        <View style={{ height: 110 }} />
      </ScrollView>
    </AppScaffold>
  );
}


