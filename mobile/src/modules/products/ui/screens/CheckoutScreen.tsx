import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/modules/auth/navigation/types';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useCart } from '../../context/CartContext';
import { createOrderApi, ShippingAddress } from '../../api/orders.api';

type Props = NativeStackScreenProps<AppStackParamList, 'Checkout'>;

interface FieldErrors {
  fullName?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  general?: string;
}

export default function CheckoutScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { theme: colors } = useTheme();
  const { t } = useLanguage();
  const { items, subtotal, deliveryFee, total, clearCart } = useCart();
  const scrollRef = useRef<ScrollView>(null);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('Tunis');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [orderSuccess, setOrderSuccess] = useState(false);

  const validateForm = (): boolean => {
    const errs: FieldErrors = {};
    if (!fullName.trim()) {
      errs.fullName = t('Nom complet obligatoire', 'Nom complet obligatoire');
    }
    if (!phone.trim()) {
      errs.phone = t('Numéro de téléphone obligatoire', 'Numéro de téléphone obligatoire');
    }
    if (!addressLine.trim()) {
      errs.addressLine = t('Adresse de livraison obligatoire', 'Adresse de livraison obligatoire');
    }
    if (!city.trim()) {
      errs.city = t('Ville / Gouvernorat obligatoire', 'Ville / Gouvernorat obligatoire');
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      return;
    }

    if (items.length === 0) {
      setErrors({ general: t('Votre panier est vide', 'Votre panier est vide') });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const address: ShippingAddress = {
        fullName: fullName.trim(),
        addressLine: addressLine.trim(),
        city: city.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
      };

      const orderItems = items.map((i) => ({ productId: i.id, qty: i.quantity }));
      await createOrderApi({ items: orderItems, address });

      clearCart();
      setOrderSuccess(true);
    } catch (error: any) {
      setErrors({ general: error?.message || t('Échec de la création de la commande. Veuillez réinstaller ou vérifier la connexion.', 'Échec de la création de la commande.') });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setLoading(false);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  if (orderSuccess) {
    return (
      <AppScaffold title={t('Commande Confirmée !', 'Commande Confirmée !')} activeTab="home">
        <View style={styles.successContainer}>
          <View style={[styles.successIconBg, { backgroundColor: colors.surface }]}>
            <Feather name="check-circle" size={64} color={colors.green} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            {t('Commande transmise avec succès ! 🎉', 'Commande transmise avec succès ! 🎉')}
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>
            {t('Le vendeur a été notifié et prépare votre colis sans gluten.', 'Le vendeur a été notifié et prépare votre colis sans gluten.')}
          </Text>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.green, width: '100%', marginTop: 24 }]}
            onPress={() => navigation.replace('UserOrders')}
          >
            <Text style={styles.confirmBtnText}>{t('Voir mes commandes', 'Voir mes commandes')}</Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </AppScaffold>
    );
  }

  return (
    <AppScaffold
      title={t('Finaliser la commande', 'Finaliser la commande')}
      activeTab="home"
      onBack={() => navigation.goBack()}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Top Validation Banner */}
        {hasErrors && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={18} color="#D32F2F" />
            <Text style={styles.errorBannerText}>
              {errors.general || t('Veuillez remplir les champs obligatoires ci-dessous (*).', 'Veuillez remplir les champs obligatoires ci-dessous (*).')}
            </Text>
          </View>
        )}

        {/* Shipping Address Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Feather name="map-pin" size={20} color={colors.green} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('Adresse de livraison', 'Adresse de livraison')}
            </Text>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSub }]}>
              {t('Nom complet *', 'Nom complet *')}
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: errors.fullName ? '#D32F2F' : colors.border, backgroundColor: colors.bg },
                errors.fullName ? styles.inputError : undefined,
              ]}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              placeholder={t('Ex: Ahmed Ben Ali', 'Ex: Ahmed Ben Ali')}
              placeholderTextColor={colors.textMuted}
            />
            {errors.fullName && <Text style={styles.fieldErrorText}>{errors.fullName}</Text>}
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSub }]}>
              {t('Téléphone *', 'Téléphone *')}
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: errors.phone ? '#D32F2F' : colors.border, backgroundColor: colors.bg },
                errors.phone ? styles.inputError : undefined,
              ]}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              keyboardType="phone-pad"
              placeholder={t('Ex: +216 22 123 456', 'Ex: +216 22 123 456')}
              placeholderTextColor={colors.textMuted}
            />
            {errors.phone && <Text style={styles.fieldErrorText}>{errors.phone}</Text>}
          </View>

          {/* Address Line */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSub }]}>
              {t('Adresse rue/numéro *', 'Adresse rue/numéro *')}
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: errors.addressLine ? '#D32F2F' : colors.border, backgroundColor: colors.bg },
                errors.addressLine ? styles.inputError : undefined,
              ]}
              value={addressLine}
              onChangeText={(text) => {
                setAddressLine(text);
                if (errors.addressLine) setErrors((prev) => ({ ...prev, addressLine: undefined }));
              }}
              placeholder={t('Ex: 14 Rue Habib Bourguiba', 'Ex: 14 Rue Habib Bourguiba')}
              placeholderTextColor={colors.textMuted}
            />
            {errors.addressLine && <Text style={styles.fieldErrorText}>{errors.addressLine}</Text>}
          </View>

          {/* City */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSub }]}>
              {t('Ville / Gouvernorat *', 'Ville / Gouvernorat *')}
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: errors.city ? '#D32F2F' : colors.border, backgroundColor: colors.bg },
                errors.city ? styles.inputError : undefined,
              ]}
              value={city}
              onChangeText={(text) => {
                setCity(text);
                if (errors.city) setErrors((prev) => ({ ...prev, city: undefined }));
              }}
              placeholder={t('Ex: Tunis, Ariana, Sousse...', 'Ex: Tunis, Ariana, Sousse...')}
              placeholderTextColor={colors.textMuted}
            />
            {errors.city && <Text style={styles.fieldErrorText}>{errors.city}</Text>}
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSub }]}>
              {t('Notes de livraison (Optionnel)', 'Notes de livraison (Optionnel)')}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder={t('Indications pour le livreur...', 'Indications pour le livreur...')}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Payment Method Badge */}
        <View style={[styles.paymentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.paymentRow}>
            <MaterialCommunityIcons name="cash-fast" size={24} color={colors.green} />
            <View style={styles.paymentTextWrap}>
              <Text style={[styles.paymentTitle, { color: colors.text }]}>
                {t('Paiement à la livraison', 'Paiement à la livraison')}
              </Text>
              <Text style={[styles.paymentSub, { color: colors.textMuted }]}>
                {t('Payez en espèces dès réception de votre colis', 'Payez en espèces dès réception de votre colis')}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Summary Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
            {t('Récapitulatif de la commande', 'Récapitulatif de la commande')}
          </Text>
          {items.map((item) => (
            <View key={item.id} style={styles.summaryItemRow}>
              <Text style={[styles.summaryItemName, { color: colors.text }]} numberOfLines={1}>
                {item.quantity}x {item.name}
              </Text>
              <Text style={[styles.summaryItemPrice, { color: colors.text }]}>
                {(item.price * item.quantity).toFixed(2)} DT
              </Text>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('Sous-total', 'Sous-total')}</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{subtotal.toFixed(2)} DT</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('Frais de livraison', 'Frais de livraison')}</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{deliveryFee.toFixed(2)} DT</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>{t('Total à payer', 'Total à payer')}</Text>
            <Text style={[styles.totalValue, { color: colors.green }]}>{total.toFixed(2)} DT</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.green }, loading && { opacity: 0.7 }]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.confirmBtnText}>{t('Confirmer la commande', 'Confirmer la commande')}</Text>
              <Feather name="check" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorBannerText: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  successIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  sectionCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  inputError: {
    borderWidth: 1.5,
    backgroundColor: '#FFF8F8',
  },
  fieldErrorText: {
    color: '#D32F2F',
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    marginTop: 2,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  paymentCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentTextWrap: {
    flex: 1,
    gap: 2,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  paymentSub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryItemName: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
    paddingRight: 10,
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
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
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
});
