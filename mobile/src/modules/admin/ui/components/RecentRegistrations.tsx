import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';

import { formatDateUserFriendly } from '../../../../shared/utils/date.utils';

interface RecentRegistrationsProps {
  users: Array<{
    _id: string;
    fullName: string;
    profileType: string;
    location?: { city?: string } | string | null;
    createdAt: string;
    avatar?: string;
  }>;
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const getProfileLabel = (type: string) => {
  switch (type) {
    case 'pro_commerce': return 'Vendeur';
    case 'celiac': return 'Patient';
    case 'pro_health': return 'Professionnel';
    case 'admin': return 'Admin';
    default: return type;
  }
};

const getProfileColor = (type: string) => {
  switch (type) {
    case 'pro_commerce': return '#3B82F6';
    case 'celiac': return '#8BC34A';
    case 'pro_health': return '#F59E0B';
    default: return '#8B5CF6';
  }
};

const getLocationString = (location?: { city?: string } | string | null): string => {
  if (!location) return '';
  if (typeof location === 'string') return location;
  return location?.city || '';
};

const getRelativeTime = (isoDate: string): string => {
  try {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return new Date(isoDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

export function RecentRegistrations({ users }: RecentRegistrationsProps) {
  const { theme: T, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
      {users.map((user, index) => {
        const color = getProfileColor(user.profileType);
        const city = getLocationString(user.location);
        return (
          <View
            key={user._id}
            style={[
              styles.item,
              { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
              index === users.length - 1 && { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: color + '20' }]}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.initials, { color }]}>{getInitials(user.fullName || 'User')}</Text>
              )}
            </View>
            <View style={styles.content}>
              <Text style={[styles.name, { color: T.text }]} numberOfLines={1}>{user.fullName}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.badge, { backgroundColor: color + '18' }]}>
                  <Text style={[styles.badgeText, { color }]}>{getProfileLabel(user.profileType)}</Text>
                </View>
                {city ? <Text style={[styles.location, { color: T.textMuted }]} numberOfLines={1}>• {city}</Text> : null}
              </View>
            </View>
            <Text style={[styles.time, { color: T.textMuted }]}>{formatDateUserFriendly(user.createdAt)}</Text>
          </View>
        );
      })}
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
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontFamily: Font.bold,
    fontSize: 14,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  name: {
    fontFamily: Font.medium,
    fontSize: 14,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontFamily: Font.medium,
    fontSize: 11,
  },
  location: {
    fontFamily: Font.regular,
    fontSize: 12,
    flexShrink: 1,
  },
  time: {
    fontFamily: Font.regular,
    fontSize: 11,
    textAlign: 'right',
    minWidth: 60,
  },
});
