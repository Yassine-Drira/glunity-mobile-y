import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useCart, CartItem } from '../../context/CartContext';

type Props = NativeStackScreenProps<AppStackParamList, 'Cart'>;

export default function CartScreen({ navigation }: Props) {
  const { theme: colors } = useTheme();
  const { t } = useLanguage();
  const { items, itemCount, subtotal, deliveryFee, total, updateQuantity, removeFromCart, clearCart } = useCart();

  const handleClear = () => {
    Alert.alert(
      t('Vider le panier', 'Vider le panier'),
      t('Voulez-vous vraiment vider votre panier ?', 'Voulez-vous vraiment vider votre panier ?'),
      [
        { text: t('Annuler', 'Annuler'), style: 'cancel' },
        { text: t('Vider', 'Vider'), style: 'destructive', onPress: clearCart },
      ]
    );
  };

  const renderHistoryBanner = () => (
    <TouchableOpacity
      style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('UserOrders')}
    >
      <View style={styles.historyRow}>
        <View style={[styles.historyIconBg, { backgroundColor: colors.bg }]}>
          <MaterialCommunityIcons name="clock-outline" size={22} color={colors.green} />
        </View>
        <View style={styles.historyTextWrap}>
          <Text style={[styles.historyTitle, { color: colors.text }]}>
            {t('Consulter mes commandes passées', 'Consulter mes commandes passées')}
          </Text>
          <Text style={[styles.historySub, { color: colors.textMuted }]}>
            {t('Suivez l\'état de vos livraisons en cours', 'Suivez l\'état de vos livraisons en cours')}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={[styles.cartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Image
        source={{ uri: item.image || 'https://via.placeholder.com/80?text=Product' }}
        style={styles.itemImage}
        resizeMode="cover"
      />
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.itemPrice, { color: colors.green }]}>
          {item.price.toFixed(2)} DT
        </Text>
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={[styles.qtyBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
          >
            <Feather name="minus" size={16} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
          <TouchableOpacity
            style={[styles.qtyBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
          >
            <Feather name="plus" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => removeFromCart(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="trash-2" size={18} color="#E53935" />
      </TouchableOpacity>
    </View>
  );

  return (
    <AppScaffold
      title={t('Mon Panier', 'Mon Panier')}
      activeTab="home"
      onBack={() => navigation.goBack()}
    >
      <View style={styles.container}>
        {renderHistoryBanner()}

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBg, { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name="cart-outline" size={54} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t('Votre panier actuel est vide', 'Votre panier actuel est vide')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {t('Découvrez nos produits sans gluten et ajoutez-les à votre panier !', 'Découvrez nos produits sans gluten et ajoutez-les à votre panier !')}
            </Text>
            <TouchableOpacity
              style={[styles.browseBtn, { backgroundColor: colors.green }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.browseBtnText}>{t('Explorer le marché', 'Explorer le marché')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.flexOne}>
            <FlatList
              data={items}
              keyExtractor={(i) => i.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('Sous-total', 'Sous-total')} ({itemCount} articles)</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{subtotal.toFixed(2)} DT</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('Frais de livraison', 'Frais de livraison')}</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{deliveryFee.toFixed(2)} DT</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>{t('Total', 'Total')}</Text>
                <Text style={[styles.totalValue, { color: colors.green }]}>{total.toFixed(2)} DT</Text>
              </View>
              <TouchableOpacity
                style={[styles.checkoutBtn, { backgroundColor: colors.green }]}
                onPress={() => navigation.navigate('Checkout')}
              >
                <Text style={styles.checkoutBtnText}>{t('Passer la commande', 'Passer la commande')}</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  flexOne: {
    flex: 1,
  },
  historyCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTextWrap: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  historySub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 16,
    gap: 12,
  },
  cartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 12,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  deleteBtn: {
    padding: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
    paddingBottom: 40,
  },
  emptyIconBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  browseBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  summaryCard: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
});
