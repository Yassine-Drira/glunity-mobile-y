import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';
import { SellerVerificationDossier } from '../../api/admin.api';
import { formatDateUserFriendly } from '../../../../shared/utils/date.utils';

interface SellerDossierCardProps {
  seller: SellerVerificationDossier;
  onOpenDetails: () => void;
  onApprove: () => void;
  onRevision: () => void;
  onReject: () => void;
}

export function SellerDossierCard({ seller, onOpenDetails, onApprove, onRevision, onReject }: SellerDossierCardProps) {
  const { theme: T, isDark } = useTheme();
  const primaryGreen = Colors.green || '#8BC34A';

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <Feather name="shopping-bag" size={20} color="#3B82F6" />
        </View>
        <View style={styles.titleCol}>
          <Text style={[styles.storeName, { color: T.text }]}>{seller.storeName}</Text>
          <Text style={[styles.ownerName, { color: T.textMuted }]}>Par {seller.ownerName}</Text>
        </View>
        <View style={styles.dateBadge}>
          <Text style={[styles.dateText, { color: T.textMuted }]}>{formatDateUserFriendly(seller.submittedDate)}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Feather name="file-text" size={13} color={T.textMuted} />
        <Text style={[styles.infoText, { color: T.text }]}>SIRET: {seller.siret}</Text>
      </View>

      <View style={[styles.certifBox, { backgroundColor: Colors.greenLight }]}>
        <MaterialCommunityIcons name="certificate" size={16} color={primaryGreen} />
        <Text style={[styles.certifText, { color: primaryGreen }]}>{seller.certifications}</Text>
      </View>

      <TouchableOpacity
        style={[styles.btnDetails, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(46,46,46,0.2)' }]}
        onPress={onOpenDetails}
      >
        <Feather name="eye" size={14} color={T.text} />
        <Text style={[styles.btnDetailsText, { color: T.text }]}>Inspecter Dossier & Documents</Text>
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.btnAction, { backgroundColor: Colors.errorLight }]} onPress={onReject}>
          <Feather name="x" size={15} color={Colors.error} />
          <Text style={[styles.btnText, { color: Colors.error }]}>Refuser</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btnAction, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]} onPress={onRevision}>
          <Feather name="edit-3" size={15} color="#D97706" />
          <Text style={[styles.btnText, { color: '#D97706' }]}>Révision</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btnAction, { backgroundColor: Colors.greenLight, flex: 1.2 }]} onPress={onApprove}>
          <Feather name="check-circle" size={15} color={primaryGreen} />
          <Text style={[styles.btnText, { color: primaryGreen }]}>Valider Badge</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center' },
  titleCol: { flex: 1, marginLeft: 12 },
  storeName: { fontFamily: Font.bold, fontSize: 16, marginBottom: 2 },
  ownerName: { fontFamily: Font.regular, fontSize: 13 },
  dateBadge: { backgroundColor: 'rgba(46,46,46,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  dateText: { fontFamily: Font.medium, fontSize: 11 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { fontFamily: Font.medium, fontSize: 13, marginLeft: 6 },
  certifBox: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: Radius.md, marginBottom: Spacing.md },
  certifText: { fontFamily: Font.bold, fontSize: 12, marginLeft: 8 },
  btnDetails: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.md, gap: 8 },
  btnDetailsText: { fontFamily: Font.bold, fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 10 },
  btnAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: Radius.md, gap: 6 },
  btnText: { fontFamily: Font.bold, fontSize: 13 },
});
