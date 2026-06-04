import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import FastImage from '@/shared/components/FastImage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import type { GlunityEvent } from '../../home/domain/home.types';

type Props = {
  event: GlunityEvent;
  onPress?: () => void;
};

function EventCard({ event, onPress }: Props) {
  const { theme: T } = useTheme();
  const { isRTL } = useLanguage();


  const [loaded, setLoaded] = React.useState(false);
  const loadStartRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (event.imageUrl) {
      loadStartRef.current = Date.now();
    } else {
      loadStartRef.current = null;
    }
  }, [event.imageUrl]);

  // Optimize image URL (request a smaller width when possible) to speed load
  function optimizedUrl(url?: string | null, w = 600) {
    if (!url) return url;
    try {
      const u = new URL(url);
      // Unsplash supports width/format params
      if (u.hostname.includes('images.unsplash.com')) {
        if (u.search) u.search += '&';
        u.search += `w=${w}&auto=format&fit=crop&q=75`;
        return u.toString();
      }
      // Fallback: return original
      return url;
    } catch (e) {
      return url;
    }
  }

  const optimizedSource = event.imageUrl ? { uri: optimizedUrl(event.imageUrl, 600) || '' } : undefined;

  function formatDate(d?: string | null) {
    try {
      const dt = d ? new Date(d) : null;
      if (!dt) return event.date || '';
      return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return event.date || '';
    }
  }

  function formatTime(d?: string | null) {
    try {
      const dt = d ? new Date(d) : null;
      if (!dt) return '';
      return dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  }

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
    cardImage: { width: '100%', height: 140, backgroundColor: T.surfaceAlt },
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
    badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
    badgeText: { fontWeight: '700', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 },
    locationRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
  }), [T, isRTL]);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: T.surface }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={{ position: 'relative' }}>
        {optimizedSource ? (
          <FastImage
            source={optimizedSource}
            style={styles.cardImage}
            contentFit="cover"
            transition={150}
            cachePolicy="disk"
            priority="high"
            onError={() => { /* ignore image error */ }}
          />
        ) : (
          <View style={styles.cardImage} />
        )}
      </View>
      {event.type ? (
        <View style={[styles.typePill, { backgroundColor: T.surface }]}>
          <Text style={[styles.typePillText, { color: T.red || '#EF4444' }]}>{event.type}</Text>
        </View>
      ) : null}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: T.text }]} numberOfLines={1} ellipsizeMode="tail">{event.title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={T.green} style={styles.metaIcon} />
          <Text style={[styles.cardMeta, { color: T.textSub }]}>{formatDate(event.startsAt)}{event.startsAt ? ` • ${formatTime(event.startsAt)}` : ''}</Text>
        </View>
        {/* location moved to footer to match requested design */}

        <View style={styles.cardFooter}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={T.textSub} style={styles.metaIcon} />
            <Text style={[styles.cardMeta, { color: T.textSub }]} numberOfLines={1}>{typeof event.location === 'object' && event.location ? (event.location.name || event.location.address || '') : event.location}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: T.greenLight }]}> 
            <Ionicons name="people" size={14} color={T.green} />
            <Text style={[styles.badgeText, { color: T.green }]}>{event.attendeesCount || 0} going</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(EventCard);
