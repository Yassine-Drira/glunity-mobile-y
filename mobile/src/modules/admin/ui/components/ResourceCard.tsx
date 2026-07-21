import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';
import { PatientResourceItem } from '../../api/admin.api';

import { useLanguage } from '../../../../shared/context/language.context';

interface ResourceCardProps {
  resource: PatientResourceItem;
  onEdit: () => void;
  onDelete: () => void;
  onPress?: () => void;
}

export function ResourceCard({ resource, onEdit, onDelete, onPress }: ResourceCardProps) {
  const { theme: T, isDark } = useTheme();
  const { t } = useLanguage();
  const primaryGreen = Colors.green || '#8BC34A';

  const typeConfig = {
    article: { label: t('resources.filter_article', 'Article'), color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', icon: 'book-outline' as const },
    document: { label: t('resources.filter_document', 'Document'), color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', icon: 'document-text-outline' as const },
    video: { label: t('resources.filter_video', 'Vidéo'), color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', icon: 'videocam-outline' as const },
  };

  const currentType = typeConfig[resource.type || 'article'] || typeConfig.article;
  const isPublished = resource.status === 'Published' || resource.isPublished === true;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1C1C1E' : Colors.white,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
      ]}
      onPress={onPress || onEdit}
    >
      {/* Header Badges */}
      <View style={styles.cardHeader}>
        <View style={styles.badgesLeft}>
          <View style={[styles.typeBadge, { backgroundColor: currentType.bg }]}>
            <Ionicons name={currentType.icon} size={12} color={currentType.color} />
            <Text style={[styles.typeText, { color: currentType.color }]}>{currentType.label}</Text>
          </View>
          <View style={styles.catBadge}>
            <Text style={[styles.catText, { color: primaryGreen }]}>{resource.category}</Text>
          </View>
        </View>

        <View style={styles.statusBox}>
          <View style={[styles.statusDot, { backgroundColor: isPublished ? primaryGreen : '#D97706' }]} />
          <Text style={[styles.statusText, { color: isPublished ? primaryGreen : '#D97706' }]}>
            {isPublished ? t('resources.published', 'Publié') : t('resources.draft', 'Brouillon')}
          </Text>
        </View>
      </View>

      {/* Title & Excerpt */}
      <Text style={[styles.cardTitle, { color: T.text }]} numberOfLines={2}>{resource.title}</Text>
      {resource.excerpt ? (
        <Text style={[styles.cardExcerpt, { color: T.textMuted }]} numberOfLines={2}>
          {resource.excerpt}
        </Text>
      ) : null}

      <Text style={[styles.cardAuthor, { color: T.textMuted }]}>{t('resources.by', 'Par :')} {resource.author}</Text>

      {/* Analytics & Actions Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.analyticsRow}>
          {/* Views Counter */}
          <View style={styles.statPill}>
            <Feather name="eye" size={13} color="#3B82F6" />
            <Text style={[styles.statText, { color: T.text }]}>{resource.viewsCount || 0} {t('resources.views', 'vues')}</Text>
          </View>

          {/* Clicks Counter */}
          <View style={styles.statPill}>
            <Feather name="mouse-pointer" size={12} color="#10B981" />
            <Text style={[styles.statText, { color: T.text }]}>{resource.clicksCount || 0} {t('resources.clicks', 'clics')}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.btnIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]} onPress={onEdit}>
            <Feather name="edit-2" size={14} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnIcon, { backgroundColor: Colors.errorLight }]} onPress={onDelete}>
            <Feather name="trash-2" size={14} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badgesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    gap: 4,
  },
  typeText: {
    fontFamily: Font.bold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  catBadge: {
    backgroundColor: 'rgba(139, 195, 74, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  catText: {
    fontFamily: Font.bold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontFamily: Font.medium,
    fontSize: 11,
  },
  cardTitle: {
    fontFamily: Font.bold,
    fontSize: 15,
    marginBottom: 4,
    lineHeight: 21,
  },
  cardExcerpt: {
    fontFamily: Font.regular,
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 17,
  },
  cardAuthor: {
    fontFamily: Font.regular,
    fontSize: 12,
    marginBottom: Spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: Spacing.sm,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontFamily: Font.medium,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
