import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, ScrollView, TextInput, Animated, Easing } from 'react-native';
import { AppScaffold } from '@/shared/components/AppScaffold';
import { useTheme } from '@/shared/context/theme.context';
import { Radius } from '@/shared/utils/theme';
import { eventsApi } from '../../../home/api/events.api';
import type { GlunityEvent } from '../../../home/domain/home.types';
import { Ionicons, Feather } from '@expo/vector-icons';
import EventCard from '../../components/EventCard';
import { useAuth } from '@/modules/auth/state/auth.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/shared/context/language.context';

const FILTER_KEYS = [
  { key: 'All',       label: 'All',       icon: 'apps-outline'          as const },
  { key: 'Meetups',   label: 'Meetups',   icon: 'people-outline'        as const },
  { key: 'Classes',   label: 'Workshops', icon: 'school-outline'        as const },
  { key: 'Markets',   label: 'Markets',   icon: 'storefront-outline'    as const },
];

export default function EventsCalendarScreen({ navigation }: any) {
  const { theme: T } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isRTL, t } = useLanguage();
  const [events, setEvents] = React.useState<GlunityEvent[]>([]);
  const [filter, setFilter] = React.useState('All');

  // Search State
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const searchAnim = React.useRef(new Animated.Value(0)).current;
  const inputRef = React.useRef<any>(null);

  const toggleSearch = React.useCallback(() => {
    const next = !searchOpen;
    setSearchOpen(next);
    if (next) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      inputRef.current?.blur();
      setSearchQuery('');
    }
    Animated.timing(searchAnim, {
      toValue: next ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [searchOpen, searchAnim]);

  const searchHeight = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });

  const searchOpacity = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

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

  const filtered = React.useMemo(() => {
    let list = events;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => 
        (e.title && e.title.toLowerCase().includes(q)) || 
        (e.description && e.description.toLowerCase().includes(q)) || 
        (e.location && typeof e.location === 'object' && e.location.name && e.location.name.toLowerCase().includes(q)) || 
        (e.location && typeof e.location === 'object' && e.location.address && e.location.address.toLowerCase().includes(q))
      );
    }
    return list;
  }, [events, searchQuery]);

  const styles = React.useMemo(() => StyleSheet.create({
    root: { flex: 1, paddingHorizontal: 12 },
    filterRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      marginBottom: 16,
      flexWrap: 'nowrap',
      alignItems: 'center',
      paddingVertical: 8,
      paddingLeft: isRTL ? 0 : 6,
      paddingRight: isRTL ? 6 : 0,
    },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      minHeight: 36,
      borderRadius: 999,
      backgroundColor: T.surface,
      marginRight: isRTL ? 0 : 10,
      marginLeft: isRTL ? 10 : 0,
      borderWidth: 1,
      borderColor: T.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 6,
      shadowColor: '#000',
      shadowOpacity: 0.04,
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
      shadowOpacity: 0.32,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 14,
      elevation: 8,
    },
    filterText: {
      fontSize: 13,
      fontWeight: '600',
      color: T.textSub || '#374151',
      fontFamily: 'Poppins_600SemiBold',
    },
    filterTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    list: { paddingBottom: 120, paddingTop: 6 },

    // Search input styles
    searchWrap: {
      overflow: 'hidden',
      borderRadius: 14,
      marginTop: 8,
      marginBottom: 4,
    },
    searchInner: {
      height: 44,
      borderRadius: 14,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: T.text,
      paddingVertical: 0,
      backgroundColor: 'transparent',
      includeFontPadding: false,
      textAlign: isRTL ? 'right' : 'left',
    },

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
      left: isRTL ? undefined : 12,
      right: isRTL ? 12 : undefined,
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
    cardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: isRTL ? 'right' : 'left' },
    cardMeta: { fontSize: 14, color: T.textSub, textAlign: isRTL ? 'right' : 'left' },
    metaRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 6 },
    metaIcon: { marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 },
    cardFooter: { marginTop: 10, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { backgroundColor: '#E6FFFA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
    badgeText: { color: '#047857', fontWeight: '700', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 },
    fab: {
      position: 'absolute',
      bottom: 96 + Math.max(insets.bottom, 12) + 20,
      right: isRTL ? undefined : 20,
      left: isRTL ? 20 : undefined,
      height: 46,
      paddingHorizontal: 18,
      borderRadius: 23,
      backgroundColor: T.green,
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
  }), [T, insets, isRTL]);

  return (
    <AppScaffold
      title="Events"
      activeTab="events"
      showSearch
      onSearchPress={toggleSearch}
      searchIcon={searchOpen ? 'x' : 'search'}
      contentStyle={{ backgroundColor: T.bg }}
    >
      <View style={[styles.root, { backgroundColor: T.bg }] }>
        {/* FlatList header will render filter and will be sticky */}

        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          ListHeaderComponent={() => (
            <View style={{ backgroundColor: T.bg }}>
              <Animated.View style={[styles.searchWrap, { height: searchHeight, opacity: searchOpacity }]}>
                <View style={styles.searchInner}>
                  <Feather name="search" size={16} color={T.textMuted} />
                  <TextInput
                    ref={inputRef}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={t('Search events...')}
                    placeholderTextColor={T.textMuted}
                    underlineColorAndroid="transparent"
                    style={styles.searchInput}
                  />
                  {!!searchQuery && (
                    <TouchableOpacity activeOpacity={0.8} onPress={() => setSearchQuery("")}>
                      <Ionicons name="close-circle" size={16} color={T.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>

              <ScrollView horizontal contentContainerStyle={styles.filterRow} showsHorizontalScrollIndicator={false}>
                {FILTER_KEYS.map(({ key, label, icon }) => {
                  const isActive = filter === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setFilter(key)}
                      activeOpacity={0.8}
                      style={[styles.filterPill, isActive && styles.filterPillActive]}
                    >
                      <Ionicons
                        name={icon}
                        size={14}
                        color={isActive ? '#FFFFFF' : (T.textSub || '#374151')}
                      />
                      <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{t(label)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
          stickyHeaderIndices={[0]}
          ListEmptyComponent={() => (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: T.textSub, fontSize: 15 }}>{t('No events to display.')}</Text>
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
            <Text style={styles.fabText}>{t('Add Event')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </AppScaffold>
  );
}
