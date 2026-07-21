import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';
import { ModerationItem } from '../../api/admin.api';

interface ActionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionType: 'approve' | 'reject';
  selectedItem: ModerationItem | null;
  rejectReason: string;
  setRejectReason: (reason: string) => void;
}

export function ActionModal({ visible, onClose, onConfirm, actionType, selectedItem, rejectReason, setRejectReason }: ActionModalProps) {
  const { theme: T, isDark } = useTheme();
  const primaryGreen = Colors.green || '#8BC34A';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : Colors.white }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>
              {actionType === 'approve' ? 'Confirmation de Validation' : 'Motif de Refus'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={T.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalDesc, { color: T.textMuted }]}>
            {actionType === 'approve'
              ? `Voulez-vous publier "${selectedItem?.title || 'cet élément'}" ? L'utilisateur sera notifié par In-App et Email.`
              : `Veuillez spécifier le motif du refus pour "${selectedItem?.title || 'cet élément'}".`}
          </Text>

          {actionType === 'reject' && (
            <TextInput
              style={[styles.reasonInput, { color: T.text, backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(46,46,46,0.2)' }]}
              placeholder="Ex: Contenu inapproprié, manque de détails..."
              placeholderTextColor={T.textMuted}
              multiline
              numberOfLines={3}
              value={rejectReason}
              onChangeText={setRejectReason}
            />
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.btnModal, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)' }]} onPress={onClose}>
              <Text style={[styles.btnModalText, { color: T.text }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnModal, { backgroundColor: actionType === 'approve' ? primaryGreen : Colors.error }]} onPress={onConfirm}>
              <Text style={[styles.btnModalText, { color: Colors.white }]}>
                {actionType === 'approve' ? 'Confirmer' : 'Envoyer le refus'}
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
  modalTitle: { fontFamily: Font.bold, fontSize: 18 },
  modalDesc: { fontFamily: Font.regular, fontSize: 14, marginBottom: Spacing.md, lineHeight: 20 },
  reasonInput: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, fontFamily: Font.regular, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: Spacing.md },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.md },
  btnModal: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.md },
  btnModalText: { fontFamily: Font.medium, fontSize: 14 },
});
