import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
  Alert,
  Linking,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { Radius } from '@/shared/utils/theme';
import { eventsApi } from '../../../home/api/events.api';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useSocket } from '@/shared/context/socket.context';
import { Ionicons, Feather } from '@expo/vector-icons';
import FastImage from '@/shared/components/FastImage';

type Props = NativeStackScreenProps<AppStackParamList, 'EventDetail'>;
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';

export default function EventDetailScreen({ navigation, route }: Props) {
  const { theme: T } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth, 600);
  const insets = useSafeAreaInsets();
  const { isRTL, t } = useLanguage();
  const { eventId } = route.params as any;
  const { user } = useAuth();
  const { socket } = useSocket();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  // Registration Modal States
  const [showRegModal, setShowRegModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isDirectSuccess, setIsDirectSuccess] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(0.3)).current;

  const triggerSuccessModal = (autoClose = false) => {
    setShowSuccessModal(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    if (autoClose) {
      setTimeout(() => {
        closeSuccessModal();
        setShowRegModal(false);
      }, 1000);
    }
  };

  const closeSuccessModal = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.3,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowSuccessModal(false);
    });
  };

  const [regStep, setRegStep] = useState<'form' | 'success'>('form');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState(user?.email || '');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState('Male');
  const [regDateOfBirth, setRegDateOfBirth] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regCountry, setRegCountry] = useState('');
  const [regTicketsCount, setRegTicketsCount] = useState('1');
  const [regNotes, setRegNotes] = useState('');
  const [regErrors, setRegErrors] = useState<any>({});
  
  // Mock Online Credit Card payment form
  const [cardHolder, setCardHolder] = useState(user?.fullName || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Active registration ID for checkout references
  const [activeRegId, setActiveRegId] = useState<string | null>(null);

  function optimizedUrl(url?: string | null, w = 1200) {
    if (!url) return url;
    try {
      const u = new URL(url);
      if (u.hostname.includes('images.unsplash.com')) {
        if (u.search) u.search += '&';
        u.search += `w=${w}&auto=format&fit=crop&q=80`;
        return u.toString();
      }
      return url;
    } catch (e) { return url; }
  }

  const isOwner = useMemo(() => {
    if (!event || !user) return false;
    const ownerId = event.createdBy || (event.organizer && event.organizer.organizerId);
    return ownerId && String(ownerId) === String(user._id);
  }, [event, user]);

  const isJoined = useMemo(() => {
    if (!event || !user) return false;
    const attendees: string[] = event.attendees || [];
    return attendees.includes(user._id);
  }, [event, user]);

  const userRegistration = useMemo(() => {
    if (isOwner || !registrations || !user) return null;
    return registrations.find((r) => String(r.userId) === String(user._id));
  }, [registrations, user, isOwner]);

  const isFinished = useMemo(() => {
    if (!event) return false;
    try {
      if (event.isFinished) return true;
      const starts = event.startsAt ? new Date(event.startsAt) : null;
      if (!starts) return false;
      return starts.getTime() < Date.now();
    } catch { return false; }
  }, [event]);

  // Load Event details and registrations
  const loadData = async () => {
    try {
      const ev = (await eventsApi.get(eventId)) as any;
      setEvent(ev);
      
      // If organizer, load all registrations; if attendee, load only their own registration
      if (user) {
        const ownerId = ev.createdBy || (ev.organizer && ev.organizer.organizerId);
        const isUserOwner = ownerId && String(ownerId) === String(user._id);

        if (isUserOwner) {
          setLoadingRegs(true);
          const regs = await eventsApi.getRegistrations(eventId);
          setRegistrations(regs);
          setLoadingRegs(false);
        } else {
          // Normal attendee registers to see their status
          const myReg = await eventsApi.getMyRegistration(eventId).catch(() => null);
          setRegistrations(myReg ? [myReg] : []);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load event data', err);
      setErrorState(err.message || t('Failed to connect to the server'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId, user]);

  // Socket.IO listener for real-time registration updates
  useEffect(() => {
    if (!socket) return;
    const onRegChange = (payload: any) => {
      if (String(payload.eventId) === String(eventId)) {
        // Reload event details to get updated pendingRequestsCount
        loadData();
      }
    };
    socket.on('registration:change', onRegChange);
    return () => {
      socket.off('registration:change', onRegChange);
    };
  }, [socket, eventId]);

  function formatDate(d: string | undefined) {
    try {
      const dt = d ? new Date(d) : null;
      if (!dt) return '';
      return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return d || ''; }
  }

  function formatTime(d: string | undefined) {
    try {
      const dt = d ? new Date(d) : null;
      if (!dt) return '';
      return dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } catch { return ''; }
  }

  const handleJoin = async () => {
    if (!event) return;
    
    // Free event -> Instant confirmation
    if (!event.price || parseFloat(event.price) === 0) {
      try {
        setJoining(true);
        const updated = await eventsApi.join(event.id);
        setEvent(updated);
        await loadData();
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
      } catch (err: any) {
        Alert.alert(t('Error'), err?.response?.data?.message || err?.message || t('Failed to join event'));
      } finally {
        setJoining(false);
      }
    } else {
      // Paid event -> Open checkout modal
      setRegStep('form');
      setRegFirstName(user?.fullName ? user.fullName.split(' ')[0] : '');
      setRegLastName(user?.fullName ? user.fullName.split(' ').slice(1).join(' ') : '');
      setRegEmail(user?.email || '');
      setRegPhone('');
      setRegTicketsCount('1');
      setRegNotes('');
      setRegGender('Male');
      setRegDateOfBirth('');
      setRegAddress('');
      setRegCity('');
      setRegCountry('');
      setRegErrors({});
      setShowRegModal(true);
    }
  };

  const handleLeaveConfirmed = async () => {
    if (!event) return;
    try {
      setJoining(true);
      const updated = await eventsApi.leave(event.id);
      setEvent(updated);
      await loadData();
    } catch (err) {
      console.warn('Failed to leave event', err);
    } finally {
      setJoining(false);
    }
  };

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancelEventConfirm, setShowCancelEventConfirm] = useState(false);

  const handleCancel = () => setShowCancelConfirm(true);
  const closeCancel = () => setShowCancelConfirm(false);
  const confirmCancel = async () => {
    closeCancel();
    
    // If has paid registration, cancel it instead of simple leave
    if (userRegistration) {
      try {
        setJoining(true);
        await eventsApi.cancelRegistration(userRegistration._id);
        await loadData();
      } catch (err: any) {
        Alert.alert(t('Error'), err.message);
      } finally {
        setJoining(false);
      }
    } else {
      await handleLeaveConfirmed();
    }
  };

  const confirmCancelEvent = async () => {
    setShowCancelEventConfirm(false);
    try {
      if (user?.profileType === 'pro_commerce' || user?.profileType === 'admin') {
        await eventsApi.remove(event.id);
      } else {
        await eventsApi.cancel(event.id);
      }
      navigation.navigate('Events');
    } catch (err: any) {
      Alert.alert(t('Error'), err?.response?.data?.message || err?.message || t('Failed to cancel event'));
    }
  };

  // Submit User registration form
  const handleRegisterSubmit = async () => {
    const errors: any = {};
    if (!regFirstName.trim()) errors.firstName = t('First name is required');
    if (!regLastName.trim()) errors.lastName = t('Last name is required');
    if (!regEmail.trim()) errors.email = t('Email is required');
    else if (!/\S+@\S+\.\S+/.test(regEmail)) errors.email = t('Invalid email format');
    if (!regPhone.trim()) errors.phone = t('Phone number is required');
    if (!regGender.trim()) errors.gender = t('Gender is required');

    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      return;
    }

    setRegErrors({});
    setJoining(true);
    try {
      const reg = await eventsApi.register(event.id, {
        fullName: `${regFirstName.trim()} ${regLastName.trim()}`,
        email: regEmail.toLowerCase().trim(),
        phone: regPhone.trim(),
        ticketsCount: 1, // Only 1 ticket per participant allowed
        notes: regNotes.trim(),
        registrationForm: {
          firstName: regFirstName.trim(),
          lastName: regLastName.trim(),
          email: regEmail.toLowerCase().trim(),
          phone: regPhone.trim(),
          gender: regGender,
          dateOfBirth: regDateOfBirth.trim() || undefined,
          address: regAddress.trim() || undefined,
          city: regCity.trim() || undefined,
          country: regCountry.trim() || undefined,
          ticketCount: 1,
          notes: regNotes.trim() || undefined
        }
      } as any);
      setActiveRegId(reg._id);
      
      // Refresh event details and registration status immediately
      await loadData();
      
      setIsDirectSuccess(true);
      // Trigger Scale/Fade Success Modal (with 1 second auto-close)
      triggerSuccessModal(true);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || '';
      if (errMsg.includes('already registered')) {
        errors.phone = t('This phone number is already registered for this event.');
        setRegErrors(errors);
      } else {
        Alert.alert(t('Registration Error'), t(errMsg || 'Failed to register.'));
      }
    } finally {
      setJoining(false);
    }
  };

  // Submit Mock Online payment
  const handleOnlinePaymentSubmit = async () => {
    if (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      Alert.alert(t('Form Incomplete'), t('Please fill in all credit card details.'));
      return;
    }
    setPaymentProcessing(true);
    try {
      // Simulate Stripe/online payment delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Confirm registration on backend
      if (activeRegId) {
        await eventsApi.confirmRegistration(eventId, activeRegId);
        await loadData();
      }
      setRegStep('success');
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    } catch (err: any) {
      Alert.alert(t('Payment Error'), err.message || t('Payment transaction failed.'));
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Organizer manual confirmation
  const handleConfirmAttendeePayment = async (regId: string) => {
    Alert.alert(
      t('Confirm Payment?'),
      t('Have you received cash payment for this registration? This will confirm their spot.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Confirm'),
          onPress: async () => {
            try {
              setLoadingRegs(true);
              await eventsApi.approveRegistration(eventId, regId);
              await loadData();
            } catch (err: any) {
              Alert.alert(t('Error'), err.message);
            } finally {
              setLoadingRegs(false);
            }
          }
        }
      ]
    );
  };

  // Organizer manual cancellation
  const handleCancelAttendeeRegistration = async (regId: string) => {
    Alert.alert(
      t('Cancel Registration?'),
      t('Are you sure you want to cancel this registration?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Yes, Cancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingRegs(true);
              await eventsApi.cancelRegistration(regId);
              await loadData();
            } catch (err: any) {
              Alert.alert(t('Error'), err.message);
            } finally {
              setLoadingRegs(false);
            }
          }
        }
      ]
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    root: { flex: 1, position: 'relative' },
    image: { width: '100%', height: 260, borderRadius: 12, marginBottom: 12 },
    typePill: {
      position: 'absolute',
      left: isRTL ? undefined : 20,
      right: isRTL ? 20 : undefined,
      top: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      zIndex: 10,
    },
    typePillText: { fontSize: 12, fontWeight: '700', paddingHorizontal: 4 },
    body: { paddingHorizontal: 16, paddingTop: 4 },
    title: { fontSize: 24, fontWeight: '800', lineHeight: 30, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' },
    metaRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 8 },
    metaText: { fontSize: 13 },
    attendeesRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    avatarStack: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
    avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#FFFFFF' },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, textAlign: isRTL ? 'right' : 'left' },
    sectionBody: { fontSize: 14, lineHeight: 20, textAlign: isRTL ? 'right' : 'left' },
    joinBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    joinBtnText: { color: '#FFFFFF', fontWeight: '700' },
    price: { fontSize: 16, fontWeight: '700', marginTop: 8 },
    actionRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 1.5, borderTopColor: T.border, paddingTop: 16 },
    priceWrap: { flexDirection: 'column', alignItems: isRTL ? 'flex-end' : 'flex-start' },
    priceLabel: { fontSize: 12, fontWeight: '600' },
    priceValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
    joinBtnLarge: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, minWidth: 180, alignItems: 'center', shadowColor: '#8BC34A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 18, elevation: 6 },
    joinBtnLargeCancel: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, minWidth: 180, alignItems: 'center', backgroundColor: '#F3F4F6' },
    joinBtnTextLarge: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    infoRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', marginTop: 12, paddingVertical: 4 },
    infoCol: { marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 },
    infoTitle: { fontSize: 14, fontWeight: '700' },
    infoSub: { fontSize: 12, marginTop: 2 },
    smallAvatars: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 6 },
    smallAvatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF', marginLeft: isRTL ? 0 : -8, marginRight: isRTL ? -8 : 0 },
    
    // Status badges
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 6 },
    statusText: { fontSize: 12, fontWeight: '700', fontFamily: 'Poppins_700Bold' },

    // Card designs
    card: { backgroundColor: T.surface, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: T.border, marginTop: 16 },
    onlineHeaderRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    onlineBadge: { backgroundColor: T.greenLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    onlineBadgeText: { color: T.green, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: screenWidth * 0.9, backgroundColor: T.surface, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: T.text, fontFamily: 'Poppins_700Bold' },
    modalInputGroup: { marginBottom: 16 },
    modalInput: { height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 14, fontSize: 14, color: T.text, backgroundColor: T.inputBg, fontFamily: 'Poppins_400Regular', marginTop: 6 },
    modalInputArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
    modalSubmitBtn: { backgroundColor: T.green, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    modalSubmitText: { fontSize: 15, color: '#FFFFFF', fontWeight: '700', fontFamily: 'Poppins_700Bold' },

    // Dashboard panel
    dashboard: { borderTopWidth: 2, borderTopColor: T.border, marginTop: 24, paddingTop: 20 },
    regCard: { backgroundColor: T.surfaceAlt, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
    regName: { fontSize: 14, fontWeight: '700', color: T.text },
    regMeta: { fontSize: 12, color: T.textSub, marginTop: 2 },
    regNotes: { fontSize: 12, fontStyle: 'italic', color: T.textMuted, marginTop: 6 },
    regControls: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
    confirmBtn: { backgroundColor: T.green, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    confirmText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
    cancelBtn: { backgroundColor: T.red, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    cancelText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  }), [T, isRTL, screenWidth, event, userRegistration]);

  const attendeeAvatars = useMemo(() => {
    if (!event) return [];
    const avatars: Array<string> = (event.attendeesAvatars || []).filter(Boolean);
    const count = Math.max(event.attendeesCount || 0, avatars.length);
    const displayCount = Math.min(3, count);
    const sampleAvatars = [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=200&h=200&fit=crop',
    ];
    const out: Array<string> = [];
    for (let i = 0; i < displayCount; i++) {
      if (avatars[i]) out.push(avatars[i]);
      else out.push(sampleAvatars[i % sampleAvatars.length]);
    }
    return out;
  }, [event]);

  if (loading) {
    return (
      <AppScaffold title={t('Event Details')} activeTab="events" onBack={() => navigation.goBack()}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg }}>
          <ActivityIndicator size="large" color={T.green} />
        </View>
      </AppScaffold>
    );
  }

  if (errorState) {
    return (
      <AppScaffold title={t('Event Details')} activeTab="events" onBack={() => navigation.goBack()}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg, padding: 24 }}>
          <Feather name="wifi-off" size={48} color={T.textMuted} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 8 }}>{t('Connection Error')}</Text>
          <Text style={{ fontSize: 14, color: T.textSub, textAlign: 'center', marginBottom: 20 }}>
            {errorState}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              setErrorState(null);
              loadData();
            }}
            style={{ backgroundColor: T.green, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: '#FFF', fontWeight: '700' }}>{t('Retry')}</Text>
          </TouchableOpacity>
        </View>
      </AppScaffold>
    );
  }

  const isFormatOnline = event?.format === 'online';

  return (
    <AppScaffold
      title={t('Event')}
      activeTab="events"
      onBack={() => navigation.goBack()}
      rightElement={isOwner ? (
        <TouchableOpacity onPress={() => setShowCancelEventConfirm(true)} style={{ padding: 8 }} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={20} color={T.text} />
        </TouchableOpacity>
      ) : undefined}
      contentStyle={{ backgroundColor: T.bg }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 60 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {event ? (
          <View style={styles.root}>
            <View style={{ position: 'relative' }}>
              <View style={[styles.image, { backgroundColor: T.surfaceAlt }]} />
              {event.imageUrl ? (
                <FastImage
                  source={{ uri: optimizedUrl(event.imageUrl, 1200) || '' }}
                  style={[styles.image, { position: 'absolute', left: 0, top: 0 }]}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="disk"
                  priority="high"
                />
              ) : null}
            </View>

            {event.type && (
              <View style={[styles.typePill, { borderColor: T.red, backgroundColor: T.surface }]}>
                <Text style={[styles.typePillText, { color: T.red }]}>
                  {String(event.type).charAt(0).toUpperCase() + String(event.type).slice(1)}
                </Text>
              </View>
            )}

            <View style={styles.body}>
              <Text style={[styles.title, { color: T.text }]}>{event.title}</Text>

              {/* Schedule and Timings */}
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={18} color={T.red} />
                <View style={styles.infoCol}>
                  <Text style={[styles.infoTitle, { color: T.text }]}>{formatDate(event.startsAt)}</Text>
                  <Text style={[styles.infoSub, { color: T.textSub }]}>{formatTime(event.startsAt)}</Text>
                </View>
              </View>

              {/* Presentiel Event Location card */}
              {!isFormatOnline ? (
                <View>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={18} color={T.red} />
                    <View style={styles.infoCol}>
                      <Text style={[styles.infoTitle, { color: T.text }]}>{event.location}</Text>
                      {event.locationLat && event.locationLng && (
                        <TouchableOpacity
                          onPress={() => {
                            navigation.navigate('Map', {
                              latitude: event.locationLat,
                              longitude: event.locationLng,
                              title: event.title,
                              address: event.location,
                              fromViewOnMap: true,
                            });
                          }}
                          activeOpacity={0.7}
                          style={{ marginTop: 4 }}
                        >
                          <Text style={{ color: T.green, textDecorationLine: 'underline', fontWeight: '600', fontSize: 13 }}>
                            {t('View on Map')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="people-outline" size={18} color={T.red} />
                    <View style={styles.infoCol}>
                      <Text style={[styles.infoTitle, { color: T.text }]}>
                        {event.attendeesCount || 0} {t('participants')}
                      </Text>
                      {attendeeAvatars.length > 0 && (
                        <View style={styles.smallAvatars}>
                          {attendeeAvatars.map((uri, i) => (
                            <FastImage key={i} source={{ uri: optimizedUrl(uri, 200) || '' }} style={styles.smallAvatar} contentFit="cover" cachePolicy="disk" />
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {event.parkingInfo ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="car-outline" size={18} color={T.red} />
                      <View style={styles.infoCol}>
                        <Text style={[styles.infoTitle, { color: T.text }]}>{t('Parking')}</Text>
                        <Text style={[styles.infoSub, { color: T.textSub }]}>{event.parkingInfo}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : (
                /* Online Event Details Section */
                <View style={styles.card}>
                  <View style={styles.onlineHeaderRow}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: T.greenLight, alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name="video" size={18} color={T.green} />
                    </View>
                    <View style={styles.infoCol}>
                      <View style={styles.onlineBadge}>
                        <Text style={styles.onlineBadgeText}>{t('Online Event')}</Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: T.text, marginTop: 4, fontFamily: 'Poppins_700Bold' }}>
                        {t('Platform:')} {String(event.platform).replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Access check: must be owner or attendee to see link details */}
                  {isOwner || isJoined || (userRegistration && userRegistration.status === 'confirmed') ? (
                    <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: T.border, paddingTop: 12 }}>
                      <Text style={[styles.infoTitle, { color: T.text }]}>{t('Meeting Link')}</Text>
                      <TouchableOpacity onPress={() => Linking.openURL(event.meetingUrl)}>
                        <Text style={{ color: T.green, textDecorationLine: 'underline', fontSize: 13 }} numberOfLines={1}>
                          {event.meetingUrl}
                        </Text>
                      </TouchableOpacity>

                      {event.accessCode ? (
                        <View style={{ marginTop: 4 }}>
                          <Text style={[styles.infoTitle, { color: T.text }]}>{t('Access Code')}</Text>
                          <Text style={{ color: T.textSub, fontSize: 13 }}>{event.accessCode}</Text>
                        </View>
                      ) : null}

                      {event.instructions ? (
                        <View style={{ marginTop: 4 }}>
                          <Text style={[styles.infoTitle, { color: T.text }]}>{t('Join Instructions')}</Text>
                          <Text style={{ color: T.textSub, fontSize: 13, lineHeight: 18 }}>{event.instructions}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <View style={{ borderTopWidth: 1, borderTopColor: T.border, paddingTop: 12, alignItems: 'center' }}>
                      <Feather name="lock" size={24} color={T.textMuted} style={{ marginBottom: 6 }} />
                      <Text style={{ fontSize: 12, color: T.textMuted, textAlign: 'center' }}>
                        {t('Join this event to unlock the link and access details.')}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Event Description */}
              <View style={{ height: 16 }} />
              <Text style={[styles.sectionTitle, { color: T.text }]}>{t('About Event')}</Text>
              <Text style={[styles.sectionBody, { color: T.textSub }]}>
                {event.description || t('No description provided.')}
              </Text>

              {/* Bottom Join / Pricing button bar */}
              <View style={styles.actionRow}>
                <View style={styles.priceWrap}>
                  <Text style={[styles.priceLabel, { color: T.textSub }]}>{t('Price')}</Text>
                  <Text style={[styles.priceValue, { color: T.green }]}>
                    {event.price ? `${event.price} ${event.currency || 'TND'}` : t('Free')}
                  </Text>
                </View>

                {!isOwner && (
                  isFinished ? (
                    <View style={styles.joinBtnLargeCancel}>
                      <Text style={[styles.joinBtnTextLarge, { color: '#6B7280' }]}>{t('Finished')}</Text>
                    </View>
                  ) : isJoined ? (
                    <TouchableOpacity
                      onPress={handleCancel}
                      activeOpacity={0.8}
                      style={styles.joinBtnLargeCancel}
                      disabled={joining}
                    >
                      {joining ? (
                        <ActivityIndicator color={T.text} />
                      ) : (
                        <Text style={[styles.joinBtnTextLarge, { color: '#111827' }]}>{t('Cancel')}</Text>
                      )}
                    </TouchableOpacity>
                  ) : userRegistration && ['WAITING_PAYMENT', 'PENDING'].includes(String(userRegistration.status || '').toUpperCase()) ? (
                    <TouchableOpacity
                      onPress={() => {
                        setActiveRegId(userRegistration._id);
                        setIsDirectSuccess(false);
                        triggerSuccessModal();
                      }}
                      activeOpacity={0.8}
                      style={[styles.joinBtnLarge, { backgroundColor: T.green }]}
                    >
                      <Text style={styles.joinBtnTextLarge}>{t('Pending Validation')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={handleJoin}
                      activeOpacity={0.8}
                      style={[styles.joinBtnLarge, { backgroundColor: T.green }]}
                      disabled={joining}
                    >
                      {joining ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.joinBtnTextLarge}>
                          {event.price && parseFloat(event.price) > 0 ? t('Buy Ticket') : t('Join Event')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )
                )}
              </View>

              {/* ORGANIZER PANEL: Single Elegant Manage Button */}
              {isOwner && (
                <View style={{ marginTop: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: T.border }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: T.green,
                      height: 48,
                      borderRadius: 14,
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'row',
                      gap: 8,
                      shadowColor: T.green,
                      shadowOpacity: 0.2,
                      shadowOffset: { width: 0, height: 4 },
                      shadowRadius: 8,
                      elevation: 3,
                      position: 'relative',
                    }}
                    onPress={() => navigation.navigate('EventRegistrationRequests', { eventId, title: event.title })}
                    activeOpacity={0.85}
                  >
                    <Feather name="settings" size={18} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700', fontFamily: 'Poppins_700Bold' }}>
                      {t('Manage Registrations')}
                    </Text>
                    {Number(event.pendingRequestsCount || 0) > 0 && (
                      <View
                        style={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          backgroundColor: T.red,
                          borderRadius: 12,
                          width: 24,
                          height: 24,
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderWidth: 2,
                          borderColor: T.surface,
                        }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', fontFamily: 'Poppins_700Bold' }}>
                          {event.pendingRequestsCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: T.text }}>{t('Event not found or removed.')}</Text>
          </View>
        )}
      </ScrollView>

      {/* ATTENDEE REGISTRATION MODAL */}
      <Modal visible={showRegModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalContent}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('Registration Form')}</Text>
                <TouchableOpacity onPress={() => setShowRegModal(false)}>
                  <Feather name="x" size={20} color={T.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.modalInputGroup, { flex: 1 }]}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSub }}>{t('First Name *')}</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder={t('First Name')}
                      placeholderTextColor={T.textMuted}
                      value={regFirstName}
                      onChangeText={setRegFirstName}
                    />
                    {regErrors.firstName && <Text style={{ color: T.red, fontSize: 11, marginTop: 4 }}>{regErrors.firstName}</Text>}
                  </View>
                  <View style={[styles.modalInputGroup, { flex: 1 }]}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSub }}>{t('Last Name *')}</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder={t('Last Name')}
                      placeholderTextColor={T.textMuted}
                      value={regLastName}
                      onChangeText={setRegLastName}
                    />
                    {regErrors.lastName && <Text style={{ color: T.red, fontSize: 11, marginTop: 4 }}>{regErrors.lastName}</Text>}
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSub }}>{t('Email Address *')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('Enter email address')}
                    placeholderTextColor={T.textMuted}
                    value={regEmail}
                    onChangeText={setRegEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {regErrors.email && <Text style={{ color: T.red, fontSize: 11, marginTop: 4 }}>{regErrors.email}</Text>}
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSub }}>{t('Phone Number *')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('+216 XX XXX XXX')}
                    placeholderTextColor={T.textMuted}
                    value={regPhone}
                    onChangeText={setRegPhone}
                    keyboardType="phone-pad"
                  />
                  {regErrors.phone && <Text style={{ color: T.red, fontSize: 11, marginTop: 4 }}>{regErrors.phone}</Text>}
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSub }}>{t('Gender *')}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                    {['Male', 'Female'].map((g) => {
                      const active = regGender === g;
                      return (
                        <TouchableOpacity
                          key={g}
                          style={{ flex: 1, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: active ? T.green : T.border, backgroundColor: active ? T.green + '15' : T.surfaceAlt, justifyContent: 'center', alignItems: 'center' }}
                          onPress={() => setRegGender(g)}
                        >
                          <Text style={{ color: active ? T.green : T.textSub, fontWeight: '600' }}>{t(g)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSub }}>{t('Date of Birth (Optional)')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={T.textMuted}
                    value={regDateOfBirth}
                    onChangeText={setRegDateOfBirth}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSub }}>{t('Address (Optional)')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('Enter address')}
                    placeholderTextColor={T.textMuted}
                    value={regAddress}
                    onChangeText={setRegAddress}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.modalInputGroup, { flex: 1 }]}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSub }}>{t('City (Optional)')}</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder={t('City')}
                      placeholderTextColor={T.textMuted}
                      value={regCity}
                      onChangeText={setRegCity}
                    />
                  </View>
                  <View style={[styles.modalInputGroup, { flex: 1 }]}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSub }}>{t('Country (Optional)')}</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder={t('Country')}
                      placeholderTextColor={T.textMuted}
                      value={regCountry}
                      onChangeText={setRegCountry}
                    />
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSub }}>{t('Notes / Comment (Optional)')}</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalInputArea]}
                    placeholder={t('Special requests, allergies, comments')}
                    placeholderTextColor={T.textMuted}
                    value={regNotes}
                    onChangeText={setRegNotes}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </ScrollView>

              <TouchableOpacity
                onPress={handleRegisterSubmit}
                style={styles.modalSubmitBtn}
                disabled={joining}
              >
                {joining ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>{t('Submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* REGISTRATION SUCCESS MODAL (Scale/Fade animated popup) */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View style={[
            { 
              transform: [{ scale: scaleAnim }],
              backgroundColor: T.surface,
              width: screenWidth * 0.85,
              borderRadius: 24,
              padding: 24,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 8,
            }
          ]}>
            <View style={{ width: 65, height: 65, borderRadius: 32.5, backgroundColor: T.green + '18', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Feather name="check-circle" size={36} color={T.green} />
            </View>

            <Text style={{ fontSize: 17, fontWeight: '700', fontFamily: 'Poppins_700Bold', color: T.text, textAlign: 'center', marginBottom: 8 }}>
              {t('Registration Submitted Successfully')}
            </Text>

            <Text style={{ fontSize: 14, fontWeight: '600', fontFamily: 'Poppins_600SemiBold', color: T.textSub, textAlign: 'center', marginBottom: 12 }}>
              {t('Your registration has been received.')}
            </Text>

            <Text style={{ fontSize: 12.5, fontFamily: 'Poppins_400Regular', color: T.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: 24 }}>
              {t('Your ticket is currently waiting for organizer validation. Since this event uses Cash on Arrival (Sur Place), your registration will be approved after payment verification by the organizer.')}
            </Text>

            <View style={{
              flexDirection: isDirectSuccess ? 'row' : 'column-reverse',
              gap: 10,
              width: '100%',
              marginTop: 10
            }}>
              <TouchableOpacity
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: T.border,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onPress={() => {
                  closeSuccessModal();
                  setShowRegModal(false);
                }}
              >
                <Text style={{ color: T.textSub, fontWeight: '600', fontFamily: 'Poppins_600SemiBold' }}>{t('Close')}</Text>
              </TouchableOpacity>

              {!isDirectSuccess && (
                <TouchableOpacity
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: '#EF4444',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    // Close success modal and open the cancellation confirmation modal
                    closeSuccessModal();
                    setShowRegModal(false);
                    setShowCancelConfirm(true);
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontFamily: 'Poppins_700Bold' }}>{t('Withdraw Request')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
 
      {/* Cancel participation modal */}
      <Modal visible={showCancelConfirm} transparent animationType="fade" onRequestClose={closeCancel}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: T.surface, borderRadius: 14, padding: 18 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 8 }}>
              {userRegistration && ['WAITING_PAYMENT', 'PENDING'].includes(String(userRegistration.status || '').toUpperCase())
                ? t("Voulez-vous retirer votre demande d'inscription ?")
                : t('Cancel participation')}
            </Text>
            <Text style={{ fontSize: 14, color: T.textSub, lineHeight: 20, marginBottom: 18 }}>
              {userRegistration && ['WAITING_PAYMENT', 'PENDING'].includes(String(userRegistration.status || '').toUpperCase())
                ? t("Votre demande d'inscription en attente sera annulée.")
                : t('Are you sure you want to cancel your participation? This will remove you from the attendee list.')}
            </Text>
            <View style={{
              flexDirection: userRegistration && ['WAITING_PAYMENT', 'PENDING'].includes(String(userRegistration.status || '').toUpperCase())
                ? 'column-reverse'
                : (isRTL ? 'row-reverse' : 'row'),
              justifyContent: 'flex-end',
              gap: 10,
              width: '100%'
            }}>
              <Pressable
                onPress={closeCancel}
                style={({ pressed }) => ({
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: T.border,
                  backgroundColor: pressed ? T.surfaceAlt : 'transparent',
                  alignItems: 'center',
                  width: userRegistration && ['WAITING_PAYMENT', 'PENDING'].includes(String(userRegistration.status || '').toUpperCase()) ? '100%' : 'auto'
                })}
              >
                <Text style={{ color: T.text, fontWeight: '600' }}>
                  {userRegistration && ['WAITING_PAYMENT', 'PENDING'].includes(String(userRegistration.status || '').toUpperCase())
                    ? t("Non, garder ma demande")
                    : t('Keep')}
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmCancel}
                style={({ pressed }) => ({
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: pressed ? '#DC2626' : '#EF4444',
                  alignItems: 'center',
                  width: userRegistration && ['WAITING_PAYMENT', 'PENDING'].includes(String(userRegistration.status || '').toUpperCase()) ? '100%' : 'auto'
                })}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                  {userRegistration && ['WAITING_PAYMENT', 'PENDING'].includes(String(userRegistration.status || '').toUpperCase())
                    ? t("Oui, retirer ma demande")
                    : t('Cancel participation')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Event modal */}
      <Modal visible={showCancelEventConfirm} transparent animationType="fade" onRequestClose={() => setShowCancelEventConfirm(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: T.surface, borderRadius: 14, padding: 18 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 8 }}>{t('Cancel Event')}</Text>
            <Text style={{ fontSize: 14, color: T.textSub, lineHeight: 20, marginBottom: 18 }}>
              {t('Are you sure you want to cancel this event? This will notify all registered attendees and set the event as cancelled.')}
            </Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'flex-end', gap: 10 }}>
              <Pressable onPress={() => setShowCancelEventConfirm(false)} style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: pressed ? T.surfaceAlt : 'transparent' })}>
                <Text style={{ color: T.text, fontWeight: '600' }}>{t('Keep')}</Text>
              </Pressable>
              <Pressable onPress={confirmCancelEvent} style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: pressed ? '#DC2626' : '#EF4444' })}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{t('Cancel Event')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AppScaffold>
  );
}
