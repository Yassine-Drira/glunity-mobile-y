import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context/theme.context';
import type { GlunityEvent } from '../domain/home.types';
import FastImage from '@/shared/components/FastImage';

type Props = {
  event: GlunityEvent;
  onPress?: () => void;
};

const HomeEventCard = React.memo(({ event, onPress }: Props) => {
  const { theme: T } = useTheme();

  function formatEventDate(iso?: string | null) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
    const month = d.toLocaleDateString(undefined, { month: 'short' });
    const day = d.getDate();
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: 'numeric' });
    return `${weekday}, ${month} ${day} · ${time}`;
  }

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, { backgroundColor: T.surface }]}>
      <FastImage source={{ uri: event.imageUrl }} style={styles.image} contentFit="cover" />
      <View style={styles.body}>
        <Text style={[styles.title, { color: T.text }]} numberOfLines={1} ellipsizeMode="tail">{event.title}</Text>

        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={'#C8102E'} />
            <Text style={[styles.metaText, { color: T.textSub }]} numberOfLines={1}>
              {typeof event.location === 'object' && event.location ? (event.location.name || event.location.address || '') : event.location}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={12} color={'#C8102E'} />
            <Text style={[styles.metaText, { color: T.textSub }]} numberOfLines={1}>
              {formatEventDate(event.startsAt || event.date)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
    minHeight: 230,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  image: {
    width: '100%',
    height: 128,
    backgroundColor: '#F3F4F6',
  },
  body: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
  },
  metaContainer: {
    marginTop: 4,
  },
});

export default HomeEventCard;
