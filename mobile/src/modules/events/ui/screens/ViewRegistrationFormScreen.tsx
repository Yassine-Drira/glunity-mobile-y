import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { eventsApi } from '../../../home/api/events.api';
import { Feather } from '@expo/vector-icons';
import FastImage from '@/shared/components/FastImage';

export default function ViewRegistrationFormScreen({ route, navigation }: any) {
  const { eventId, registrationId } = route.params;
  const { theme: T } = useTheme();
  const { t } = useLanguage();

  const [registration, setRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchDetails = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await eventsApi.getRegistrationDetails(eventId, registrationId);
      setRegistration(data);
    } catch (err: any) {
      console.warn('[ViewRegistrationForm] Fetch error:', err);
      setError(err.message || t('Failed to load registration details'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, registrationId, t]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetails(true);
  }, [fetchDetails]);

  const handleApprove = () => {
    if (!registration) return;
    Alert.alert(
      t('Confirm Approval'),
      t('Approve this registration?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Approve'),
          onPress: async () => {
            try {
              setLoading(true);
              await eventsApi.approveRegistration(registrationId);
              Alert.alert(t('Success'), t('Participant approved successfully.'));
              navigation.goBack();
            } catch (err: any) {
              Alert.alert(t('Error'), err.message || t('Failed to approve participant'));
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectSubmit = async () => {
    if (!registration) return;
    setRejecting(true);
    try {
      await eventsApi.rejectRegistration(registrationId, rejectReason);
      setRejectModalVisible(false);
      Alert.alert(t('Success'), t('Registration rejected.'));
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(t('Error'), err.message || t('Failed to reject registration'));
    } finally {
      setRejecting(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <AppScaffold title={t('Registration Form')} activeTab="events" onBack={() => navigation.goBack()} showBottomNav={false}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={T.green} />
        </View>
      </AppScaffold>
    );
  }

  if (error || !registration) {
    return (
      <AppScaffold title={t('Registration Form')} activeTab="events" onBack={() => navigation.goBack()} showBottomNav={false}>
        <View style={s.center}>
          <Feather name="alert-circle" size={48} color={T.red} style={{ marginBottom: 12 }} />
          <Text style={[s.errorTitle, { color: T.text }]}>{t('Error Loading')}</Text>
          <Text style={[s.errorSub, { color: T.textSub }]}>{error || t('Registration not found')}</Text>
          <TouchableOpacity
            onPress={() => fetchDetails()}
            style={[s.retryBtn, { backgroundColor: T.green }]}
          >
            <Text style={s.retryText}>{t('Retry')}</Text>
          </TouchableOpacity>
        </View>
      </AppScaffold>
    );
  }

  const form = registration.registrationForm || {};
  const isPending = registration.status === 'WAITING_PAYMENT' || registration.status === 'waiting_payment';
  
  // Format registration date
  const regDate = registration.createdAt ? new Date(registration.createdAt).toLocaleDateString() : '-';

  return (
    <AppScaffold
      title={t('Registration Details')}
      activeTab="events"
      onBack={() => navigation.goBack()}
      contentStyle={{ backgroundColor: T.bg }}
      showBottomNav={false}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[T.green]}
            tintColor={T.green}
          />
        }
      >
        {/* Profile Card Header */}
        <View style={s.profileHeader}>
          <FastImage
            source={{ uri: registration.userId?.avatar?.url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' }}
            style={s.avatar}
            contentFit="cover"
          />
          <Text style={[s.fullName, { color: T.text }]}>
            {form.firstName || registration.fullName} {form.lastName || ''}
          </Text>
        </View>

        {/* Detailed Fields List */}
        <View style={[s.infoContainer, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Text style={[s.sectionTitle, { color: T.text }]}>{t('Registration Information')}</Text>

          <View style={[s.infoRow, { borderBottomColor: T.border }]}>
            <Text style={[s.label, { color: T.textMuted }]}>{t('First Name')}</Text>
            <Text style={[s.value, { color: T.text }]}>{form.firstName || '-'}</Text>
          </View>

          <View style={[s.infoRow, { borderBottomColor: T.border }]}>
            <Text style={[s.label, { color: T.textMuted }]}>{t('Last Name')}</Text>
            <Text style={[s.value, { color: T.text }]}>{form.lastName || '-'}</Text>
          </View>

          <View style={[s.infoRow, { borderBottomColor: T.border }]}>
            <Text style={[s.label, { color: T.textMuted }]}>{t('Phone Number')}</Text>
            <Text style={[s.value, { color: T.text }]}>{form.phone || registration.phone || '-'}</Text>
          </View>

          <View style={[s.infoRow, { borderBottomColor: T.border }]}>
            <Text style={[s.label, { color: T.textMuted }]}>{t('Email Address')}</Text>
            <Text style={[s.value, { color: T.text }]}>{form.email || registration.email || '-'}</Text>
          </View>

          <View style={[s.infoRow, { borderBottomColor: T.border }]}>
            <Text style={[s.label, { color: T.textMuted }]}>{t('Gender')}</Text>
            <Text style={[s.value, { color: T.text }]}>{t(form.gender || 'Male')}</Text>
          </View>

          <View style={[s.infoRow, { borderBottomColor: T.border }]}>
            <Text style={[s.label, { color: T.textMuted }]}>{t('Address')}</Text>
            <Text style={[s.value, { color: T.text }]}>{form.address || '-'}</Text>
          </View>

          <View style={[s.infoRow, { borderBottomColor: T.border }]}>
            <Text style={[s.label, { color: T.textMuted }]}>{t('City')}</Text>
            <Text style={[s.value, { color: T.text }]}>{form.city || '-'}</Text>
          </View>

          <View style={[s.infoRow, { borderBottomColor: T.border }]}>
            <Text style={[s.label, { color: T.textMuted }]}>{t('Country')}</Text>
            <Text style={[s.value, { color: T.text }]}>{form.country || '-'}</Text>
          </View>

          <View style={[s.infoRow, { borderBottomColor: T.border }]}>
            <Text style={[s.label, { color: T.textMuted }]}>{t('Registration Date')}</Text>
            <Text style={[s.value, { color: T.text }]}>{regDate}</Text>
          </View>

          <View style={s.infoRow}>
            <Text style={[s.label, { color: T.textMuted }]}>{t('Current Status')}</Text>
            <Text style={[
              s.value, 
              { 
                fontWeight: '700',
                color: isPending 
                  ? T.textSub 
                  : (registration.status === 'APPROVED' || registration.status === 'confirmed' ? T.green : T.red)
              }
            ]}>
              {t(registration.status?.toUpperCase().replace('_', ' '))}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        {isPending ? (
          <View style={s.actionContainer}>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: T.green }]}
              onPress={handleApprove}
            >
              <Text style={s.actionBtnText}>{t('Approve')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionBtn, s.btnReject, { borderColor: T.border }]}
              onPress={() => {
                Alert.alert(
                  t('Confirm Rejection'),
                  t('Reject this registration?'),
                  [
                    { text: t('Cancel'), style: 'cancel' },
                    {
                      text: t('Reject'),
                      onPress: () => setRejectModalVisible(true)
                    }
                  ]
                );
              }}
            >
              <Text style={[s.actionBtnText, { color: T.red }]}>{t('Reject')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[s.backBtn, { borderColor: T.border }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[s.backBtnText, { color: T.textSub }]}>{t('Back')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Reject Reason input modal */}
      <Modal
        visible={rejectModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: T.surface }]}>
            <Text style={[s.modalTitle, { color: T.text }]}>{t('Reject Registration')}</Text>
            <Text style={[s.modalSub, { color: T.textSub }]}>
              {t('Provide a reason for rejection (optional):')}
            </Text>

            <TextInput
              style={[s.modalInput, { color: T.text, borderColor: T.border, backgroundColor: T.surfaceAlt }]}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder={t('Reason for rejection...')}
              placeholderTextColor={T.textMuted}
              multiline={true}
              numberOfLines={3}
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnCancel, { borderColor: T.border }]}
                onPress={() => setRejectModalVisible(false)}
                disabled={rejecting}
              >
                <Text style={[s.modalBtnText, { color: T.textSub }]}>{t('Cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnConfirm, { backgroundColor: T.red }]}
                onPress={handleRejectSubmit}
                disabled={rejecting}
              >
                {rejecting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[s.modalBtnText, { color: '#FFFFFF' }]}>{t('Reject')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppScaffold>
  );
}

const s = StyleSheet.create({
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  profileHeader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: '#eee',
  },
  fullName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  infoContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 8,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  actionContainer: {
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnReject: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  backBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    marginBottom: 6,
  },
  errorSub: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Poppins_400Regular',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    textAlignVertical: 'top',
    minHeight: 70,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    borderWidth: 1,
  },
  modalBtnConfirm: {
    backgroundColor: '#EF4444',
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});
