import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';
import { useLanguage, Language } from '../../../../shared/context/language.context';

interface AdminSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  setDark: (val: boolean) => void;
  logout: () => void;
  user?: any;
}

export function AdminSettingsModal({
  visible,
  onClose,
  isDark,
  setDark,
  logout,
  user,
}: AdminSettingsModalProps) {
  const { theme: T } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const primaryGreen = Colors.green || '#8BC34A';

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.menuCard,
            {
              backgroundColor: isDark ? '#1C1C1E' : Colors.white,
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Menu Header */}
          <View style={styles.cardHeader}>
            <View style={styles.userRow}>
              <View style={[styles.avatar, { backgroundColor: primaryGreen }]}>
                <MaterialCommunityIcons name="shield-crown" size={18} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: T.text }]} numberOfLines={1}>
                  {user?.fullName || 'Super Administrateur'}
                </Text>
                <Text style={[styles.userRole, { color: primaryGreen }]}>
                  {user?.email || 'admin@glu10.com'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={16} color={T.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Setting 1: Language Selection */}
          <View style={styles.settingItem}>
            <View style={styles.settingMeta}>
              <Ionicons name="globe-outline" size={18} color={primaryGreen} />
              <Text style={[styles.settingLabel, { color: T.text }]}>Langue / Language</Text>
            </View>
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  language === 'fr' && { backgroundColor: primaryGreen },
                ]}
                onPress={() => setLanguage('fr')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: language === 'fr' ? '#FFF' : T.textMuted },
                  ]}
                >
                  FR
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  language === 'en' && { backgroundColor: primaryGreen },
                ]}
                onPress={() => setLanguage('en')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: language === 'en' ? '#FFF' : T.textMuted },
                  ]}
                >
                  EN
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Setting 2: Theme Selection */}
          <View style={styles.settingItem}>
            <View style={styles.settingMeta}>
              <Feather name={isDark ? 'moon' : 'sun'} size={18} color="#F59E0B" />
              <Text style={[styles.settingLabel, { color: T.text }]}>Apparence / Theme</Text>
            </View>
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  !isDark && { backgroundColor: '#F59E0B' },
                ]}
                onPress={() => setDark(false)}
              >
                <Text style={[styles.segmentText, { color: !isDark ? '#FFF' : T.textMuted }]}>
                  Clair
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  isDark && { backgroundColor: '#F59E0B' },
                ]}
                onPress={() => setDark(true)}
              >
                <Text style={[styles.segmentText, { color: isDark ? '#FFF' : T.textMuted }]}>
                  Sombre
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Logout Action */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => {
              onClose();
              logout();
            }}
          >
            <Feather name="log-out" size={16} color={Colors.primaryRed} />
            <Text style={styles.logoutText}>Déconnexion Administrateur</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 65,
    paddingRight: Spacing.md,
  },
  menuCard: {
    width: 280,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontFamily: Font.bold,
    fontSize: 13,
  },
  userRole: {
    fontFamily: Font.medium,
    fontSize: 11,
  },
  closeBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  settingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingLabel: {
    fontFamily: Font.medium,
    fontSize: 12,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(128,128,128,0.12)',
    borderRadius: Radius.sm,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  segmentText: {
    fontFamily: Font.bold,
    fontSize: 10,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(229,57,53,0.1)',
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  logoutText: {
    color: Colors.primaryRed,
    fontFamily: Font.bold,
    fontSize: 12,
  },
});
