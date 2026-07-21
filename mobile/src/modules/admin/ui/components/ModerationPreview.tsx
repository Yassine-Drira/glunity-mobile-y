import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';

import { formatDateUserFriendly } from '../../../../shared/utils/date.utils';

interface ModerationPreviewProps {
  items: Array<{
    _id: string;
    type: 'recipe' | 'event' | 'product' | 'reel';
    title: string;
    authorName: string;
    submittedAt: string;
    thumbnail?: string;
  }>;
  onViewAll: () => void;
}

const getTypeColor = (type: string) => {
  switch(type) {
    case 'recipe': return '#F59E0B';
    case 'event': return '#3B82F6';
    case 'product': return '#8BC34A';
    case 'reel': return '#EC4899';
    default: return Colors.muted;
  }
};

const getTypeLabel = (type: string) => {
  switch(type) {
    case 'recipe': return 'Recette';
    case 'event': return 'Événement';
    case 'product': return 'Produit';
    case 'reel': return 'Reel';
    default: return type;
  }
};

export function ModerationPreview({ items, onViewAll }: ModerationPreviewProps) {
  const { theme: T, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
      {items.map((item, index) => (
        <View key={item._id} style={[styles.item, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }, index === items.length - 1 && { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>
          <View style={[styles.thumbnail, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImg} />
            ) : (
              <Feather name="image" size={16} color={T.textMuted} />
            )}
          </View>
          <View style={styles.content}>
            <View style={styles.row}>
              <View style={[styles.badge, { backgroundColor: getTypeColor(item.type) + '20' }]}>
                <Text style={[styles.badgeText, { color: getTypeColor(item.type) }]}>{getTypeLabel(item.type)}</Text>
              </View>
              <Text style={[styles.time, { color: T.textMuted }]}>{formatDateUserFriendly(item.submittedAt)}</Text>
            </View>
            <Text style={[styles.title, { color: T.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.author, { color: T.textMuted }]} numberOfLines={1}>par {item.authorName}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.btn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]} onPress={onViewAll}>
        <Text style={[styles.btnText, { color: T.text }]}>Voir toute la file ({items.length})</Text>
        <Feather name="chevron-right" size={16} color={T.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  item: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: Spacing.sm,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: Font.medium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  time: {
    fontFamily: Font.regular,
    fontSize: 11,
  },
  title: {
    fontFamily: Font.medium,
    fontSize: 14,
    marginBottom: 2,
  },
  author: {
    fontFamily: Font.regular,
    fontSize: 12,
  },
  btn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  btnText: {
    fontFamily: Font.medium,
    fontSize: 13,
  }
});
