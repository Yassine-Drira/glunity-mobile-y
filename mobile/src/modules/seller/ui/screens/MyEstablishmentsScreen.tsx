import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import {
  getMyEstablishmentsApi,
  deleteEstablishmentApi,
  Establishment,
} from '../../api/establishment.api';

type Props = NativeStackScreenProps<AppStackParamList, 'MyEstablishments'>;

export default function MyEstablishmentsScreen({ navigation }: Props) {
  const { theme: colors } = useTheme();
  const { t, isRTL } = useLanguage();

  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStores = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await getMyEstablishmentsApi();
      setEstablishments(data);
    } catch (err: any) {
      // quiet fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStores();
    }, [fetchStores])
  );

  const handleDeleteStore = (store: Establishment) => {
    Alert.alert(
      t('Supprimer le magasin', 'Supprimer le magasin'),
      t(`Voulez-vous vraiment supprimer "${store.name}" ?`, `Voulez-vous vraiment supprimer "${store.name}" ?`),
      [
        { text: t('Annuler', 'Annuler'), style: 'cancel' },
        {
          text: t('Supprimer', 'Supprimer'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEstablishmentApi(store._id);
              fetchStores();
            } catch (err: any) {
              Alert.alert(t('Erreur', 'Erreur'), err?.message || t('Échec de la suppression.', 'Échec de la suppression.'));
            }
          },
        },
      ]
    );
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'Supermarket':
        return t('Supermarché', 'Supermarché');
      case 'Bakery':
        return t('Boulangerie / Pâtisserie', 'Boulangerie / Pâtisserie');
      case 'Restaurant':
        return t('Restaurant', 'Restaurant');
      case 'Health Store':
        return t('Magasin Santé', 'Magasin Santé');
      case 'Bio Store':
        return t('Magasin Bio', 'Magasin Bio');
      case 'Pharmacy':
        return t('Pharmacie', 'Pharmacie');
      default:
        return t('Commerce Sans Gluten', 'Commerce Sans Gluten');
    }
  };

  const renderStoreItem = ({ item }: { item: Establishment }) => {
    const isVerified = item.verified !== false;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Cover Photo Banner */}
        <View style={styles.coverWrap}>
          <Image
            source={{
              uri:
                item.coverImageUrl ||
                item.logoUrl ||
                'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
            }}
            style={styles.coverImg}
            resizeMode="cover"
          />
          {/* Verification Badge */}
          <View
            style={[
              styles.badgePill,
              { backgroundColor: isVerified ? '#E8F5E9' : '#FFF3E0', borderColor: isVerified ? '#81C784' : '#FFB74D' },
            ]}
          >
            <MaterialCommunityIcons
              name={isVerified ? 'check-decagram' : 'clock-outline'}
              size={14}
              color={isVerified ? '#2E7D32' : '#E65100'}
            />
            <Text style={[styles.badgeText, { color: isVerified ? '#2E7D32' : '#E65100' }]}>
              {isVerified ? t('Magasin Vérifié', 'Magasin Vérifié') : t('En attente de vérification', 'En attente de vérification')}
            </Text>
          </View>
        </View>

        {/* Store Content */}
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text style={[styles.storeName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.catPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Feather name="tag" size={12} color={colors.green} />
                <Text style={[styles.catText, { color: colors.text }]}>{getCategoryLabel(item.category)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.deleteIconBtn}
              onPress={() => handleDeleteStore(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="trash-2" size={18} color="#E53935" />
            </TouchableOpacity>
          </View>

          {/* Details */}
          {!!item.address && (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={14} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textMuted }]} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Feather name="clock" size={14} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              {t('Horaires', 'Horaires')}: {item.openTime || '08:00'} - {item.closeTime || '19:00'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.statsBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('SellerStats', { establishmentId: item._id, store: item })}
            >
              <Feather name="bar-chart-2" size={15} color={colors.text} />
              <Text style={[styles.statsBtnText, { color: colors.text }]}>
                {t('Statistiques', 'Statistiques')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.editBtn, { backgroundColor: colors.green }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('SellerProfile', { sellerId: item.owner ? (typeof item.owner === 'string' ? item.owner : item.owner._id) : undefined, establishmentId: item._id, store: item })}
            >
              <Feather name="edit-3" size={15} color="#FFFFFF" />
              <Text style={styles.editBtnText}>{t('Éditer le magasin', 'Éditer le magasin')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <AppScaffold
      title={t('My stores & establishments', 'Mes Magasins & Établissements')}
      activeTab="profile"
      onBack={() => navigation.goBack()}
    >
      <View style={styles.container}>
        {/* Top Header Card to Add New Store */}
        <TouchableOpacity
          style={[styles.addStoreCard, { backgroundColor: colors.green }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('EditStore', { establishmentId: undefined })}
        >
          <View style={styles.addStoreRow}>
            <View style={styles.addIconBg}>
              <Feather name="plus" size={22} color={colors.green} />
            </View>
            <View style={styles.addTextWrap}>
              <Text style={styles.addTitle}>{t('Ajouter un nouveau magasin', 'Ajouter un nouveau magasin')}</Text>
              <Text style={styles.addSub}>
                {t('Créez un profil pour votre deuxième point de vente ou franchise', 'Créez un profil pour votre point de vente')}
              </Text>
            </View>
            <Feather name="chevron-right" size={22} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.green} />
          </View>
        ) : (
          <FlatList
            data={establishments}
            keyExtractor={(item) => item._id}
            renderItem={renderStoreItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchStores(true);
                }}
                colors={[colors.green]}
                tintColor={colors.green}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons name="storefront-outline" size={56} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {t('Aucun magasin enregistré', 'Aucun magasin enregistré')}
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  {t('Cliquez sur le bouton ci-dessus pour ajouter votre premier magasin physique sur la carte !', 'Cliquez sur le bouton ci-dessus pour ajouter votre premier magasin physique sur la carte !')}
                </Text>
              </View>
            }
          />
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
  addStoreCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  addStoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTextWrap: {
    flex: 1,
  },
  addTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  addSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 110,
    gap: 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  coverWrap: {
    height: 120,
    width: '100%',
    position: 'relative',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  badgePill: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  cardContent: {
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleWrap: {
    flex: 1,
    gap: 4,
    paddingRight: 8,
  },
  storeName: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  catText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  deleteIconBtn: {
    padding: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    gap: 6,
  },
  statsBtn: {
    borderWidth: 1,
  },
  statsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  editBtn: {},
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
});
