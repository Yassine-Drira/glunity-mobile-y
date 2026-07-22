import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { getMyOrdersApi, Order, OrderStatus } from '../../api/orders.api';

type Props = NativeStackScreenProps<AppStackParamList, 'UserOrders'>;

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: keyof typeof Feather.glyphMap }> = {
  pending: { label: 'En attente', color: '#FF9800', icon: 'clock' },
  confirmed: { label: 'Confirmée', color: '#2196F3', icon: 'check-circle' },
  shipped: { label: 'En livraison', color: '#9C27B0', icon: 'truck' },
  delivered: { label: 'Livrée', color: '#4CAF50', icon: 'package' },
  cancelled: { label: 'Annulée', color: '#F44336', icon: 'x-circle' },
};

export default function UserOrdersScreen({ navigation }: Props) {
  const { theme: colors } = useTheme();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const data = await getMyOrdersApi();
      setOrders(data || []);
    } catch (e) {
      console.error('Failed to fetch user orders:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.confirmed;
    const formattedDate = new Date(item.createdAt).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.orderHeader}>
          <View style={styles.orderIdWrap}>
            <MaterialCommunityIcons name="receipt" size={20} color={colors.green} />
            <Text style={[styles.orderId, { color: colors.text }]}>
              #{item._id.slice(-6).toUpperCase()}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '20' }]}>
            <Feather name={statusCfg.icon} size={14} color={statusCfg.color} />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        <Text style={[styles.orderDate, { color: colors.textMuted }]}>{formattedDate}</Text>

        <View style={[styles.itemsList, { backgroundColor: colors.bg }]}>
          {item.items.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                {it.qty}x {it.name}
              </Text>
              <Text style={[styles.itemPrice, { color: colors.textSub }]}>
                {(it.price * it.qty).toFixed(2)} DT
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.addressWrap}>
            <Feather name="map-pin" size={14} color={colors.textMuted} />
            <Text style={[styles.addressText, { color: colors.textMuted }]} numberOfLines={1}>
              {item.address.city}, {item.address.addressLine}
            </Text>
          </View>
          <Text style={[styles.totalAmount, { color: colors.green }]}>
            {item.total.toFixed(2)} DT
          </Text>
        </View>
      </View>
    );
  };

  return (
    <AppScaffold
      title={t('Mes Commandes', 'Mes Commandes')}
      activeTab="home"
      onBack={() => navigation.goBack()}
    >
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.green} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBg, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="package-variant-closed" size={54} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('Aucune commande trouvée', 'Aucune commande trouvée')}
          </Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            {t('Vous n\'avez encore passé aucune commande sur Glunity.', 'Vous n\'avez encore passé aucune commande sur Glunity.')}
          </Text>
          <TouchableOpacity
            style={[styles.shopBtn, { backgroundColor: colors.green }]}
            onPress={() => navigation.navigate('ProductsMarket')}
          >
            <Text style={styles.shopBtnText}>{t('Découvrir les produits', 'Découvrir les produits')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.green]} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  orderCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderIdWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  orderDate: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  itemsList: {
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  addressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  addressText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
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
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
  shopBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  shopBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});
