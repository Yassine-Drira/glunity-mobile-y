import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, ScrollView } from 'react-native';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { Radius } from '@/shared/utils/theme';
import { eventsApi } from '../../../home/api/events.api';
import type { GlunityEvent } from '../../../home/domain/home.types';
import { Ionicons } from '@expo/vector-icons';
import EventCard from '../../components/EventCard';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FILTERS = ['All', 'Meetups', 'Classes', 'Markets'];

export default function EventsCalendarScreen({ navigation }: any) {
  const { theme: T } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = React.useState<GlunityEvent[]>([]);
  const [filter, setFilter] = React.useState('All');

  const TYPE_MAP: Record<string, string | undefined> = {
    All: undefined,
    Meetups: 'meetup',
    Classes: 'class',
    Markets: 'market',
  };

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const apiType = TYPE_MAP[filter as keyof typeof TYPE_MAP];
        const list = await eventsApi.list(apiType ? { type: apiType } : undefined);
        if (!mounted) return;
        setEvents(list);
      } catch (err) {
        // ignore, keep empty
      }
    })();
    return () => { mounted = false; };
  }, [filter]);

  const filtered = events;
  const styles = React.useMemo(() => StyleSheet.create({
    root: { flex: 1, paddingHorizontal: 12 },
    filterRow: { flexDirection: 'row', marginBottom: 16, flexWrap: 'nowrap', alignItems: 'center', paddingVertical: 8, paddingLeft: 6 },
    filterPill: {
      paddingHorizontal: 18,
      paddingVertical: 8,
      minHeight: 36,
      borderRadius: 999,
      backgroundColor: '#FFFFFF',
      marginRight: 10,
      borderWidth: 1,
      borderColor: '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.03,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 1,
    },
    filterPillActive: {
      backgroundColor: T.green,
      borderWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: T.green,
      shadowOpacity: 0.28,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 14,
      elevation: 8,
    },
    filterText: {
      fontSize: 13,
      fontWeight: '600',
      color: T.textSub || '#374151',
    },
    filterTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    list: { paddingBottom: 120, paddingTop: 6 },

    /* Card / mock styles */
    card: {
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: T.surface,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
      elevation: 4,
    },
    cardImage: { width: '100%', height: 140, backgroundColor: T.surfaceAlt },
    typePill: {
      position: 'absolute',
      left: 12,
      top: 12,
      backgroundColor: T.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: T.red || '#EF4444',
      zIndex: 10,
    },
    typePillText: { color: T.red || '#EF4444', fontWeight: '800', fontSize: 12 },
    cardBody: { paddingHorizontal: 16, paddingVertical: 14 },
    cardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    cardMeta: { fontSize: 14, color: T.textSub },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    metaIcon: { marginRight: 8 },
    cardFooter: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { backgroundColor: '#E6FFFA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center' },
    badgeText: { color: '#047857', fontWeight: '700', marginLeft: 6 },
    fab: {
      position: 'absolute',
      bottom: 96 + Math.max(insets.bottom, 12) + 20,
      right: 20,
      height: 46,
      paddingHorizontal: 18,
      borderRadius: 23,
      backgroundColor: T.green,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      shadowColor: T.green,
      shadowOpacity: 0.35,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 6,
      zIndex: 99,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    fabText: {
      color: '#FFFFFF',
      fontSize: 13.5,
      fontWeight: '700',
      fontFamily: 'Poppins_700Bold',
    },
  }), [T, insets]);

  return (
    <AppScaffold
      title="Events"
      activeTab="events"
      contentStyle={{ backgroundColor: T.bg }}
    >
      <View style={[styles.root, { backgroundColor: T.bg }] }>
        {/* FlatList header will render filter and will be sticky */}

        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          ListHeaderComponent={() => (
            <ScrollView horizontal contentContainerStyle={styles.filterRow} showsHorizontalScrollIndicator={false}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.8}
                  style={[styles.filterPill, filter === f && styles.filterPillActive]}
                >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          stickyHeaderIndices={[0]}
          ListEmptyComponent={() => (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: T.textSub, fontSize: 15 }}>Aucun événement à afficher.</Text>
            </View>
          )}
          style={{ flex: 1 }}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
        {user?.profileType === 'pro_commerce' && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('AddEvent')}
            activeOpacity={0.85}
          >
            <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
            <Text style={styles.fabText}>Add Event</Text>
          </TouchableOpacity>
        )}
      </View>
    </AppScaffold>
  );
}
