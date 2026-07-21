import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';
import { SellerVerificationDossier } from '../../api/admin.api';

interface DossierActionModalProps {
  modalType: 'details' | 'action' | null;
  onClose: () => void;
  seller: SellerVerificationDossier | null;
  actionKind: 'approve' | 'revision' | 'reject';
  remarks: string;
  setRemarks: (text: string) => void;
  onConfirmAction: () => void;
}

export function DossierActionModal({ modalType, onClose, seller, actionKind, remarks, setRemarks, onConfirmAction }: DossierActionModalProps) {
  const { theme: T, isDark } = useTheme();
  const primaryGreen = Colors.green || '#8BC34A';

  if (!seller || !modalType) return null;

  if (modalType === 'details') {
    return (
      <Modal visible={true} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : Colors.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: T.text }]}>Dossier Vendeur Complet</Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={20} color={T.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={[styles.detailGroupTitle, { color: primaryGreen }]}>Informations Boutique</Text>
              <Text style={[styles.detailLabel, { color: T.text }]}>Nom: <Text style={{ fontWeight: 'normal' }}>{seller.storeName}</Text></Text>
              <Text style={[styles.detailLabel, { color: T.text }]}>Gérant: <Text style={{ fontWeight: 'normal' }}>{seller.ownerName}</Text></Text>
              <Text style={[styles.detailLabel, { color: T.text }]}>Email: <Text style={{ fontWeight: 'normal' }}>{seller.email}</Text></Text>
              <Text style={[styles.detailLabel, { color: T.text }]}>Téléphone: <Text style={{ fontWeight: 'normal' }}>{seller.phone}</Text></Text>
              <Text style={[styles.detailLabel, { color: T.text }]}>SIRET: <Text style={{ fontWeight: 'normal' }}>{seller.siret}</Text></Text>
              <Text style={[styles.detailLabel, { color: T.text }]}>Adresse: <Text style={{ fontWeight: 'normal' }}>{seller.address}</Text></Text>

              <Text style={[styles.detailGroupTitle, { color: primaryGreen, marginTop: 14 }]}>Pièces Justificatives</Text>
              {seller.documents.map((doc: string, idx: number) => (
                <View key={idx} style={styles.docBox}>
                  <Feather name="file" size={15} color="#3B82F6" />
                  <Text style={styles.docName}>{doc}</Text>
                  <Text style={styles.docBadge}>PDF Aperçu</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.btnCloseModal, { backgroundColor: primaryGreen }]} onPress={onClose}>
              <Text style={{ color: '#FFF', fontFamily: Font.bold }}>Fermer l'inspection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={modalType === 'action'} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : Colors.white }]}>
          <Text style={[styles.modalTitle, { color: T.text }]}>
            {actionKind === 'approve' && 'Attribution du Badge Vendeur'}
            {actionKind === 'revision' && 'Demande de Révision du Dossier'}
            {actionKind === 'reject' && 'Refus de la Candidature Vendeur'}
          </Text>

          <Text style={[styles.modalDesc, { color: T.textMuted }]}>
            {actionKind === 'approve'
              ? `Vous êtes sur le point d'accorder le statut "Vendeur Vérifié" à ${seller.storeName}.`
              : `Veuillez spécifier un message pour ${seller.storeName}.`}
          </Text>

          {actionKind !== 'approve' && (
            <TextInput
              style={[styles.reasonInput, { color: T.text, backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(46,46,46,0.2)' }]}
              placeholder="Rédigez votre message ici..."
              placeholderTextColor={T.textMuted}
              multiline
              numberOfLines={4}
              value={remarks}
              onChangeText={setRemarks}
            />
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.btnModal, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)' }]} onPress={onClose}>
              <Text style={[styles.btnModalText, { color: T.text }]}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnModal, { backgroundColor: actionKind === 'approve' ? primaryGreen : actionKind === 'revision' ? '#D97706' : Colors.error }]}
              onPress={onConfirmAction}
            >
              <Text style={[styles.btnModalText, { color: Colors.white }]}>
                {actionKind === 'approve' ? 'Confirmer le Badge' : 'Envoyer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.md },
  modalContent: { width: '100%', borderRadius: Radius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontFamily: Font.bold, fontSize: 18, marginBottom: 8 },
  modalDesc: { fontFamily: Font.regular, fontSize: 14, marginBottom: Spacing.md, lineHeight: 20 },
  detailGroupTitle: { fontFamily: Font.bold, fontSize: 14, marginBottom: 8, textTransform: 'uppercase' },
  detailLabel: { fontFamily: Font.bold, fontSize: 13, marginBottom: 6 },
  docBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.08)', padding: 12, borderRadius: Radius.md, marginBottom: 10 },
  docName: { flex: 1, fontFamily: Font.medium, fontSize: 13, marginLeft: 10, color: '#3B82F6' },
  docBadge: { fontFamily: Font.bold, fontSize: 10, color: '#3B82F6', textTransform: 'uppercase' },
  btnCloseModal: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: Radius.md, marginTop: Spacing.lg },
  reasonInput: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, fontFamily: Font.regular, fontSize: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: Spacing.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.md },
  btnModal: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.md },
  btnModalText: { fontFamily: Font.medium, fontSize: 14 },
});
