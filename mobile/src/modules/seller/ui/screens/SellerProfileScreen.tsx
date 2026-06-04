import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Radius } from '@/shared/utils/theme';
import { Feather, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useAuth } from '@/modules/auth/state/auth.context';
import authApi, { AuthUser } from '@/modules/auth/api/auth.api';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import productsApi, { Product } from '../../api/products.api';
import reviewsApi, { Review } from '../../api/reviews.api';

type Props = NativeStackScreenProps<AppStackParamList, 'SellerProfile'>;

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
  const { t, isRTL } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 600);

  const targetSellerId = route?.params?.sellerId;
  const isOwnProfile = !targetSellerId || targetSellerId === user?._id;

  const [sellerDetails, setSellerDetails] = useState<AuthUser | null>(null);
  const [sellerLoading, setSellerLoading] = useState(false);

  // Sellers can only VIEW; non-sellers (celiac / proche / pro_health) can WRITE
  const isSeller = user?.profileType === 'pro_commerce';
  const canWriteReview = !isOwnProfile && !isSeller;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Review state ──────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewProductId, setReviewProductId] = useState<string | undefined>(undefined);
  const [submittingReview, setSubmittingReview] = useState(false);

  const s = React.useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.bg },
    flex: { flex: 1 },
    content: { paddingHorizontal: 28, paddingTop: 16 },

    // Top Header Styling
    header: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
      right: isRTL ? undefined : -1,
      left: isRTL ? -1 : undefined,
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
      textAlign: isRTL ? 'right' : 'left',
    },
    headerActions: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
      right: isRTL ? undefined : 6,
      left: isRTL ? 6 : undefined,
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
      alignItems: isRTL ? 'flex-end' : 'flex-start',
    },
    bakeryName: {
      fontSize: 20.4,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginBottom: 4,
      textAlign: isRTL ? 'right' : 'left',
    },
    gfTag: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 6,
    },
    gfTagText: {
      fontSize: 11.9,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.textMuted,
      textAlign: isRTL ? 'right' : 'left',
    },

    // Recommended Alert Card
    recommendedCard: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
      marginRight: isRTL ? 0 : 12,
      marginLeft: isRTL ? 12 : 0,
    },
    recommendedTexts: {
      flex: 1,
      alignItems: isRTL ? 'flex-end' : 'flex-start',
    },
    recommendedTitle: {
      fontSize: 11.9,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      textAlign: isRTL ? 'right' : 'left',
    },
    recommendedSub: {
      fontSize: 10.2,
      fontWeight: '400',
      fontFamily: 'Poppins_400Regular',
      color: T.textMuted,
      marginTop: 1,
      textAlign: isRTL ? 'right' : 'left',
    },

    // Details list
    detailsList: {
      gap: 16,
      marginBottom: 24,
      paddingHorizontal: 4,
    },
    detailsItem: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
    },
    detailsIconBox: {
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: isRTL ? 0 : 12,
      marginLeft: isRTL ? 12 : 0,
    },
    detailsTextBox: {
      flex: 1,
      alignItems: isRTL ? 'flex-end' : 'flex-start',
    },
    detailsText: {
      fontSize: 11.9,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      color: T.text,
      textAlign: isRTL ? 'right' : 'left',
    },
    detailsDistance: {
      fontSize: 10.2,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.green,
      marginTop: 2,
      textAlign: isRTL ? 'right' : 'left',
    },

    // Action Grid
    actionGrid: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 12,
      marginBottom: 28,
      paddingHorizontal: 4,
    },
    customerActionBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
      textAlign: isRTL ? 'right' : 'left',
    },
    seeAllText: {
      fontSize: 11.9,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.green,
      textAlign: isRTL ? 'right' : 'left',
    },

    // Products Menu Horizontal List
    productsScrollContainer: {
      paddingHorizontal: 4,
      paddingBottom: 24,
      gap: 16,
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
      left: isRTL ? undefined : 8,
      right: isRTL ? 8 : undefined,
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
      alignItems: isRTL ? 'flex-end' : 'flex-start',
    },
    productCategory: {
      fontSize: 9.5,
      color: T.textMuted,
      fontWeight: '500',
      fontFamily: 'Poppins_500Medium',
      textTransform: 'uppercase',
      marginBottom: 4,
      textAlign: isRTL ? 'right' : 'left',
    },
    productName: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginBottom: 8,
      textAlign: isRTL ? 'right' : 'left',
    },
    productPriceRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
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
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    ratingContainer: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
      gap: 14,
    },
    reviewCard: {
      backgroundColor: T.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: T.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    reviewCardTop: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    reviewInitialRing: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: isRTL ? 0 : 12,
      marginLeft: isRTL ? 12 : 0,
      borderWidth: 2,
    },
    reviewAvatarImage: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: isRTL ? 0 : 12,
      marginLeft: isRTL ? 12 : 0,
      borderWidth: 2,
      borderColor: T.border,
    },
    reviewAuthorBox: {
      flex: 1,
      justifyContent: 'center',
      alignItems: isRTL ? 'flex-end' : 'flex-start',
    },
    reviewAuthor: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
      color: T.text,
      marginBottom: 3,
      textAlign: isRTL ? 'right' : 'left',
    },
    starsRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 3,
    },
    reviewDateText: {
      fontSize: 10,
      color: T.textMuted,
      fontFamily: 'Poppins_400Regular',
      marginLeft: 6,
    },
    reviewComment: {
      fontSize: 13,
      color: T.textSub,
      lineHeight: 20,
      textAlign: isRTL ? 'right' : 'left',
      fontFamily: 'Poppins_400Regular',
    },
    reviewSummaryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 5,
      borderWidth: 1,
      borderColor: T.border,
    },
  }), [T, screenWidth, isRTL]);

  const fetchProducts = useCallback(async () => {
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
  }, [isOwnProfile, user?._id, targetSellerId]);

  // Fetch reviews for the first product belonging to this seller
  const fetchReviews = useCallback(async (productList: Product[]) => {
    try {
      setReviewsLoading(true);
      if (productList.length > 0) {
        const firstPid = productList[0]._id;
        setReviewProductId(firstPid);
        const data = await reviewsApi.list({ productId: firstPid, limit: 10 });
        setReviews(data);
      } else {
        setReviews([]);
      }
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchProducts);
    return unsubscribe;
  }, [navigation, fetchProducts]);

  // After products load, fetch reviews
  useEffect(() => {
    fetchReviews(products);
  }, [products, fetchReviews]);

  // Fetch seller profile details dynamically
  useEffect(() => {
    if (!isOwnProfile && targetSellerId) {
      let mounted = true;
      (async () => {
        try {
          setSellerLoading(true);
          const data = await authApi.getUserById(targetSellerId);
          if (mounted) {
            setSellerDetails(data);
          }
        } catch (error) {
          console.error('Error fetching seller details:', error);
        } finally {
          if (mounted) {
            setSellerLoading(false);
          }
        }
      })();
      return () => {
        mounted = false;
      };
    }
  }, [isOwnProfile, targetSellerId]);

  const handleSubmitReview = async () => {
    if (!reviewComment.trim() || submittingReview) return;
    try {
      setSubmittingReview(true);
      const created = await reviewsApi.create({
        productId: reviewProductId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviews(prev => [created, ...prev]);
      setShowReviewModal(false);
      setReviewComment('');
      setReviewRating(5);
    } catch (err: any) {
      console.error('Failed to submit review', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // Time-ago helper
  const timeAgo = (iso?: string) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Deterministic avatar color from name
  const AVATAR_COLORS = ['#4ADE80', '#60A5FA', '#F472B6', '#FBBF24', '#A78BFA', '#34D399'];
  const nameColor = (name?: string) => {
    if (!name) return AVATAR_COLORS[0];
    const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
  };

  const currentSeller = isOwnProfile ? user : sellerDetails;
  const displayName = currentSeller?.fullName || 'Pure Treats Bakery';

  if (!isOwnProfile && sellerLoading && !sellerDetails) {
    return (
      <AppScaffold
        title={t('Loading Profile...')}
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
      title={displayName}
      activeTab={isOwnProfile ? 'profile' : 'home'}
      onBack={!isOwnProfile ? () => navigation.goBack() : undefined}
      rightIcon="bell-outline"
      onPressHome={() => navigation.navigate('Home')}
      onPressEvents={() => navigation.navigate('Events')}
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
            source={{ uri: currentSeller?.storeInfo?.imageUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600' }}
            style={s.heroImage}
          />
        </View>

        {/* ── Bakery Info Header ────────────────────────────────────────────── */}
        <View style={s.bakeryHeaderRow}>
          <Text style={s.bakeryName}>{currentSeller?.storeInfo?.storeName || displayName}</Text>
          <View style={s.gfTag}>
            <MaterialCommunityIcons name="storefront" size={14} color={T.textMuted} />
            <Text style={s.gfTagText}>{currentSeller?.storeInfo?.description || '100% Gluten-Free Bakery'}</Text>
          </View>
        </View>

        {/* ── Recommended by Glutenia Card ───────────────────────────────────── */}
        <View style={s.recommendedCard}>
          <View style={s.recommendedIconBox}>
            <Feather name="check" size={20} color="#FFFFFF" />
          </View>
          <View style={s.recommendedTexts}>
            <Text style={s.recommendedTitle}>{t('Recommended by Glutenia')}</Text>
            <Text style={s.recommendedSub}>{t('Verified safe establishment')}</Text>
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
               <Text style={s.detailsText}>{currentSeller?.storeInfo?.address || '125 Rue Casablanca, Tunis'}</Text>
               <Text style={s.detailsDistance}>{t('2.4 km away')}</Text>
             </View>
           </View>
 
           {/* Operating Hours */}
           <View style={s.detailsItem}>
             <View style={s.detailsIconBox}>
               <Feather name="clock" size={15} color={T.red} />
             </View>
             <View style={s.detailsTextBox}>
               <Text style={s.detailsText}>{currentSeller?.storeInfo?.operatingHours || 'Open today • 08:00 - 19:00'}</Text>
             </View>
           </View>
 
           {/* Phone */}
           <View style={s.detailsItem}>
             <View style={s.detailsIconBox}>
               <Feather name="phone" size={15} color={T.red} />
             </View>
             <View style={s.detailsTextBox}>
               <Text style={s.detailsText}>{currentSeller?.storeInfo?.phone || currentSeller?.phone || '+216 12 345 678'}</Text>
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
              <Text style={s.customerFollowText}>{t('Follow')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.customerActionBtn, s.customerMessageBtn]}
              activeOpacity={0.8}
              id="seller-message-btn"
            >
              <Feather name="message-square" size={16} color={T.green} />
              <Text style={s.customerMessageText}>{t('Message')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.actionGrid}>
            {/* Edit Info Button */}
            <TouchableOpacity
              style={[s.actionButton, s.whiteButton]}
              activeOpacity={0.7}
              id="action-edit-info"
              onPress={() => navigation.navigate('EditStore')}
            >
              <View style={s.actionIconContainer}>
                <Feather name="edit-2" size={20} color={T.text} />
              </View>
              <Text style={[s.actionText, { color: T.text }]}>{t('Edit Info')}</Text>
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
                <Text style={[s.actionText, s.whiteText, { fontSize: 10.2 }]}>{t('Add')}</Text>
                <Text style={[s.actionText, s.whiteText, { fontSize: 10.2 }]}>{t('Product')}</Text>
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
              <Text style={[s.actionText, { color: T.text }]}>{t('Dashboard')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Products Menu Header ───────────────────────────────────────────── */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>{t('Bakery Menu')}</Text>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ProductsMarket', { sellerId: currentSeller?._id })}
            id="seller-menu-see-all"
          >
            <Text style={s.seeAllText}>{t('See all')}</Text>
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
              <Text style={{ color: T.textMuted, fontSize: 13.6, fontFamily: 'Poppins_500Medium' }}>{t('No products in the menu yet.')}</Text>
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
                      <View style={s.editProductBtn}>
                        <Feather name="edit-2" size={14} color={T.text} />
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* ── Recent Reviews Header ─────────────────────────────────────────── */}
        <View style={s.reviewsHeaderRow}>
          <Text style={s.sectionTitle}>{t('Recent Reviews')}</Text>
          {avgRating ? (
            <View style={s.reviewSummaryBadge}>
              <FontAwesome name="star" size={12} color="#F59E0B" />
              <Text style={{ fontSize: 13, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.text }}>
                {avgRating}
              </Text>
              <Text style={{ fontSize: 11, color: T.textMuted, fontFamily: 'Poppins_400Regular' }}>
                ({reviews.length})
              </Text>
            </View>
          ) : null}
        </View>

        {/* Write a Review button — only for authenticated non-seller visitors */}
        {canWriteReview && products.length > 0 && (
          <TouchableOpacity
            id="btn-write-review"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: T.greenLight,
              borderRadius: 16,
              paddingHorizontal: 18,
              paddingVertical: 13,
              marginBottom: 18,
              gap: 10,
              borderWidth: 1.5,
              borderColor: T.green,
              shadowColor: T.green,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 3,
            }}
            activeOpacity={0.8}
            onPress={() => setShowReviewModal(true)}
          >
            <View style={{
              width: 32, height: 32, borderRadius: 10,
              backgroundColor: `${T.green}22`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Feather name="edit-3" size={15} color={T.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: T.green, fontFamily: 'Poppins_600SemiBold', fontSize: 14, fontWeight: '600' }}>
                {t('Write a Review')}
              </Text>
              <Text style={{ color: T.textMuted, fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 1 }}>
                {t('Share your experience')}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={T.green} />
          </TouchableOpacity>
        )}

        {/* ── Reviews Feed ─────────────────────────────────────────────────── */}
        <View style={s.reviewsList}>
          {reviewsLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ActivityIndicator color={T.green} size="large" />
            </View>
          ) : reviews.length === 0 ? (
            <View style={{
              alignItems: 'center', paddingVertical: 36,
              backgroundColor: T.surface, borderRadius: 20,
              borderWidth: 1, borderColor: T.border,
              borderStyle: 'dashed',
            }}>
              <View style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: T.surfaceAlt,
                alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              }}>
                <FontAwesome name="star-o" size={24} color={T.textMuted} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', fontFamily: 'Poppins_600SemiBold', color: T.text, marginBottom: 4 }}>
                {t('No reviews yet')}
              </Text>
              <Text style={{ fontSize: 12, color: T.textMuted, fontFamily: 'Poppins_400Regular' }}>
                {canWriteReview ? t('Be the first to leave a review!') : t('Customer reviews will appear here.')}
              </Text>
            </View>
          ) : (
            reviews.map((rev) => {
              const initials = (rev.user?.fullName ?? 'A').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
              const color = nameColor(rev.user?.fullName);
              return (
                <View key={rev.id} style={s.reviewCard}>
                  {/* Top row: avatar + name + stars + date */}
                  <View style={s.reviewCardTop}>
                    {rev.user?.avatarUrl ? (
                      <Image source={{ uri: rev.user.avatarUrl }} style={s.reviewAvatarImage} />
                    ) : (
                      <View style={[s.reviewInitialRing, {
                        backgroundColor: `${color}18`,
                        borderColor: `${color}55`,
                      }]}>
                        <Text style={{ color, fontWeight: '700', fontSize: 15, fontFamily: 'Poppins_700Bold' }}>
                          {initials}
                        </Text>
                      </View>
                    )}
                    <View style={s.reviewAuthorBox}>
                      <Text style={s.reviewAuthor}>{rev.user?.fullName ?? 'Anonymous'}</Text>
                      <View style={s.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FontAwesome
                            key={star}
                            name={star <= rev.rating ? 'star' : 'star-o'}
                            size={11}
                            color={star <= rev.rating ? '#F59E0B' : T.border}
                          />
                        ))}
                        <Text style={s.reviewDateText}>{timeAgo(rev.createdAt)}</Text>
                      </View>
                    </View>
                    {/* Rating badge pill */}
                    <View style={{
                      backgroundColor: rev.rating >= 4 ? `${T.green}18` : rev.rating >= 3 ? `#F59E0B18` : `${T.red}18`,
                      borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
                      flexDirection: 'row', alignItems: 'center', gap: 3,
                    }}>
                      <Text style={{
                        fontSize: 12, fontWeight: '700', fontFamily: 'Poppins_700Bold',
                        color: rev.rating >= 4 ? T.green : rev.rating >= 3 ? '#F59E0B' : T.red,
                      }}>
                        {rev.rating}.0
                      </Text>
                    </View>
                  </View>
                  {/* Comment with left accent bar */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ width: 3, borderRadius: 2, backgroundColor: `${color}55`, alignSelf: 'stretch' }} />
                    <Text style={s.reviewComment}>{rev.comment}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>


        {/* ── Write Review Modal (non-sellers only) ─────────────────────────── */}
        <Modal
          visible={showReviewModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowReviewModal(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1, justifyContent: 'flex-end' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={{
              backgroundColor: T.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 20,
            }}>
              {/* Handle */}
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 20 }} />

              <Text style={{ fontSize: 17, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.text, marginBottom: 4 }}>
                {t('Write a Review')}
              </Text>
              <Text style={{ fontSize: 12, color: T.textMuted, fontFamily: 'Poppins_400Regular', marginBottom: 20 }}>
                {t('Share your experience')} {displayName}
              </Text>

              {/* Star picker */}
              <Text style={{ fontSize: 11, color: T.textMuted, marginBottom: 8, fontFamily: 'Poppins_500Medium' }}>{t('Your rating')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setReviewRating(star)} id={`star-${star}`}>
                    <FontAwesome
                      name="star"
                      size={28}
                      color={star <= reviewRating ? T.red : T.border}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Comment input */}
              <Text style={{ fontSize: 11, color: T.textMuted, marginBottom: 8, fontFamily: 'Poppins_500Medium' }}>{t('Your comment')}</Text>
              <TextInput
                id="review-comment-input"
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder={t('Tell others about your experience...')}
                placeholderTextColor={T.textMuted}
                multiline
                numberOfLines={4}
                style={{
                  borderWidth: 1,
                  borderColor: T.border,
                  borderRadius: 14,
                  padding: 14,
                  color: T.text,
                  backgroundColor: T.bg,
                  fontFamily: 'Poppins_400Regular',
                  fontSize: 13,
                  minHeight: 90,
                  textAlignVertical: 'top',
                  marginBottom: 20,
                }}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  id="btn-cancel-review"
                  style={{
                    flex: 1, height: 48, borderRadius: 14,
                    borderWidth: 1, borderColor: T.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                  onPress={() => { setShowReviewModal(false); setReviewComment(''); setReviewRating(5); }}
                >
                  <Text style={{ color: T.textMuted, fontFamily: 'Poppins_500Medium', fontSize: 14 }}>{t('Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  id="btn-submit-review"
                  style={{
                    flex: 2, height: 48, borderRadius: 14,
                    backgroundColor: T.green,
                    alignItems: 'center', justifyContent: 'center',
                    opacity: submittingReview || !reviewComment.trim() ? 0.6 : 1,
                  }}
                  onPress={handleSubmitReview}
                  disabled={submittingReview || !reviewComment.trim()}
                >
                  {submittingReview ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14, fontWeight: '600' }}>{t('Submit Review')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Spacer for bottom navigation overlap prevention */}
        <View style={{ height: 110 }} />
      </ScrollView>
    </AppScaffold>
  );
}


