import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import type { GlunityEvent } from '../../home/domain/home.types';

type Props = {
  event: GlunityEvent;
  onPress?: () => void;
};

export default function EventCard({ event, onPress }: Props) {
  const { theme: T } = useTheme();
  const { isRTL } = useLanguage();

  const styles = React.useMemo(() => StyleSheet.create({
    card: {
      borderRadius: 14,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
      elevation: 4,
    },
    cardImage: { width: '100%', height: 140, backgroundColor: '#F3F4F6' },
    typePill: {
      position: 'absolute',
      left: isRTL ? undefined : 12,
      right: isRTL ? 12 : undefined,
      top: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#EF4444',
      zIndex: 10,
    },
    typePillText: { fontWeight: '800', fontSize: 12 },
    cardBody: { paddingHorizontal: 16, paddingVertical: 14 },
    cardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: isRTL ? 'right' : 'left' },
    cardMeta: { fontSize: 14, textAlign: isRTL ? 'right' : 'left' },
    metaRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 6 },
    metaIcon: { marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 },
    cardFooter: { marginTop: 10, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { backgroundColor: '#E6FFFA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
    badgeText: { color: '#047857', fontWeight: '700', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 },
  }), [T, isRTL]);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: T.surface }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Image source={{ uri: event.imageUrl }} style={styles.cardImage} />
      {event.type ? (
        <View style={[styles.typePill, { backgroundColor: T.surface }]}>
          <Text style={[styles.typePillText, { color: T.red || '#EF4444' }]}>{event.type}</Text>
        </View>
      ) : null}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: T.text }]} numberOfLines={2}>{event.title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={T.green} style={styles.metaIcon} />
          <Text style={[styles.cardMeta, { color: T.textSub }]}>{event.date}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={16} color={T.textSub} style={styles.metaIcon} />
          <Text style={[styles.cardMeta, { color: T.textSub }]} numberOfLines={1}>{event.location}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View />
          <View style={styles.badge}>
            <Ionicons name="people" size={14} color={'#047857'} />
            <Text style={styles.badgeText}>{event.attendeesCount || 0} going</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
