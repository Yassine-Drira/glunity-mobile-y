import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Colors, Font, Spacing, Radius } from '@/shared/utils/theme';
import { Feather, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import { useAuth } from '../../../auth/state/auth.context';
import { BottomNavBar } from '@/shared/components/BottomNavBar';
import productsApi, { Product } from '../../api/products.api';

type Props = NativeStackScreenProps<AppStackParamList, 'SellerProfile'>;

const { width } = Dimensions.get('window');

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
    comment: '100% safe for celiac. Their bread doesn\'t crumble at all! Highly recommend.',
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

export default function SellerProfileScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productsApi.list({ sellerId: user?._id });
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching seller products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchProducts();
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?._id) {
        fetchProducts();
      }
    });
    return unsubscribe;
  }, [navigation, user]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Header ────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.userRow}>
            <View style={s.avatarContainer}>
              <Image
                source={{ uri: user?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150' }}
                style={s.avatarImage}
              />
              <View style={s.verifiedBadge}>
                <Feather name="check" size={8} color={Colors.white} />
              </View>
            </View>
            <Text style={s.greeting}>{user?.fullName || 'Seller'}</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} id="seller-search-btn">
              <Feather name="search" size={18} color="#393C40" />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} id="seller-notif-btn">
              <Feather name="bell" size={18} color="#393C40" />
              <View style={s.notifIndicator} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Bakery Hero Image Cover ───────────────────────────────────────── */}
        <View style={s.heroContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600' }}
            style={s.heroImage}
          />
        </View>

        {/* ── Bakery Info Header ────────────────────────────────────────────── */}
        <View style={s.bakeryHeaderRow}>
          <Text style={s.bakeryName}>Pure Treats Bakery</Text>
          <View style={s.gfTag}>
            <MaterialCommunityIcons name="storefront" size={14} color="rgba(46, 46, 46, 0.7)" />
            <Text style={s.gfTagText}>100% Gluten-Free Bakery</Text>
          </View>
        </View>

        {/* ── Recommended by Glutenia Card ───────────────────────────────────── */}
        <View style={s.recommendedCard}>
          <View style={s.recommendedIconBox}>
            <Feather name="check" size={20} color={Colors.white} />
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
              <Feather name="map-pin" size={15} color="#C8102E" />
            </View>
            <View style={s.detailsTextBox}>
              <Text style={s.detailsText}>125 Rue Casablanca, Tunis</Text>
              <Text style={s.detailsDistance}>2.4 km away</Text>
            </View>
          </View>

          {/* Operating Hours */}
          <View style={s.detailsItem}>
            <View style={s.detailsIconBox}>
              <Feather name="clock" size={15} color="#C8102E" />
            </View>
            <View style={s.detailsTextBox}>
              <Text style={s.detailsText}>Open today • 08:00 - 19:00</Text>
            </View>
          </View>

          {/* Phone */}
          <View style={s.detailsItem}>
            <View style={s.detailsIconBox}>
              <Feather name="phone" size={15} color="#C8102E" />
            </View>
            <View style={s.detailsTextBox}>
              <Text style={s.detailsText}>+216 12 345 678</Text>
            </View>
          </View>
        </View>

        {/* ── Quick Action Grid ─────────────────────────────────────────────── */}
        <View style={s.actionGrid}>
          {/* Edit Info Button */}
          <TouchableOpacity style={[s.actionButton, s.whiteButton]} activeOpacity={0.7} id="action-edit-info">
            <View style={s.actionIconContainer}>
              <Feather name="edit-2" size={20} color={Colors.dark} />
            </View>
            <Text style={[s.actionText, { color: Colors.dark }]}>Edit Info</Text>
          </TouchableOpacity>

          {/* Add Product Button */}
          <TouchableOpacity
            style={[s.actionButton, s.greenButton]}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('AddProduct')}
            id="action-add-product"
          >
            <View style={s.actionIconContainer}>
              <Feather name="plus" size={20} color={Colors.white} />
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
              <Feather name="bar-chart-2" size={20} color={Colors.dark} />
            </View>
            <Text style={[s.actionText, { color: Colors.dark }]}>Dashboard</Text>
          </TouchableOpacity>
        </View>

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
              <Text style={{ color: 'rgba(46, 46, 46, 0.4)', fontSize: 13.6, fontWeight: Font.medium }}>Loading menu...</Text>
            </View>
          ) : products.length === 0 ? (
            <View style={{ paddingVertical: 20, paddingHorizontal: 12 }}>
              <Text style={{ color: 'rgba(46, 46, 46, 0.4)', fontSize: 13.6, fontWeight: Font.medium }}>No products in your menu yet.</Text>
            </View>
          ) : (
            products.map((prod) => (
              <View key={prod._id} style={s.productCard}>
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
                    <TouchableOpacity 
                      style={s.editProductBtn} 
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('AddProduct', { product: prod })}
                    >
                      <Feather name="edit-2" size={14} color={Colors.dark} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* ── Recent Reviews Header ─────────────────────────────────────────── */}
        <View style={s.reviewsHeaderRow}>
          <Text style={s.sectionTitle}>Recent Reviews</Text>
          <View style={s.ratingContainer}>
            <Text style={s.ratingText}>4.8</Text>
            <FontAwesome name="star" size={14} color="#C8102E" style={{ marginLeft: 6 }} />
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
                        color={star <= rev.rating ? '#C8102E' : 'rgba(46, 46, 46, 0.2)'}
                        style={{ marginRight: 3 }}
                      />
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Spacer for bottom navigation overlap prevention */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Bottom Navigation Bar ─────────────────────────────────────────── */}
      <BottomNavBar
        activeTab="home"
        idPrefix="home-nav"
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 28, paddingTop: 16 },

  // Top Header Styling
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    borderColor: '#E2E8F0',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
  greeting: {
    fontSize: 18,
    fontWeight: Font.medium,
    color: '#343831',
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
    backgroundColor: '#F6F5F3',
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
    backgroundColor: Colors.green,
    borderWidth: 1.5,
    borderColor: Colors.bg,
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
    fontWeight: Font.bold,
    color: '#2E2E2E',
    marginBottom: 4,
  },
  gfTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gfTagText: {
    fontSize: 11.9,
    fontWeight: Font.medium,
    color: 'rgba(46, 46, 46, 0.7)',
  },

  // Recommended Alert Card
  recommendedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
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
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recommendedTexts: {
    flex: 1,
  },
  recommendedTitle: {
    fontSize: 11.9,
    fontWeight: Font.bold,
    color: '#2E2E2E',
  },
  recommendedSub: {
    fontSize: 10.2,
    fontWeight: Font.regular,
    color: 'rgba(46, 46, 46, 0.7)',
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
    fontWeight: Font.medium,
    color: '#2E2E2E',
  },
  detailsDistance: {
    fontSize: 10.2,
    fontWeight: Font.bold,
    color: Colors.green,
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
    width: 103.33,
    height: 91.78,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  whiteButton: {
    backgroundColor: Colors.white,
  },
  greenButton: {
    backgroundColor: Colors.green,
    shadowColor: Colors.green,
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
    fontWeight: Font.bold,
    textAlign: 'center',
  },
  whiteText: {
    color: Colors.white,
  },
  actionMultiLineText: {
    alignItems: 'center',
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
    fontWeight: Font.bold,
    color: Colors.dark,
  },
  seeAllText: {
    fontSize: 11.9,
    fontWeight: Font.bold,
    color: Colors.green,
  },

  // Products Menu Horizontal List
  productsScrollContainer: {
    paddingHorizontal: 4,
    paddingBottom: 24,
    gap: 16,
  },
  productCard: {
    width: 150,
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gfProductBadgeText: {
    fontSize: 9,
    fontWeight: Font.bold,
    color: Colors.white,
  },
  productInfo: {
    paddingHorizontal: 4,
  },
  productCategory: {
    fontSize: 9.5,
    color: 'rgba(46, 46, 46, 0.5)',
    fontWeight: Font.medium,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  productName: {
    fontSize: 13,
    fontWeight: Font.bold,
    color: Colors.dark,
    marginBottom: 8,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 13.6,
    fontWeight: Font.bold,
    color: Colors.green,
  },
  editProductBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F6F5F3',
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
    fontWeight: Font.bold,
    color: Colors.dark,
  },

  // Reviews list & Cards
  reviewsList: {
    gap: 16,
    paddingHorizontal: 4,
  },
  reviewCard: {
    backgroundColor: Colors.white,
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
  },
  reviewAvatarImage: {
    width: 49,
    height: 49,
    borderRadius: 24.5,
    marginRight: 18,
  },
  reviewAuthorBox: {
    flex: 1,
    justifyContent: 'center',
  },
  reviewAuthor: {
    fontSize: 15,
    fontWeight: Font.bold,
    color: Colors.dark,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
  },

  // Bottom Navigation Bar
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 10,
  },
  navBtn: { alignItems: 'center', gap: 2, minWidth: 48 },
  navLabel: { fontSize: 8.5, fontWeight: Font.medium, color: Colors.dark, marginTop: 2 },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    borderWidth: 4,
    borderColor: Colors.bg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  scannerGrid: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scannerBracket: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: 2,
  },
});
