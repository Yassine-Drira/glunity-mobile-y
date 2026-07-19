import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useSocket } from '@/shared/context/socket.context';
import { eventsApi } from '../../../home/api/events.api';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '@/shared/components/Avatar';

export default function ViewRegistrationFormScreen({ route, navigation }: any) {
  const { eventId, registrationId } = route.params;
  const { theme: T } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [registration, setRegistration] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  const currentUserId = user?._id || (user as any)?.id;
  const isOwner = Boolean(event && currentUserId && [
    event?.ownerId,
    event?.createdBy,
    event?.organizer?.organizerId,
    event?.organizer?.id,
    event?.organizer?.userId,
  ].some((value) => Boolean(value) && String(value) === String(currentUserId)));

  const fetchDetails = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [regData, eventData] = await Promise.all([
        eventsApi.getRegistrationDetails(eventId, registrationId),
        eventsApi.get(eventId),
      ]);
      setRegistration(regData);
      setEvent(eventData);
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

  // Socket.IO listener for real-time registration updates
  useEffect(() => {
    if (!socket) return;
    const onRegChange = (payload: any) => {
      if (String(payload.eventId) === String(eventId)) {
        fetchDetails(true);
      }
    };
    socket.on('registration:change', onRegChange);
    return () => {
      socket.off('registration:change', onRegChange);
    };
  }, [socket, eventId, fetchDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetails(true);
  }, [fetchDetails]);

  const handleConfirmPayment = async () => {
    if (!registration) return;

    try {
      setApproving(true);
      console.log('[PAYMENT] Button pressed', { eventId, registrationId });
      const result = await eventsApi.confirmRegistration(eventId, registrationId);
      console.log('[PAYMENT] Success response:', result);
      Alert.alert(t('Success'), t('Payment confirmed successfully.'));
      
      try {
        navigation.navigate({
          name: 'EventRegistrationRequests',
          params: { statusChanged: true },
          merge: true,
        } as any);
      } catch (navErr) {
        console.warn('[NAVIGATION] Failed to update parent screen stateChanged param:', navErr);
      }

      fetchDetails(true);
    } catch (err: any) {
      console.error('[PAYMENT] Error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config ? { url: err.config.url, method: err.config.method } : null,
      });
      Alert.alert(
        t('Error'),
        err.response?.data?.message || err.response?.data?.error || err.message || t('Failed to confirm payment')
      );
    } finally {
      setApproving(false);
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
  const normalizedStatus = String(registration.status || '').toUpperCase();
  const isPending = ['WAITING_PAYMENT', 'PENDING'].includes(normalizedStatus);
  
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
          <Avatar
            url={registration.userId?.avatar?.url}
            name={[form.firstName, form.lastName].filter(Boolean).join(' ') || registration.userId?.fullName || registration.fullName || 'User'}
            size={80}
            style={s.avatar}
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

        {isPending ? (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: T.green }]}
            onPress={handleConfirmPayment}
            disabled={approving}
            activeOpacity={0.7}
          >
            {approving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={s.actionBtnText}>{t('Accept Payment')}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </ScrollView>
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
  actionBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
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
});
