import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';
import { AdminUserListItem } from '../../api/admin.api';

interface UserCardProps {
  user: AdminUserListItem;
  onPress: () => void;
  onToggleStatus?: () => void;
}

export function UserCard({ user, onPress, onToggleStatus }: UserCardProps) {
  const { theme: T, isDark } = useTheme();
  const primaryGreen = Colors.green || '#8BC34A';
  const isSuspended = user.status === 'suspended';

  const getProfileTypeBadge = (type: string) => {
    switch (type) {
      case 'celiac': return { label: 'Patient Cœliaque', color: primaryGreen, bg: Colors.greenLight };
      case 'pro_commerce': return { label: 'Commerçant / Vendeur', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' };
      case 'pro_health': return { label: 'Professionnel Santé', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' };
      default: return { label: 'Utilisateur', color: T.textMuted, bg: 'rgba(46,46,46,0.08)' };
    }
  };

  const badge = getProfileTypeBadge(user.profileType);

  return (
    <TouchableOpacity
      style={[
        styles.userCard,
        {
          backgroundColor: isDark ? '#1C1C1E' : Colors.white,
          borderColor: isSuspended ? '#EF444460' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }
      ]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.userAvatar, { backgroundColor: isSuspended ? '#EF4444' : primaryGreen }]}>
          <Text style={styles.avatarText}>{user.fullName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.userName, { color: T.text }]}>{user.fullName}</Text>
            {isSuspended && (
              <View style={styles.suspendedPill}>
                <Text style={styles.suspendedText}>Suspendu</Text>
              </View>
            )}
          </View>
          <Text style={[styles.userEmail, { color: T.textMuted }]}>{user.email}</Text>
        </View>

        {/* Quick Action Button on Card */}
        {onToggleStatus && (
          <TouchableOpacity
            style={[
              styles.quickActionBtn,
              { backgroundColor: isSuspended ? '#10B98118' : 'rgba(239,68,68,0.1)' }
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onToggleStatus();
            }}
          >
            <Feather
              name={isSuspended ? 'check-circle' : 'user-x'}
              size={14}
              color={isSuspended ? '#10B981' : '#EF4444'}
            />
            <Text
              style={[
                styles.quickActionBtnText,
                { color: isSuspended ? '#10B981' : '#EF4444' }
              ]}
            >
              {isSuspended ? 'Réactiver' : 'Suspendre'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
        <Text style={[styles.joinedText, { color: T.textMuted }]}>
          Inscrit le: {new Date(user.joinedDate).toLocaleDateString('fr-FR')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  userCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontFamily: Font.bold,
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  userName: {
    fontFamily: Font.bold,
    fontSize: 15,
  },
  userEmail: {
    fontFamily: Font.regular,
    fontSize: 13,
    marginTop: 2,
  },
  suspendedPill: {
    backgroundColor: '#EF444420',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  suspendedText: {
    color: '#EF4444',
    fontFamily: Font.bold,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    gap: 4,
  },
  quickActionBtnText: {
    fontFamily: Font.bold,
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: Spacing.sm,
    marginTop: 4,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.md,
  },
  typeBadgeText: {
    fontFamily: Font.medium,
    fontSize: 11,
  },
  joinedText: {
    fontFamily: Font.regular,
    fontSize: 11,
  },
});
