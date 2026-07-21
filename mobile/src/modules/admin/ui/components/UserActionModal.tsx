import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';
import { AdminUserListItem } from '../../api/admin.api';

interface UserActionModalProps {
  visible: boolean;
  onClose: () => void;
  user: AdminUserListItem | null;
  onToggleStatus: () => void;
  onResetPassword: () => void;
}

export function UserActionModal({ visible, onClose, user, onToggleStatus, onResetPassword }: UserActionModalProps) {
  const { theme: T, isDark } = useTheme();
  const primaryGreen = Colors.green || '#8BC34A';

  if (!user) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : Colors.white }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Détails & Actions</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={T.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={[styles.userBigAvatar, { backgroundColor: primaryGreen }]}>
              <Text style={styles.bigAvatarText}>{user.fullName.charAt(0).toUpperCase()}</Text>
            </View>

            <Text style={[styles.modalUserName, { color: T.text }]}>{user.fullName}</Text>
            <Text style={[styles.modalUserEmail, { color: T.textMuted }]}>{user.email}</Text>

            <View style={styles.modalMetaRow}>
              <Text style={[styles.metaLabel, { color: T.text }]}>Ville: <Text style={{ fontWeight: 'normal' }}>{user.city}</Text></Text>
              <Text style={[styles.metaLabel, { color: T.text }]}>Inscrit: <Text style={{ fontWeight: 'normal' }}>{new Date(user.joinedDate).toLocaleDateString('fr-FR')}</Text></Text>
            </View>

            <View style={styles.actionButtonsCol}>
              <TouchableOpacity
                style={[
                  styles.btnModalAction,
                  { backgroundColor: user.status === 'active' ? '#EF444415' : '#10B981' }
                ]}
                onPress={onToggleStatus}
              >
                <Feather
                  name={user.status === 'active' ? 'user-x' : 'check-circle'}
                  size={18}
                  color={user.status === 'active' ? '#EF4444' : '#FFFFFF'}
                />
                <Text
                  style={[
                    styles.btnModalActionText,
                    { color: user.status === 'active' ? '#EF4444' : '#FFFFFF' }
                  ]}
                >
                  {user.status === 'active' ? 'Suspendre le Compte' : 'Réactiver le Compte'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnModalAction, { backgroundColor: isDark ? '#2C2C2E' : 'rgba(46,46,46,0.06)' }]}
                onPress={onResetPassword}
              >
                <Feather name="key" size={17} color={T.text} />
                <Text style={[styles.btnModalActionText, { color: T.text }]}>Envoyer Lien Réinitialisation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { width: '100%', borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontFamily: Font.bold, fontSize: 18 },
  modalBody: { alignItems: 'center' },
  userBigAvatar: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  bigAvatarText: { color: Colors.white, fontFamily: Font.bold, fontSize: 28 },
  modalUserName: { fontFamily: Font.bold, fontSize: 20, marginBottom: 4 },
  modalUserEmail: { fontFamily: Font.regular, fontSize: 14, marginBottom: Spacing.lg },
  modalMetaRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: Spacing.lg, paddingHorizontal: 20 },
  metaLabel: { fontFamily: Font.bold, fontSize: 13 },
  actionButtonsCol: { width: '100%', gap: Spacing.md },
  btnModalAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: Radius.md, gap: 10 },
  btnModalActionText: { fontFamily: Font.bold, fontSize: 15 },
});
