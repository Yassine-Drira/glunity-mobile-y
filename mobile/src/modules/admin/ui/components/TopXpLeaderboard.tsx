import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../shared/context/theme.context';
import { Colors, Font, Radius, Spacing } from '../../../../shared/utils/theme';

interface TopXpLeaderboardProps {
  users: Array<{
    _id: string;
    fullName: string;
    points: number;
    level?: number;
    avatar?: string;
  }>;
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export function TopXpLeaderboard({ users }: TopXpLeaderboardProps) {
  const { theme: T, isDark } = useTheme();
  
  const accent3 = '#8B5CF6';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : Colors.white, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
      {users.map((user, index) => (
        <View key={user._id} style={[styles.item, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }, index === users.length - 1 && { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>
          
          <Text style={[styles.rank, { color: index < 3 ? accent3 : T.textMuted }]}>#{index + 1}</Text>
          
          <View style={[styles.avatar, { backgroundColor: accent3 + '20' }]}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
            ) : (
              <Text style={[styles.initials, { color: accent3 }]}>{getInitials(user.fullName || 'User')}</Text>
            )}
          </View>
          
          <View style={styles.content}>
            <Text style={[styles.name, { color: T.text }]} numberOfLines={1}>{user.fullName}</Text>
            <View style={styles.xpRow}>
              <Feather name="star" size={10} color={accent3} style={{ marginRight: 4 }} />
              <Text style={[styles.points, { color: accent3 }]}>{user.points} XP</Text>
            </View>
          </View>
          
          <View style={[styles.levelBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Text style={[styles.levelText, { color: T.text }]}>Lvl {user.level || 1}</Text>
          </View>
        </View>
      ))}
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
  rank: {
    fontFamily: Font.bold,
    fontSize: 16,
    width: 24,
    marginRight: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 12,
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
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  points: {
    fontFamily: Font.semibold,
    fontSize: 11,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  levelText: {
    fontFamily: Font.semibold,
    fontSize: 11,
  }
});
