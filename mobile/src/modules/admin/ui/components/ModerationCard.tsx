import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';
import { ModerationItem } from '../../api/admin.api';
import { formatDateUserFriendly } from '../../../../shared/utils/date.utils';
import { useLanguage } from '../../../../shared/context/language.context';

interface ModerationCardProps {
  item: ModerationItem;
  onApprove: () => void;
  onReject: () => void;
}

export function ModerationCard({ item, onApprove, onReject }: ModerationCardProps) {
  const { theme: T, isDark } = useTheme();
  const { t } = useLanguage();
  const primaryGreen = Colors.green || '#8BC34A';

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: T.text }]}>{item.title}</Text>
          <Text style={[styles.cardSub, { color: T.textMuted }]}>{t('mod.submitted_by', 'Auteur / Vendeur :')} {item.authorOrSeller}</Text>
        </View>
        {item.price && <Text style={[styles.priceTag, { color: primaryGreen }]}>{item.price}</Text>}
      </View>

      {item.allergens && item.allergens.length > 0 && (
        <View style={styles.tagRow}>
          {item.allergens.map((alg: string, idx: number) => (
            <View key={idx} style={[styles.tagChip, { backgroundColor: Colors.greenLight }]}>
              <Text style={[styles.tagText, { color: primaryGreen }]}>{alg}</Text>
            </View>
          ))}
        </View>
      )}

      {item.eventDate && (
        <View style={styles.metaRow}>
          <Feather name="calendar" size={14} color="#3B82F6" />
          <Text style={[styles.metaText, { color: T.text }]}>{item.eventDate}</Text>
          {item.location && (
            <>
              <Feather name="map-pin" size={14} color={Colors.primaryRed} style={{ marginLeft: 10 }} />
              <Text style={[styles.metaText, { color: T.text }]}>{item.location}</Text>
            </>
          )}
        </View>
      )}

      <Text style={[styles.cardDate, { color: T.textMuted }]}>{t('mod.submitted_date', 'Soumis :')} {formatDateUserFriendly(item.date)}</Text>

      <View style={styles.cardActions}>
        <TouchableOpacity style={[styles.btnAction, { backgroundColor: Colors.errorLight }]} onPress={onReject}>
          <Feather name="x" size={16} color={Colors.error} />
          <Text style={[styles.btnActionText, { color: Colors.error }]}>{t('mod.reject', 'Refuser')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btnAction, { backgroundColor: Colors.greenLight }]} onPress={onApprove}>
          <Feather name="check" size={16} color={primaryGreen} />
          <Text style={[styles.btnActionText, { color: primaryGreen }]}>{t('mod.approve', 'Valider & Notifier')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  cardInfo: { flex: 1, marginRight: Spacing.sm },
  cardTitle: { fontFamily: Font.bold, fontSize: 16, marginBottom: 4 },
  cardSub: { fontFamily: Font.regular, fontSize: 13 },
  priceTag: { fontFamily: Font.bold, fontSize: 16 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  tagChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  tagText: { fontFamily: Font.medium, fontSize: 11 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  metaText: { fontFamily: Font.regular, fontSize: 13, marginLeft: 6 },
  cardDate: { fontFamily: Font.regular, fontSize: 12, marginBottom: Spacing.md },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md },
  btnAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.md, gap: 6 },
  btnActionText: { fontFamily: Font.medium, fontSize: 13 },
});
