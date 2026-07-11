import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { Radius } from '@/shared/utils/theme';
import { eventsApi } from '../../../home/api/events.api';
import { useAuth } from '@/modules/auth/state/auth.context';
import { Ionicons } from '@expo/vector-icons';
import FastImage from '@/shared/components/FastImage';
import { Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'EventDetail'>;

export default function EventDetailScreen({ navigation, route }: Props) {
  const { theme: T } = useTheme();
  const insets = useSafeAreaInsets();
  const { isRTL, t } = useLanguage();
  const { eventId } = route.params as any;
  const [event, setEvent] = React.useState<any>(null);
  const [joining, setJoining] = React.useState(false);
  const { user } = useAuth();

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

  const isJoined = React.useMemo(() => {
    if (!event || !user) return false;
    const attendees: string[] = event.attendees || [];
    return attendees.includes(user._id);
  }, [event, user]);

  const isFinished = React.useMemo(() => {
    if (!event) return false;
    try {
      if (event.isFinished) return true;
      const starts = event.startsAt ? new Date(event.startsAt) : null;
      if (!starts) return false;
      return starts.getTime() < Date.now();
    } catch {
      return false;
    }
  }, [event]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ev = await eventsApi.get(eventId);
        if (!mounted) return;
        setEvent(ev);
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [eventId]);

  function formatDate(d: string | undefined) {
    try {
      const dt = d ? new Date(d) : null;
      if (!dt) return '';
      return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return d || '';
    }
  }

  function formatTime(d: string | undefined) {
    try {
      const dt = d ? new Date(d) : null;
      if (!dt) return '';
      return dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  const handleJoin = async () => {
    if (!event) return;
    try {
      setJoining(true);
      const updated = await eventsApi.join(event.id);
      setEvent(updated);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    } catch (err) {
      // TODO: surface error
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveConfirmed = async () => {
    if (!event) return;
    try {
      setJoining(true);
      const updated = await eventsApi.leave(event.id);
      setEvent(updated);
    } catch (err) {
      // TODO: surface error
    } finally {
      setJoining(false);
    }
  };

  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);
  const [showCancelEventConfirm, setShowCancelEventConfirm] = React.useState(false);

  const handleCancel = () => setShowCancelConfirm(true);
  const closeCancel = () => setShowCancelConfirm(false);
  const confirmCancel = async () => {
    closeCancel();
    await handleLeaveConfirmed();
  };

  const isOwner = React.useMemo(() => {
    if (!event || !user) return false;
    const ownerId = event.createdBy || (event.organizer && event.organizer.organizerId);
    return ownerId && String(ownerId) === String(user._id);
  }, [event, user]);

  const handleCancelEventPress = () => setShowCancelEventConfirm(true);
  const closeCancelEvent = () => setShowCancelEventConfirm(false);
  const confirmCancelEvent = async () => {
    closeCancelEvent();
    try {
      // If the current user is a pro/commercial profile or admin, call the remove endpoint.
      if (user?.profileType === 'pro_commerce' || user?.profileType === 'admin') {
        await eventsApi.remove(event.id);
      } else {
        await eventsApi.cancel(event.id);
      }
      // backend will create notifications for attendees; navigate to Events list
      navigation.navigate('Events');
    } catch (err: any) {
      // Surface error to the user
      console.warn('Failed to cancel event', err && err.message);
      Alert.alert(t('Error'), err?.response?.data?.message || err?.message || t('Failed to cancel event'));
    }
  };

  const styles = React.useMemo(() => StyleSheet.create({
    root: { flex: 1, position: 'relative' },
    image: { width: '100%', height: 260, borderRadius: 12, marginBottom: 12 },
    typePill: {
      position: 'absolute',
      left: isRTL ? undefined : 20,
      right: isRTL ? 20 : undefined,
      top: 20,
      paddingHorizontal: 10,
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
    actionRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
    priceWrap: { flexDirection: 'column', alignItems: isRTL ? 'flex-end' : 'flex-start' },
    priceLabel: { fontSize: 12, fontWeight: '600' },
    priceValue: { fontSize: 16, fontWeight: '800', marginTop: 4 },
    joinBtnLarge: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, minWidth: 180, alignItems: 'center', shadowColor: '#8BC34A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 18, elevation: 6 },
    joinBtnLargeCancel: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, minWidth: 180, alignItems: 'center', backgroundColor: '#F3F4F6' },
    joinBtnTextLarge: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    infoRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', marginTop: 8 },
    infoCol: { marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' },
    infoTitle: { fontSize: 14, fontWeight: '700' },
    infoSub: { fontSize: 12, marginTop: 2 },
    smallAvatars: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 6 },
    smallAvatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF', marginLeft: isRTL ? 0 : -8, marginRight: isRTL ? -8 : 0 },
    deleteBtnCentered: { alignSelf: 'center', marginTop: 12, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14, minWidth: 180, alignItems: 'center', backgroundColor: '#EF4444' },
    deleteBtnText: { color: '#FFFFFF', fontWeight: '700' },
  }), [T, isRTL]);

  const attendeeAvatars = React.useMemo(() => {
    if (!event) return [];
    const avatars: Array<string> = (event.attendeesAvatars || []).filter(Boolean);
    const count = Math.max(event.attendeesCount || 0, avatars.length);
    const displayCount = Math.min(3, count);
    // sample pool to use when avatar URLs are missing
    const sampleAvatars = [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop',
    ];
    const out: Array<string> = [];
    for (let i = 0; i < displayCount; i++) {
      if (avatars[i]) out.push(avatars[i]);
      else out.push(sampleAvatars[i % sampleAvatars.length]);
    }
    return out;
  }, [event]);

  return (
    <AppScaffold
      title={t('Event')}
      activeTab="events"
      onBack={() => navigation.goBack()}
      rightElement={isOwner ? (
        <TouchableOpacity onPress={handleCancelEventPress} style={{ padding: 8 }} activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={20} color={T.text} />
        </TouchableOpacity>
      ) : undefined}
      onPressHome={() => navigation.navigate('Home')}
      onPressEvents={() => navigation.navigate('Events')}
      onPressCenter={() => {}}
      onPressReels={() => {}}
      onPressProfile={() => navigation.navigate('Profile')}
      contentStyle={{ backgroundColor: T.bg }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 116 + insets.bottom }}>
        {event ? (
          <View style={[styles.root, { backgroundColor: T.bg }] }>
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
                  onLoad={() => { /* image loaded */ }}
                  onError={() => { /* ignore */ }}
                />
              ) : null}
              {/* top-right overlay removed to avoid duplicate delete actions */}
            </View>
            {event.type && (
              <View style={[styles.typePill, { borderColor: T.red, backgroundColor: T.surface }] }>
                <Text style={[styles.typePillText, { color: T.red }]}>{String(event.type).charAt(0).toUpperCase() + String(event.type).slice(1)}</Text>
              </View>
            )}
            <View style={styles.body}>
              <Text style={[styles.title, { color: T.text }]}>{event.title}</Text>
              <View style={{ marginTop: 8 }}>
                {/* Date row */}
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={18} color={T.red} />
                  <View style={styles.infoCol}>
                    <Text style={[styles.infoTitle, { color: T.text }]}>{formatDate(event.startsAt)}</Text>
                    <Text style={[styles.infoSub, { color: T.textSub }]}>{formatTime(event.startsAt)}</Text>
                  </View>
                </View>
 
                {/* Location row */}
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={18} color={T.red} />
                  <View style={styles.infoCol}>
                    <Text style={[styles.infoTitle, { color: T.text }]}>{event.location}</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        if (event.locationLat && event.locationLng) {
                          navigation.navigate('Map', { 
                            latitude: event.locationLat, 
                            longitude: event.locationLng,
                            title: event.title,
                            address: event.location,
                            fromViewOnMap: true
                          });
                        } else {
                          navigation.navigate('Map');
                        }
                      }} 
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.infoSub, { color: T.green, textDecorationLine: 'underline' }]}>{t('View on Map')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
 
                {/* Attendees row */}
                <View style={[styles.infoRow, { marginTop: 8, alignItems: 'center' }] }>
                  <Ionicons name="people-outline" size={18} color={T.red} />
                  <View style={[styles.infoCol, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }] }>
                    <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={[styles.infoTitle, { color: T.text }]}>{(event.attendeesCount || 0)} {t('people going')}</Text>
                      <View style={{ height: 6 }} />
                      <View style={styles.smallAvatars}>
                        {attendeeAvatars.map((uri, i) => (
                          uri ? (
                            <FastImage key={i} source={{ uri: optimizedUrl(uri, 200) || '' }} style={styles.smallAvatar} contentFit="cover" cachePolicy="disk" priority="high" onLoad={() => { /* avatar loaded */ }} onError={() => { /* ignore */ }} />
                          ) : (
                            <View key={i} style={[styles.smallAvatar, { backgroundColor: '#111827' }]} />
                          )
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <View style={{ height: 16 }} />
              <Text style={[styles.sectionTitle, { color: T.text }]}>{t('About Event')}</Text>
              <Text style={[styles.sectionBody, { color: T.textSub }]} numberOfLines={6}>{event.description || t('No description provided.')}</Text>

              <View style={{ height: 18 }} />

                <View style={styles.actionRow}>
                <View style={styles.priceWrap}>
                  <Text style={[styles.priceLabel, { color: T.textSub }]}>{t('Price')}</Text>
                  <Text style={[styles.priceValue, { color: T.green }]}>{event.price ? `${event.price} ${event.currency || 'TND'}` : t('Free')}</Text>
                </View>

                {!isOwner && (
                  isFinished ? (
                    <View style={[styles.joinBtnLargeCancel, { justifyContent: 'center', backgroundColor: '#F3F4F6' }] }>
                      <Text style={[styles.joinBtnTextLarge, { color: '#6B7280' }]}>{t('Finished')}</Text>
                    </View>
                  ) : !isJoined ? (
                    <TouchableOpacity
                      onPress={handleJoin}
                      activeOpacity={0.8}
                      style={[styles.joinBtnLarge, { backgroundColor: T.green }]}
                      disabled={joining}
                    >
                      {joining ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.joinBtnTextLarge}>{t('Join Event')}</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={handleCancel}
                      activeOpacity={0.8}
                      style={[styles.joinBtnLargeCancel]}
                      disabled={joining}
                    >
                      {joining ? (
                        <ActivityIndicator color="#111827" />
                      ) : (
                        <Text style={[styles.joinBtnTextLarge, { color: '#111827' }]}>{t('Cancel')}</Text>
                      )}
                    </TouchableOpacity>
                  )
                )}
              </View>


            </View>
          </View>
        ) : (
          <View style={{ padding: 24 }}>
            <Text style={{ color: T.text }}>{t('Loading...')}</Text>
          </View>
        )}
        {/** Cancel confirmation modal */}
        <Modal
          visible={showCancelConfirm}
          transparent
          animationType="fade"
          onRequestClose={closeCancel}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
            <View style={{ backgroundColor: T.surface, borderRadius: 14, padding: 18 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 8 }}>{t('Cancel participation')}</Text>
              <Text style={{ fontSize: 14, color: T.textSub, lineHeight: 20, marginBottom: 18 }}>
                {t('Are you sure you want to cancel your participation? This will remove you from the attendee list.')}
              </Text>

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'flex-end', gap: 10 }}>
                <Pressable onPress={closeCancel} style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: pressed ? T.surfaceAlt : 'transparent' })}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>{t('Keep')}</Text>
                </Pressable>

                <Pressable onPress={confirmCancel} style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: pressed ? '#DC2626' : '#EF4444' })}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{t('Cancel participation')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        {/** Cancel event confirmation modal */}
        <Modal
          visible={showCancelEventConfirm}
          transparent
          animationType="fade"
          onRequestClose={closeCancelEvent}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}>
            <View style={{ backgroundColor: T.surface, borderRadius: 14, padding: 18 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 8 }}>{t('Cancel Event')}</Text>
              <Text style={{ fontSize: 14, color: T.textSub, lineHeight: 20, marginBottom: 18 }}>
                {t('Are you sure you want to cancel this event?')}
              </Text>

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'flex-end', gap: 10 }}>
                <Pressable onPress={closeCancelEvent} style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: pressed ? T.surfaceAlt : 'transparent' })}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>{t('Keep')}</Text>
                </Pressable>

                <Pressable onPress={confirmCancelEvent} style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: pressed ? '#DC2626' : '#EF4444' })}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{t('Cancel Event')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </AppScaffold>
  );
}
