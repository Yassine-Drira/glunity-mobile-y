import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, Modal, Pressable, Animated, PanResponder, Dimensions, TouchableOpacity, Image, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../../../../shared/context/socket.context';

export interface Reactor {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  profileType?: string;
  emoji: string;
}

interface ReactorsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  messageId: string | null;
  reactionCounts: Record<string, number> | null;
  theme: any;
  isDark: boolean;
  BlurView: any;
  t: (key: string) => string;
  isRTL: boolean;
  onPressUser?: (userId: string) => void;
}

export function ReactorsBottomSheet({
  visible,
  onClose,
  messageId,
  reactionCounts,
  theme: T,
  isDark,
  BlurView,
  t,
  isRTL,
  onPressUser,
}: ReactorsBottomSheetProps) {
  const { socket } = useSocket();
  const SHEET_HEIGHT = Dimensions.get('window').height * 0.55;
  const sheetAnim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const pan = useRef(new Animated.Value(0)).current;
  const overlayFallback = 'rgba(0, 0, 0, 0.45)';

  const [reactors, setReactors] = useState<Reactor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('All');

  useEffect(() => {
    if (visible && messageId && socket) {
      setLoading(true);
      socket.emit('reaction:get_reactors', { messageId }, (res: { ok: boolean; reactors?: Reactor[]; error?: string }) => {
        setLoading(false);
        if (res && res.ok && res.reactors) {
          setReactors(res.reactors);
        } else {
          setReactors([]);
        }
      });
    } else {
      setReactors([]);
      setSelectedEmoji('All');
    }
  }, [visible, messageId, socket]);

  useEffect(() => {
    if (visible) {
      pan.setValue(0);
      Animated.timing(sheetAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      onClose();
    });
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) pan.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120) {
        handleClose();
      } else {
        Animated.timing(pan, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      }
    }
  })).current;

  // Extract all unique emojis from the message reactions list
  const emojiTabs = useMemo(() => {
    if (!reactionCounts) return ['All'];
    return ['All', ...Object.keys(reactionCounts)];
  }, [reactionCounts]);

  const filteredReactors = useMemo(() => {
    if (selectedEmoji === 'All') return reactors;
    return reactors.filter(r => r.emoji === selectedEmoji);
  }, [reactors, selectedEmoji]);

  const getProfileTypeStyle = (type?: string) => {
    switch (type) {
      case 'celiac':
        return { bg: isDark ? 'rgba(231,76,60,0.1)' : '#FADBD8', text: isDark ? '#E74C3C' : '#C0392B', label: t('Celiac') };
      case 'gluten_sensitive':
        return { bg: isDark ? 'rgba(230,126,34,0.1)' : '#FDEBD0', text: isDark ? '#E67E22' : '#D35400', label: t('Gluten Sensitive') };
      case 'allergy':
        return { bg: isDark ? 'rgba(26,188,156,0.1)' : '#E8F8F5', text: isDark ? '#1ABC9C' : '#16A085', label: t('Allergy') };
      case 'pro_commerce':
        return { bg: isDark ? 'rgba(46,204,113,0.1)' : '#D4EFDF', text: isDark ? '#2ECC71' : '#27AE60', label: t('Pro') };
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      {BlurView ? (
        <Pressable onPress={handleClose} style={styles.overlay}>
          <BlurView intensity={30} tint={isDark ? 'dark' : 'light'} style={styles.overlay} />
        </Pressable>
      ) : (
        <Pressable onPress={handleClose} style={[styles.overlay, { backgroundColor: overlayFallback }]} />
      )}

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.sheetContainer,
          {
            height: SHEET_HEIGHT,
            backgroundColor: T.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            transform: [{ translateY: Animated.add(sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [SHEET_HEIGHT, 0] }), pan) }]
          }
        ]}
      >
        {/* Grabber handle */}
        <View style={styles.grabberContainer}>
          <View style={[styles.grabber, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : '#DFDFDF' }]} />
        </View>

        {/* Title */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: T.text }]}>{t('Reactions')}</Text>
        </View>

        {/* Emoji Tabs row */}
        <View style={[styles.tabsWrapper, { borderBottomColor: T.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ScrollViewHorizontalHorizontal
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          >
            {emojiTabs.map((emoji) => {
              const count = emoji === 'All' ? reactors.length : (reactionCounts?.[emoji] || 0);
              const isActive = selectedEmoji === emoji;
              return (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => setSelectedEmoji(emoji)}
                  style={[
                    styles.tabButton,
                    {
                      backgroundColor: isActive ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') : 'transparent',
                      borderColor: isActive ? T.green || '#8BC34A' : T.border,
                    }
                  ]}
                >
                  <Text style={[styles.tabEmojiText, { fontSize: emoji === 'All' ? 13 : 15, color: T.text }]}>
                    {emoji === 'All' ? t('All') : emoji}
                  </Text>
                  <Text style={[styles.tabCountText, { color: isActive ? T.text : T.textMuted }]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollViewHorizontalHorizontal>
        </View>

        {/* Reactors list content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={T.green || '#8BC34A'} />
          </View>
        ) : (
          <FlatList
            data={filteredReactors}
            keyExtractor={(item, index) => `${item.userId}-${item.emoji}-${index}`}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={36} color={T.textMuted} style={{ marginBottom: 8 }} />
                <Text style={{ color: T.textMuted }}>{t('No reactions yet')}</Text>
              </View>
            }
            renderItem={({ item }) => {
              const badge = getProfileTypeStyle(item.profileType);
              return (
                <TouchableOpacity
                  activeOpacity={onPressUser ? 0.75 : 1}
                  onPress={() => {
                    if (onPressUser) {
                      handleClose();
                      onPressUser(item.userId);
                    }
                  }}
                  style={[styles.reactorCard, { borderBottomColor: T.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                  {/* User Avatar */}
                  <Image
                    source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName)}&background=8BC34A&color=fff` }}
                    style={styles.avatar}
                  />

                  {/* Name + Badge */}
                  <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.reactorName, { color: T.text }]} numberOfLines={1}>
                      {item.fullName}
                    </Text>
                    {badge && (
                      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.badgeText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Emoji Badge on the right */}
                  <View style={[styles.emojiBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F5F5F5' }]}>
                    <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

// Minimal horizontal scroll alias to satisfy native rendering
function ScrollViewHorizontalHorizontal({ children, contentContainerStyle, ...props }: any) {
  const { ScrollView } = require('react-native');
  return (
    <ScrollView {...props} contentContainerStyle={contentContainerStyle}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 20,
  },
  grabberContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Poppins_700Bold',
  },
  tabsWrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    marginBottom: 10,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 4,
  },
  tabEmojiText: {
    fontWeight: '700',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  reactorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  reactorName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_600Medium',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emojiBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
