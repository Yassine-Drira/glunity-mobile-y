import React, { useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import OnlineDot from '../../../../shared/components/OnlineDot';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ActiveNowSectionProps {
  users: any[];
  currentUserId: string;
  isOnline: (userId: string) => boolean;
  getLastSeen: (userId: string) => string | null;
  onUserPress: (user: any) => void;
  onUserLongPress: (user: any) => void;
  loading: boolean;
  theme: any;
  isDark: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const AVATAR_SIZE = 60;
const CARD_WIDTH = 76;

/** Deterministic color from string (for initials fallback) */
function hashColor(str: string): string {
  const colors = [
    '#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6',
    '#8B5CF6', '#EF4444', '#14B8A6', '#F97316', '#06B6D4',
    '#D946EF', '#84CC16', '#E11D48', '#0EA5E9', '#A855F7',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/** Get user initials (max 2 chars) */
function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

// ─── Shimmer Placeholder ─────────────────────────────────────────────────────
const ShimmerCircle = React.memo(({ delay, isDark }: { delay: number; isDark: boolean }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={shimmerStyles.card}>
      <Animated.View
        style={[
          shimmerStyles.circle,
          { backgroundColor: isDark ? '#2C2C2E' : '#E5E7EB' },
          animStyle,
        ]}
      />
      <View
        style={[
          shimmerStyles.textBar,
          { backgroundColor: isDark ? '#2C2C2E' : '#E5E7EB' },
        ]}
      />
    </View>
  );
});

const shimmerStyles = StyleSheet.create({
  card: {
    alignItems: 'center',
    width: CARD_WIDTH,
    marginRight: 4,
  },
  circle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  textBar: {
    width: 44,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
});

// ─── Avatar Card ──────────────────────────────────────────────────────────────
const AvatarCard = React.memo(({
  item,
  online,
  theme,
  isDark,
  onPress,
  onLongPress,
}: {
  item: any;
  online: boolean;
  theme: any;
  isDark: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) => {
  const userId = String(item._id || item.id);
  const name = item.fullName || item.name || item.displayName || 'User';
  const avatarUrl = item.avatarUrl || item.avatar;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={avatarStyles.card}>
      <Animated.View>
        <View
          style={{ alignItems: 'center' }}
        >
          <View
            style={[avatarStyles.pressable]}
            // @ts-ignore – RN Pressable compatible
            onTouchEnd={onPress}
            onLongPress={onLongPress}
          >
            <View style={avatarStyles.avatarContainer}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={avatarStyles.avatar}
                />
              ) : (
                <View style={[avatarStyles.avatar, avatarStyles.initialsCircle, { backgroundColor: hashColor(name) }]}>
                  <Text style={avatarStyles.initialsText}>{getInitials(name)}</Text>
                </View>
              )}
              <OnlineDot
                isOnline={online}
                showOffline={!online}
                pulse={online}
                size={14}
                borderColor={isDark ? '#1C1C1E' : '#FFFFFF'}
              />
            </View>
          </View>
          <Text
            style={[avatarStyles.name, { color: theme.text }]}
            numberOfLines={1}
          >
            {name.split(' ')[0]}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}, (prev, next) => {
  return (
    (prev.item._id || prev.item.id) === (next.item._id || next.item.id) &&
    prev.online === next.online &&
    prev.isDark === next.isDark
  );
});

const avatarStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    alignItems: 'center',
    marginRight: 4,
  },
  pressable: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  initialsCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  name: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    width: CARD_WIDTH - 8,
  },
});

// ─── Main Component ──────────────────────────────────────────────────────────
function ActiveNowSection({
  users,
  currentUserId,
  isOnline,
  getLastSeen,
  onUserPress,
  onUserLongPress,
  loading,
  theme,
  isDark,
}: ActiveNowSectionProps) {
  // Compute sorted active users: online first → away → recently offline
  const sortedUsers = useMemo(() => {
    if (!users || users.length === 0) return [];

    // Exclude self
    const others = users.filter((u: any) => {
      const uid = String(u._id || u.id || '');
      return uid && uid !== currentUserId;
    });

    // Sort: online first, then by lastSeen descending
    return others.sort((a: any, b: any) => {
      const aId = String(a._id || a.id);
      const bId = String(b._id || b.id);
      const aOnline = isOnline(aId);
      const bOnline = isOnline(bId);

      // Online users first
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;

      // Within same status, sort by last activity
      const aLastSeen = getLastSeen(aId);
      const bLastSeen = getLastSeen(bId);
      const aTime = aLastSeen ? new Date(aLastSeen).getTime() : 0;
      const bTime = bLastSeen ? new Date(bLastSeen).getTime() : 0;
      return bTime - aTime;
    });
  }, [users, currentUserId, isOnline, getLastSeen]);

  const keyExtractor = useCallback((item: any) => String(item._id || item.id), []);

  const renderItem = useCallback(({ item }: { item: any }) => {
    const uid = String(item._id || item.id);
    const online = isOnline(uid);
    return (
      <AvatarCard
        item={item}
        online={online}
        theme={theme}
        isDark={isDark}
        onPress={() => onUserPress(item)}
        onLongPress={() => onUserLongPress(item)}
      />
    );
  }, [isOnline, theme, isDark, onUserPress, onUserLongPress]);

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={sectionStyles.container}>
        <View style={sectionStyles.headerRow}>
          <Text style={[sectionStyles.title, { color: theme.text }]}>Active Now</Text>
        </View>
        <View style={sectionStyles.shimmerRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ShimmerCircle key={`shimmer-${i}`} delay={i * 120} isDark={isDark} />
          ))}
        </View>
      </View>
    );
  }

  // ─── Empty State ───────────────────────────────────────────────────────────
  if (sortedUsers.length === 0) {
    return (
      <View style={sectionStyles.container}>
        <View style={sectionStyles.headerRow}>
          <Text style={[sectionStyles.title, { color: theme.text }]}>Active Now</Text>
        </View>
        <View style={sectionStyles.emptyContainer}>
          <Ionicons name="moon-outline" size={28} color={theme.textMuted} />
          <Text style={[sectionStyles.emptyTitle, { color: theme.textMuted }]}>
            No friends online
          </Text>
          <Text style={[sectionStyles.emptySubtitle, { color: theme.textMuted }]}>
            Invite your friends to chat
          </Text>
        </View>
      </View>
    );
  }

  // Count online users for the badge
  const onlineCount = sortedUsers.filter((u: any) => isOnline(String(u._id || u.id))).length;

  // ─── Active List ───────────────────────────────────────────────────────────
  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[sectionStyles.title, { color: theme.text }]}>Active Now</Text>
          {onlineCount > 0 && (
            <View style={sectionStyles.countBadge}>
              <Text style={sectionStyles.countText}>{onlineCount}</Text>
            </View>
          )}
        </View>
      </View>
      <FlatList
        data={sortedUsers}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={sectionStyles.listContent}
        decelerationRate="fast"
        removeClippedSubviews={Platform.OS !== 'web'}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
      />
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  countBadge: {
    backgroundColor: '#22C55E',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 14,
  },
  shimmerRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },
});

export default React.memo(ActiveNowSection);
