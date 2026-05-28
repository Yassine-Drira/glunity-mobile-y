import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Pressable } from 'react-native';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { Radius } from '@/shared/utils/theme';
import { eventsApi } from '../../../home/api/events.api';
import { useAuth } from '@/modules/auth/state/auth.context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'EventDetail'>;

export default function EventDetailScreen({ navigation, route }: Props) {
  const { theme: T } = useTheme();
  const { eventId } = route.params as any;
  const [event, setEvent] = React.useState<any>(null);
  const [joining, setJoining] = React.useState(false);
  const { user } = useAuth();

  const isJoined = React.useMemo(() => {
    if (!event || !user) return false;
    const attendees: string[] = event.attendees || [];
    return attendees.includes(user._id);
  }, [event, user]);

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

  const handleCancel = () => setShowCancelConfirm(true);
  const closeCancel = () => setShowCancelConfirm(false);
  const confirmCancel = async () => {
    closeCancel();
    await handleLeaveConfirmed();
  };

  return (
    <AppScaffold
      title="Event"
      activeTab="events"
      onPressHome={() => navigation.navigate('Home')}
      onPressEvents={() => navigation.navigate('Events')}
      onPressCenter={() => {}}
      onPressReels={() => {}}
      onPressProfile={() => navigation.navigate('Profile')}
      contentStyle={{ backgroundColor: T.bg }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {event ? (
          <View style={[styles.root, { backgroundColor: T.bg }] }>
            <Image source={{ uri: event.imageUrl }} style={[styles.image, { backgroundColor: T.surfaceAlt }]} />
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
                    <TouchableOpacity onPress={() => navigation.navigate('Map') } activeOpacity={0.7}>
                      <Text style={[styles.infoSub, { color: T.textSub }]}>View on Map</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Attendees row */}
                <View style={[styles.infoRow, { marginTop: 8, alignItems: 'center' }] }>
                  <Ionicons name="people-outline" size={18} color={T.red} />
                  <View style={[styles.infoCol, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }] }>
                    <View>
                      <Text style={[styles.infoTitle, { color: T.text }]}>{(event.attendeesCount || 0) + ' people going'}</Text>
                      <View style={{ height: 6 }} />
                      <View style={styles.smallAvatars}>
                        <View style={[styles.smallAvatar, { backgroundColor: '#111827' }]} />
                        <View style={[styles.smallAvatar, { backgroundColor: '#111827', marginLeft: -8 }]} />
                        <View style={[styles.smallAvatar, { backgroundColor: '#111827', marginLeft: -8 }]} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <View style={{ height: 16 }} />
              <Text style={[styles.sectionTitle, { color: T.text }]}>About Event</Text>
              <Text style={[styles.sectionBody, { color: T.textSub }]} numberOfLines={6}>{event.description || 'No description provided.'}</Text>

              <View style={{ height: 18 }} />

              <View style={styles.actionRow}>
                <View style={styles.priceWrap}>
                  <Text style={[styles.priceLabel, { color: T.textSub }]}>Price</Text>
                  <Text style={[styles.priceValue, { color: T.green }]}>{event.price ? `${event.price}${event.currency || ''}` : 'Free'}</Text>
                </View>

                {!isJoined ? (
                  <TouchableOpacity
                    onPress={handleJoin}
                    activeOpacity={0.8}
                    style={[styles.joinBtnLarge, { backgroundColor: T.green }]}
                    disabled={joining}
                  >
                    {joining ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.joinBtnTextLarge}>Join Event</Text>
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
                      <Text style={[styles.joinBtnTextLarge, { color: '#111827' }]}>Cancel</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={{ padding: 24 }}>
            <Text style={{ color: T.text }}>Loading...</Text>
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
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 8 }}>Cancel participation</Text>
              <Text style={{ fontSize: 14, color: T.textSub, lineHeight: 20, marginBottom: 18 }}>
                Are you sure you want to cancel your participation? This will remove you from the attendee list.
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                <Pressable onPress={closeCancel} style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: pressed ? T.surfaceAlt : 'transparent' })}>
                  <Text style={{ color: T.text, fontWeight: '600' }}>Keep</Text>
                </Pressable>

                <Pressable onPress={confirmCancel} style={({ pressed }) => ({ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: pressed ? '#DC2626' : '#EF4444' })}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Cancel participation</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </AppScaffold>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: 'relative' },
  image: { width: '100%', height: 260, borderRadius: 12, marginBottom: 12 },
  typePill: { position: 'absolute', left: 20, top: 20, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, zIndex: 10 },
  typePillText: { fontSize: 12, fontWeight: '700', paddingHorizontal: 4 },
  body: { paddingHorizontal: 16, paddingTop: 4 },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 30, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  metaText: { fontSize: 13 },
  attendeesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#FFFFFF' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionBody: { fontSize: 14, lineHeight: 20 },
  joinBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  joinBtnText: { color: '#FFFFFF', fontWeight: '700' },
  price: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  priceWrap: { flexDirection: 'column' },
  priceLabel: { fontSize: 12, fontWeight: '600' },
  priceValue: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  joinBtnLarge: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, minWidth: 180, alignItems: 'center', shadowColor: '#8BC34A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 18, elevation: 6 },
  joinBtnLargeCancel: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, minWidth: 180, alignItems: 'center', backgroundColor: '#F3F4F6' },
  joinBtnTextLarge: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  infoCol: { marginLeft: 10 },
  infoTitle: { fontSize: 14, fontWeight: '700' },
  infoSub: { fontSize: 12, marginTop: 2 },
  smallAvatars: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  smallAvatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF' },
});
