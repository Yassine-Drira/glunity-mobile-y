import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Pressable, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, useWindowDimensions, Alert, Linking, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../auth/state/auth.context';
import { useTheme } from '../../../../shared/context/theme.context';
import { useLanguage } from '../../../../shared/context/language.context';
import { useSocket } from '../../../../shared/context/socket.context';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCommunityChat } from '../../hooks/useCommunityChat';
import { getChannelDisplay as getDisplayForChannel } from '../../utils/channelDisplay';
import { usePresence } from '../../../../shared/hooks/usePresence';
import OnlineDot from '../../../../shared/components/OnlineDot';
import AnimatedReanimated, { FadeInDown, SlideInRight, useReducedMotion } from 'react-native-reanimated';
import http from '../../../../core/network/http.client';
import { Image as ExpoImage } from 'expo-image';

// Decoupled sub-components
import { OptionsActionMenu } from '../components/OptionsActionMenu';
import { MembersBottomSheet } from '../components/MembersBottomSheet';
import { EditGroupModal } from '../components/EditGroupModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ReactionsOverlayModal } from '../components/ReactionsOverlayModal';
import { UserProfileBottomSheet } from '../components/UserProfileBottomSheet';
import { ReactorsBottomSheet } from '../components/ReactorsBottomSheet';

// Optional native BlurView
let BlurView: any = null;
try { BlurView = require('expo-blur').BlurView; } catch (e) { BlurView = null; }

const ReelMessagePreview = ({
  thumb,
  isDeleted,
  isMe,
  ownerName,
  ownerAvatar,
  caption,
  duration,
  onPress,
  onLongPress,
  windowWidth,
  theme,
  styles,
}: {
  thumb: string | null;
  isDeleted: boolean;
  isMe: boolean;
  ownerName?: string | null;
  ownerAvatar?: string | null;
  caption?: string | null;
  duration?: number | null;
  onPress: () => void;
  onLongPress: () => void;
  windowWidth: number;
  theme: any;
  styles: any;
}) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const maxWidth = Math.min(windowWidth * 0.7, 220);
  const desiredHeight = Math.round(maxWidth * 16 / 9);
  const cardHeight = desiredHeight > 280 ? 280 : Math.max(desiredHeight, 220);
  const cardWidth = desiredHeight > 280 ? Math.round(280 * 9 / 16) : maxWidth;

  const animateScale = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      friction: 9,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const displayName = ownerName || 'Anonymous';

  const formatSecs = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      onPressIn={() => animateScale(0.97)}
      onPressOut={() => animateScale(1)}
      style={{ width: cardWidth, alignSelf: isMe ? 'flex-end' : 'flex-start' }}
    >
      <Animated.View style={[styles.reelCard, { width: cardWidth, backgroundColor: theme.surfaceAlt, transform: [{ scale }] }]}> 
        <View style={{ width: cardWidth, height: cardHeight, overflow: 'hidden' }}>
          {isDeleted ? (
            <View style={[styles.reelFallback, { backgroundColor: theme.surfaceAlt, padding: 16, flex: 1 }]}> 
              <Ionicons name="videocam-off-outline" size={36} color={theme.textMuted || '#999999'} style={{ marginBottom: 8, alignSelf: 'center' }} />
              <Text style={{ color: theme.textMuted || '#999999', fontSize: 13, textAlign: 'center', fontWeight: '500' }}>
                This reel is no longer available.
              </Text>
            </View>
          ) : (
            <>
              {thumb ? (
                <ExpoImage
                  source={{ uri: thumb }}
                  style={styles.reelImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.reelFallback, { backgroundColor: '#333333' }]}> 
                  <Ionicons name="film-outline" size={32} color="#FFFFFF" />
                </View>
              )}

              {/* Dark Overlay for readability */}
              <View style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.25)'
              }} />

              {/* Owner Info */}
              <View style={[styles.reelTopOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.35)', borderRadius: 12, top: 8, left: 8, right: 8 }]}>
                {ownerAvatar ? (
                  <ExpoImage source={{ uri: ownerAvatar }} style={styles.reelAvatar} cachePolicy="memory-disk" />
                ) : (
                  <View style={[styles.reelAvatar, { backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' }]}> 
                    <Text style={styles.reelAvatarInitial}>{String(displayName).charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text numberOfLines={1} style={styles.reelUsername}>{displayName}</Text>
              </View>

              {/* Play icon overlay */}
              <View style={styles.reelCenterIcon}>
                <View style={[styles.reelPlayButton, { width: 48, height: 48, borderRadius: 24 }]}>
                  <Ionicons name="play" size={22} color="#fff" />
                </View>
              </View>

              {/* Bottom Badge Info */}
              <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: 8,
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}>
                {!!caption && (
                  <Text numberOfLines={2} style={{ color: '#FFFFFF', fontSize: 11, marginBottom: 4, fontWeight: '500' }}>
                    {caption}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Ionicons name="film" size={10} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }}>Reel</Text>
                  </View>
                  {!!duration && (
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>
                      {formatSecs(duration)}
                    </Text>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function CommunityMessaging({ initialChannel, initialChannelId, navigation }: any) {
  const { user } = useAuth();
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const { socket, isConnected } = useSocket();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showSearchHeader, setShowSearchHeader] = useState(false);
  const [messageSearchText, setMessageSearchText] = useState('');

  // Extract all states and operations from our state controller
  const chat = useCommunityChat(initialChannel, initialChannelId, navigation);

  const filteredMessages = useMemo(() => {
    if (!messageSearchText.trim()) return chat.messages;
    const q = messageSearchText.toLowerCase();
    return chat.messages.filter(m => m.content && m.content.toLowerCase().includes(q));
  }, [chat.messages, messageSearchText]);

  const [highlightedMsgId, setHighlightedMsgId] = React.useState<string | null>(null);
  const [showNotificationModal, setShowNotificationModal] = React.useState(false);
  const [showOwnerMenu, setShowOwnerMenu] = React.useState(false);
  const [showConfirmMuteDM, setShowConfirmMuteDM] = React.useState(false);
  const [muting, setMuting] = React.useState(false);
  const [currentPinIndex, setCurrentPinIndex] = React.useState(0);
  const touchStartX = React.useRef(0);

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent.pageX;
  };

  const handleTouchEnd = (e: any) => {
    const touchEndX = e.nativeEvent.pageX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        if (currentPinIndex < (chat.channel?.pinnedMessages?.length || 0) - 1) {
          setCurrentPinIndex(currentPinIndex + 1);
        }
      } else {
        if (currentPinIndex > 0) {
          setCurrentPinIndex(currentPinIndex - 1);
        }
      }
    }
  };
  const { isOnline, getLastSeen, fetchStatuses } = usePresence();

  const [reactorsSheetVisible, setReactorsSheetVisible] = useState(false);
  const [reactorsMsgId, setReactorsMsgId] = useState<string | null>(null);
  const [reactorsCounts, setReactorsCounts] = useState<Record<string, number> | null>(null);

  // Pulsing recording indicator animation
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (chat.isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [chat.isRecording]);

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ── Derive the DM partner's ID for presence lookup ───────────────────────
  const dmPartnerId = useMemo(() => {
    const ch = chat.channel;
    if (!ch || !user) return null;
    
    const parts = ch.participants || ch.members || ch.userIds || ch.participantIds || [];
    const isDM = ch.name?.startsWith('DM-') || ch.type === 'direct' || ch.type === 'dm' || String(ch.type).toUpperCase() === 'DM' || (Array.isArray(parts) && parts.length === 2);
    if (!isDM) return null;

    let otherId: any = null;
    if (parts && Array.isArray(parts)) {
      const ids = parts.map((p: any) => (typeof p === 'string' ? p : (p._id || p.id || p.userId || p._userId)));
      otherId = ids.find((id: any) => id && String(id) !== String(user._id) && String(id) !== '[object Object]');
    }

    if (!otherId && ch.name && typeof ch.name === 'string') {
      const matches = ch.name.match(/[0-9a-fA-F]{6,}/g);
      if (matches && matches.length) {
        const m = matches.find((mId: string) => String(mId) !== String(user._id));
        if (m) otherId = m;
      }
    }

    return otherId ? String(otherId) : null;
  }, [chat.channel, user]);

  const isDMChannel = React.useMemo(() => {
    const ch = chat.channel;
    if (!ch) return false;
    const parts = ch.participants || ch.members || ch.userIds || ch.participantIds || [];
    return Boolean(
      ch.name?.startsWith('DM-') ||
      ch.type === 'direct' ||
      ch.type === 'dm' ||
      String(ch.type).toUpperCase() === 'DM' ||
      (Array.isArray(parts) && parts.length === 2)
    );
  }, [chat.channel]);

  const isChannel = React.useMemo(() => {
    return chat.channel?.type === 'channel';
  }, [chat.channel]);

  const [partnerUser, setPartnerUser] = React.useState<any>(null);

  React.useEffect(() => {
    if (!dmPartnerId) {
      setPartnerUser(null);
      return;
    }
    let active = true;
    async function loadPartner() {
      try {
        const res = await http.get(`/users/${dmPartnerId}`);
        const userData = res.data?.data || res.data;
        if (active && userData) {
          setPartnerUser(userData);
        }
      } catch (err) {
        console.warn('Failed to load DM partner user profile', err);
      }
    }
    loadPartner();
    return () => { active = false; };
  }, [dmPartnerId]);

  const partnerOnline = dmPartnerId ? isOnline(dmPartnerId) : false;
  const [presenceFetched, setPresenceFetched] = React.useState(false);

  const formatLastSeen = useMemo(() => {
    return (pId: string): string => {
      if (!pId) return t('Offline');
      if (!presenceFetched) return '···'; // still loading, don't flash Offline
      const lastSeen = getLastSeen(pId);
      if (!lastSeen) return t('Offline');
      const date = new Date(lastSeen);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return t('Just now');
      if (diffMins < 60) return t('Last seen {{count}}m ago').replace('{{count}}', String(diffMins));
      if (diffHours < 24) return t('Last seen {{count}}h ago').replace('{{count}}', String(diffHours));
      return t('Last seen on {{date}}').replace('{{date}}', date.toLocaleDateString());
    };
  }, [getLastSeen, t, presenceFetched]);

  // Initial fetch — marks presenceFetched=true once it resolves
  React.useEffect(() => {
    if (!dmPartnerId) return;
    setPresenceFetched(false);
    fetchStatuses([dmPartnerId]);
    // Give it 1.5s for the socket round-trip, then mark as fetched
    const t1 = setTimeout(() => setPresenceFetched(true), 1500);
    return () => clearTimeout(t1);
  }, [dmPartnerId, fetchStatuses]);

  // Poll every 15s while this screen is open to keep status fresh
  React.useEffect(() => {
    if (!dmPartnerId) return;
    const id = setInterval(() => {
      fetchStatuses([dmPartnerId]);
    }, 15000);
    return () => clearInterval(id);
  }, [dmPartnerId, fetchStatuses]);

  // Re-fetch partner status whenever the socket reconnects (e.g. after backgrounding the app)
  React.useEffect(() => {
    if (!socket || !dmPartnerId) return;
    const handleReconnect = () => {
      fetchStatuses([dmPartnerId]);
    };
    socket.on('connect', handleReconnect);
    return () => {
      socket.off('connect', handleReconnect);
    };
  }, [socket, dmPartnerId, fetchStatuses]);

  const seenIds = React.useRef<Set<string>>(new Set());
  const reducedMotion = useReducedMotion();

  if (seenIds.current.size === 0 && chat.messages && chat.messages.length > 0) {
    chat.messages.forEach((m: any) => {
      seenIds.current.add(String(m.id || m._id));
    });
  }

  const overlayFallback = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.35)';
  const modalBg = isDark ? 'rgba(10,10,10,0.6)' : 'rgba(255,255,255,0.88)';

  const pinnedMessages = useMemo(() => {
    return chat.channel?.pinnedMessages || [];
  }, [chat.channel?.pinnedMessages]);

  const selectedMsg = useMemo(() => {
    return chat.messages.find((m) => String(m.id || m._id) === String(chat.reactionMsgId));
  }, [chat.messages, chat.reactionMsgId]);

  const formatDuration = (sec?: number) => {
    if (sec === undefined || isNaN(sec)) return '0:00';
    const roundedSec = Math.round(sec);
    const mins = Math.floor(roundedSec / 60);
    const secs = roundedSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getChatDisplay = (ch: any) => {
    const d = getDisplayForChannel(ch, user);
    return { name: d.name || t('Chat'), avatar: d.avatar || null };
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: T.bg,
      ...(Platform.OS === 'web' ? { position: 'relative', overflow: 'hidden' } as any : {}),
    },
    // ── Header ──────────────────────────────────────────────────────────────
    header: {
      height: 64,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: T.divider,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      justifyContent: 'space-between',
      backgroundColor: T.surface,
    },
    headerLeft: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1, minWidth: 0 },
    headerRight: { flexDirection: 'row', alignItems: 'center', paddingLeft: 4 },
    backBtn: { padding: 6, marginRight: 2 },
    // DM avatar: slightly larger, circular with ring
    dmAvatar: {
      width: 40, height: 40, borderRadius: 20,
      borderWidth: 2, borderColor: isDark ? '#2ECC7130' : '#2ECC7140',
    },
    // Group avatar: rounded square, icon-based
    groupAvatar: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: isDark ? '#1E4A3A' : '#D5F5E3',
      alignItems: 'center', justifyContent: 'center',
    },
    presenceDot: {
      position: 'absolute', right: 0, bottom: 0,
      width: 12, height: 12, borderRadius: 6,
      borderWidth: 2, borderColor: T.surface,
    },
    headerMeta: { flex: 1, marginLeft: 10, minWidth: 0 },
    headerName: {
      fontSize: 15, fontWeight: '700',
      color: T.text,
      fontFamily: 'Poppins_700Bold',
    },
    headerSub: { fontSize: 11.5, color: T.textMuted, marginTop: 1 },
    headerSubOnline: { fontSize: 11.5, color: '#27AE60', marginTop: 1, fontWeight: '600' },
    // ── Bubbles ─────────────────────────────────────────────────────────────
    avatar: { width: 34, height: 34, borderRadius: 17, marginRight: 6 },
    title: { fontSize: 16, fontWeight: '700', color: T.text },
    subtitle: { fontSize: 12, color: T.textMuted },
    listContent: { padding: 16, paddingBottom: 24 },
    row: { marginVertical: 3, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-end' },
    bubbleLeft: {
      backgroundColor: T.surfaceAlt,
      paddingVertical: 10, paddingHorizontal: 14,
      borderRadius: 20, borderBottomLeftRadius: 4,
      maxWidth: '100%', minWidth: 60,
      flexShrink: 1,
      alignSelf: 'flex-start', marginHorizontal: 6,
      overflow: 'hidden',
      ...(Platform.OS === 'web' ? { wordBreak: 'break-word', overflowWrap: 'break-word' } as any : {}),
    },
    bubbleRight: {
      backgroundColor: isDark ? '#1E7A4D' : '#2ECC71',
      paddingVertical: 10, paddingHorizontal: 14,
      borderRadius: 20, borderBottomRightRadius: 4,
      maxWidth: '100%', minWidth: 60,
      flexShrink: 1,
      alignSelf: 'flex-end', marginHorizontal: 6,
      overflow: 'hidden', alignItems: 'flex-start',
      ...(Platform.OS === 'web' ? { wordBreak: 'break-word', overflowWrap: 'break-word' } as any : {}),
    },
    msgText: {
      color: T.text, fontSize: 14.5, lineHeight: 20,
      flexShrink: 1,
      ...(Platform.OS === 'web' ? { wordBreak: 'break-word', overflowWrap: 'break-word' } as any : {}),
    },
    reelCard: {
      borderRadius: 22,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    reelImage: {
      width: '100%',
      height: '100%',
    },
    reelFallback: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    reelPlaceholder: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.08)',
    },
    reelUnavailableText: {
      fontSize: 12,
      textAlign: 'center',
      maxWidth: '100%',
      marginTop: 12,
    },
    reelTopOverlay: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'transparent',
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    reelAvatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.85)',
    },
    reelAvatarInitial: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
    },
    reelUsername: {
      color: '#fff',
      marginLeft: 8,
      fontSize: 13,
      fontWeight: '700',
      maxWidth: 140,
    },
    reelCenterIcon: {
      position: 'absolute',
      top: '45%',
      left: 0,
      right: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    reelPlayButton: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: 'rgba(0,0,0,0.30)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    reelBottomBadge: {
      position: 'absolute',
      left: 10,
      bottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.28)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 16,
    },
    reelBadgeText: {
      color: '#fff',
      marginLeft: 6,
      fontSize: 12,
      fontWeight: '700',
    },
    timeText: { fontSize: 10, color: T.textMuted, marginTop: 2 },
    messageBlock: { flexDirection: 'column', maxWidth: '75%', flexShrink: 1 },
    inputBar: {
      padding: 12, backgroundColor: T.surface,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.divider,
    },
    inputRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
    textInput: {
      flex: 1, marginHorizontal: 8,
      backgroundColor: T.surfaceAlt,
      paddingVertical: Platform.OS === 'ios' ? 12 : 8, paddingHorizontal: 14,
      borderRadius: 24, color: T.text,
    },
    sendBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: isDark ? '#1E7A4D' : '#2ECC71',
      justifyContent: 'center', alignItems: 'center',
    },
  }), [T, isDark, isRTL, windowWidth]);

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString || Date.now());
    const now = new Date();

    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return timeStr;
    } else {
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `${dateStr}, ${timeStr}`;
    }
  };

  const renderDateSeparator = (currentMsg: any, prevMsg: any) => {
    if (!currentMsg) return null;
    const currentDate = new Date(currentMsg.createdAt || currentMsg.created_at);
    if (isNaN(currentDate.getTime())) return null;

    if (prevMsg) {
      const prevDate = new Date(prevMsg.createdAt || prevMsg.created_at);
      if (!isNaN(prevDate.getTime())) {
        if (
          currentDate.getDate() === prevDate.getDate() &&
          currentDate.getMonth() === prevDate.getMonth() &&
          currentDate.getFullYear() === prevDate.getFullYear()
        ) {
          return null;
        }
      }
    }

    const now = new Date();
    const isToday =
      currentDate.getDate() === now.getDate() &&
      currentDate.getMonth() === now.getMonth() &&
      currentDate.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      currentDate.getDate() === yesterday.getDate() &&
      currentDate.getMonth() === yesterday.getMonth() &&
      currentDate.getFullYear() === yesterday.getFullYear();

    let dateLabel = '';
    if (isToday) {
      dateLabel = t('Today') || 'Today';
    } else if (isYesterday) {
      dateLabel = t('Yesterday') || 'Yesterday';
    } else {
      dateLabel = currentDate.toLocaleDateString([], {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: currentDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }

    return (
      <View style={{ alignItems: 'center', marginVertical: 12 }}>
        <View style={{ backgroundColor: isDark ? '#2C3E50' : '#EAECEE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: T.textMuted }}>{dateLabel}</Text>
        </View>
      </View>
    );
  };

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const senderId = typeof item.senderId === 'object' && item.senderId ? (item.senderId._id || item.senderId.id) : item.senderId;
    const isMe = String(senderId) === String((user as any)?._id || (user as any)?.id);
    const isTemp = String(item.id || '').startsWith('temp-');
    const avatarUrl = item.senderAvatarUrl || (typeof item.senderId === 'object' && item.senderId ? item.senderId.avatar?.url : null);

    const itemId = String(item.id || item._id);
    const shouldAnimate = !seenIds.current.has(itemId);
    if (shouldAnimate) {
      seenIds.current.add(itemId);
    }

    const delay = index * 40;
    const enteringAnimation = !shouldAnimate || reducedMotion
      ? undefined
      : (isMe
        ? SlideInRight.duration(250).delay(delay)
        : FadeInDown.duration(250).delay(delay));

    const firstAtt = item.attachments && item.attachments.length > 0 ? item.attachments[0] : null;
    const isAudio = firstAtt?.type === 'audio';
    const isImage = firstAtt?.type === 'image';
    const isVideo = firstAtt?.type === 'video';
    const isMedia = isImage || isVideo;
    const isDeleted = Boolean(item.deletedAt);
    const isReel = item.type === 'reel' || !!item.reelRef;

    // Grouping / bubble tail calculations
    const currentMsgDate = new Date(item.createdAt || item.created_at);

    const nextMsg = index < chat.messages.length - 1 ? chat.messages[index + 1] : null;
    const nextSenderId = nextMsg ? (typeof nextMsg.senderId === 'object' && nextMsg.senderId ? (nextMsg.senderId._id || nextMsg.senderId.id) : nextMsg.senderId) : null;
    const isNextFromSameSender = nextMsg && String(nextSenderId) === String(senderId);
    const nextMsgDate = nextMsg ? new Date(nextMsg.createdAt || nextMsg.created_at) : null;
    const isNextCloseInTime = nextMsgDate && !isNaN(nextMsgDate.getTime()) && !isNaN(currentMsgDate.getTime()) && (nextMsgDate.getTime() - currentMsgDate.getTime() < 60000);
    const shouldGroup = isNextFromSameSender && isNextCloseInTime;

    const prevMsg = index > 0 ? chat.messages[index - 1] : null;
    const prevSenderId = prevMsg ? (typeof prevMsg.senderId === 'object' && prevMsg.senderId ? (prevMsg.senderId._id || prevMsg.senderId.id) : prevMsg.senderId) : null;
    const isPrevFromSameSender = prevMsg && String(prevSenderId) === String(senderId);
    const prevMsgDate = prevMsg ? new Date(prevMsg.createdAt || prevMsg.created_at) : null;
    const isPrevCloseInTime = prevMsgDate && !isNaN(prevMsgDate.getTime()) && !isNaN(currentMsgDate.getTime()) && (currentMsgDate.getTime() - prevMsgDate.getTime() < 60000);
    const isContinuation = isPrevFromSameSender && isPrevCloseInTime;

    const bubbleStyle = isMe
      ? [
          (item.id || item._id) === highlightedMsgId
            ? [styles.bubbleRight, { backgroundColor: isDark ? '#196F3D' : '#27AE60', transform: [{ scale: 1.02 }] }]
            : styles.bubbleRight,
          { borderBottomRightRadius: shouldGroup ? 18 : 4 },
          (isMedia || isReel) && { paddingVertical: 0, paddingHorizontal: 0 },
          isAudio && { minWidth: 208 },
          isDeleted && {
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
            borderStyle: 'dashed' as const,
            paddingVertical: 8,
            paddingHorizontal: 12,
          }
        ]
      : [
          (item.id || item._id) === highlightedMsgId
            ? [styles.bubbleLeft, { backgroundColor: isDark ? '#2E4053' : '#D5F5E3', transform: [{ scale: 1.02 }] }]
            : styles.bubbleLeft,
          { borderBottomLeftRadius: shouldGroup ? 18 : 4 },
          (isMedia || isReel) && { paddingVertical: 0, paddingHorizontal: 0 },
          isAudio && { minWidth: 208 },
          isDeleted && {
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
            borderStyle: 'dashed' as const,
            paddingVertical: 8,
            paddingHorizontal: 12,
          }
        ];

    // Reaction pills — hidden on deleted messages
    const reactionPills = !item.deletedAt && item.reactionCounts && Object.keys(item.reactionCounts).length > 0 ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
        {Object.entries(item.reactionCounts).map(([emoji, count]: any) => (
          <TouchableOpacity
            key={emoji}
            onPress={() => chat.handleToggleReaction(item.id || item._id, emoji)}
            onLongPress={() => {
              setReactorsMsgId(item.id || item._id);
              setReactorsCounts(item.reactionCounts);
              setReactorsSheetVisible(true);
            }}
            style={{ backgroundColor: 'rgba(0,0,0,0.07)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, marginRight: 5, marginBottom: 3, flexDirection: 'row', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13 }}>{emoji}</Text>
            <Text style={{ fontSize: 11, marginLeft: 3, color: isMe ? 'rgba(255,255,255,0.8)' : T.textMuted, fontWeight: '600' }}>{count}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ) : null;

    // Reply preview pill
    const replyPreview = item.replyTo && item.replyTo.messageId ? (
      <View style={{
        borderLeftWidth: 3,
        borderLeftColor: isMe ? 'rgba(255,255,255,0.6)' : (T.green || '#2ECC71'),
        paddingLeft: 8,
        marginBottom: 6,
        backgroundColor: isMe ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.04)',
        borderRadius: 4,
        paddingVertical: 4,
      }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: isMe ? 'rgba(255,255,255,0.8)' : (T.green || '#2ECC71') }}>
          {item.replyTo.senderName || 'User'}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 12, color: isMe ? 'rgba(255,255,255,0.65)' : T.textMuted }}>
          {item.replyTo.preview || '...'}
        </Text>
      </View>
    ) : null;
    const renderBubbleContent = () => {
      if (item.deletedAt) {
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="trash-outline" size={14} color={T.textMuted} style={{ opacity: 0.65 }} />
            <Text style={{ fontStyle: 'italic', color: T.textMuted, fontSize: 13.5 }}>
              {t('Message deleted')}
            </Text>
          </View>
        );
      }

      // Loading indicator for optimistic messages
      if (item.status === 'sending') {
        if (isImage || isVideo) {
          return (
            <View style={{
              width: Math.min(windowWidth * 0.68, 250),
              height: Math.min(windowWidth * 0.51, 188),
              backgroundColor: T.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ActivityIndicator size="small" color={isMe ? '#fff' : T.textMuted} />
            </View>
          );
        }
        return (
          <View style={{ paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minWidth: 100 }}>
            <ActivityIndicator size="small" color={isMe ? '#fff' : T.textMuted} />
          </View>
        );
      }
      if (isAudio) {
        const isPlaying = chat.playingId === (item.id || item._id);
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 180 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isMe ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color={isMe ? '#fff' : T.text} />
            </View>
            <View style={{ width: 60, marginLeft: 8, marginRight: 6, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 26 }}>
                {[6, 10, 14, 20, 14, 10, 8, 12].map((h, idx) => {
                  const isPlayed = isPlaying && chat.audioProgress >= (idx / 8);
                  return (
                    <Animated.View key={idx} style={{ width: 3.5, marginHorizontal: 1.5, backgroundColor: isMe ? '#fff' : T.text, height: h - 2, borderRadius: 1.5, opacity: isPlayed ? 1 : 0.4 }} />
                  );
                })}
              </View>
            </View>
            {isPlaying ? (
              <Text style={{ color: isMe ? '#fff' : T.text, fontSize: 11, minWidth: 35, textAlign: 'right' }}>
                {formatDuration(chat.audioProgress * (firstAtt?.duration || item.duration || 0))}
              </Text>
            ) : (
              <Text style={{ color: isMe ? '#fff' : T.text, fontSize: 11 }}>
                {formatDuration(firstAtt?.duration || item.duration)}
              </Text>
            )}
          </View>
        );
      }
      if (isImage) {
        const imgUrl = firstAtt?.thumbnail || firstAtt?.url;
        return (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => { if (firstAtt?.url) Linking.openURL(firstAtt.url).catch(() => { }); }}
            onLongPress={longPressHandler}
            delayLongPress={300}
            style={{ overflow: 'hidden' }}
          >
            <Image
              source={{ uri: imgUrl }}
              style={{
                width: Math.min(windowWidth * 0.68, 250),
                height: Math.min(windowWidth * 0.51, 188),
                backgroundColor: T.surfaceAlt,
              }}
              resizeMode="cover"
            />
            {!!item.content && (
              <View style={{ paddingHorizontal: 12, paddingBottom: 10, paddingTop: 6 }}>
                <Text style={[styles.msgText, { color: isMe ? '#fff' : T.text }]}>{item.content}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      }

      if (isVideo) {
        const thumbUrl = firstAtt?.thumbnail || (() => {
          const videoUrl = firstAtt?.url;
          if (videoUrl && videoUrl.includes('cloudinary.com') && videoUrl.includes('/video/upload/')) {
            let thumb = videoUrl.replace(/\.[a-zA-Z0-9]+$/, '.jpg');
            thumb = thumb.replace('/video/upload/', '/video/upload/c_fill,g_center,h_400,w_400/');
            return thumb;
          }
          return null;
        })();
        return (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => { if (firstAtt?.url) Linking.openURL(firstAtt.url).catch(() => { }); }}
            onLongPress={longPressHandler}
            delayLongPress={300}
            style={{ overflow: 'hidden', position: 'relative' }}
          >
            {thumbUrl ? (
              <Image
                source={{ uri: thumbUrl }}
                style={{
                  width: Math.min(windowWidth * 0.68, 250),
                  height: Math.min(windowWidth * 0.45, 170),
                  backgroundColor: T.surfaceAlt,
                }}
                resizeMode="cover"
              />
            ) : (
              <View style={{
                width: Math.min(windowWidth * 0.68, 250),
                height: Math.min(windowWidth * 0.45, 170),
                backgroundColor: isDark ? '#1a2a1a' : '#e8f5e9',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Ionicons name="videocam" size={32} color={T.green || '#2ECC71'} />
              </View>
            )}
            {/* Play overlay */}
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="play" size={22} color="#fff" />
              </View>
            </View>
            {!!item.content && (
              <View style={{ paddingHorizontal: 12, paddingBottom: 10, paddingTop: 6 }}>
                <Text style={[styles.msgText, { color: isMe ? '#fff' : T.text }]}>{item.content}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      }

      if (isReel) {
        const isDeleted = !!item.reelRef?.isDeleted;
        const rawThumb = isDeleted ? null : (item.reelRef?.thumbnailUrl || item.reelRef?.thumbnail);
        const thumb = rawThumb || (item.reelRef?.videoUrl ? item.reelRef.videoUrl.replace(/\.[a-z0-9]+$/i, '.jpg') : null);

        return (
          <View>
            {replyPreview}
            <ReelMessagePreview
              thumb={thumb}
              isDeleted={isDeleted}
              isMe={isMe}
              ownerName={item.reelRef?.ownerName || item.senderName || 'Anonymous'}
              ownerAvatar={item.reelRef?.ownerAvatar || avatarUrl || null}
              caption={item.reelRef?.title || ''}
              duration={item.reelRef?.duration || 0}
              onPress={() => {
                if (isDeleted) {
                  Alert.alert('Not Available', 'This reel is no longer available.');
                } else {
                  navigation.navigate('ReelsFeed', { reelId: item.reelRef?.reelId });
                }
              }}
              onLongPress={longPressHandler}
              windowWidth={windowWidth}
              theme={T}
              styles={styles}
            />
          </View>
        );
      }

      // Default: text
      return (
        <Text style={[styles.msgText, isMe ? { color: '#fff' } : undefined]}>{item.content}</Text>
      );
    };

    const longPressHandler = () => {
      if (isTemp || item.deletedAt) return;
      chat.setReactionMsgId(item.id || item._id);
    };

    const pressHandler = () => {
      if (isTemp || item.deletedAt) return;
      if (isAudio) {
        chat.playAudio(item);
      } else {
        chat.handlePressMessage(item);
      }
    };

    const showAvatar = !isMe && !dmPartnerId && !shouldGroup;
    const showAvatarPlaceholder = !isMe && !dmPartnerId && shouldGroup;

    return (
      <View>
        {renderDateSeparator(item, prevMsg)}
        <AnimatedReanimated.View
          entering={enteringAnimation}
          style={[styles.row, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}
        >
          {showAvatar && (
            avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: T.surfaceAlt, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: T.divider }]}>
                <Text style={{ color: T.text, fontSize: 13, fontWeight: '700' }}>
                  {String(item.senderName || 'A').charAt(0).toUpperCase()}
                </Text>
              </View>
            )
          )}
          {showAvatarPlaceholder && (
            <View style={styles.avatar} />
          )}

          {/* Optimistic send status indicators */}
          {isMe && item.status === 'failed' && (
            <TouchableOpacity onPress={() => chat.handleRetrySend(item)} style={{ marginRight: 6, alignSelf: 'center', padding: 4 }} accessibilityLabel="Retry sending">
              <Ionicons name="alert-circle" size={20} color="#E74C3C" />
            </TouchableOpacity>
          )}
          {isMe && item.status === 'sending' && (
            <View style={{ marginRight: 6, alignSelf: 'center', padding: 4 }}>
              <ActivityIndicator size="small" color={T.textMuted} />
            </View>
          )}

          <View style={[styles.messageBlock, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
            {/* Only show sender name in GROUP conversations for the first message of a group */}
            {!isMe && !dmPartnerId && !isContinuation && (
              <Text style={{ fontSize: 11, fontWeight: '600', color: T.green || '#2ECC71', marginBottom: 3, marginLeft: 6 }}>
                {item.senderName || 'User'}
              </Text>
            )}

            {isReel ? (
              <View>
                {replyPreview}
                {renderBubbleContent()}
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.92}
                onLongPress={longPressHandler}
                onPress={pressHandler}
                style={bubbleStyle}
              >
                {replyPreview}
                {renderBubbleContent()}
              </TouchableOpacity>
            )}

            {/* If reel, render the message as a separate bubble below the reel preview */}
            {isReel && !!item.content && (
              <View style={{ marginTop: 8 }}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  onLongPress={longPressHandler}
                  onPress={pressHandler}
                  style={isMe ? styles.bubbleRight : styles.bubbleLeft}
                >
                  <Text style={[styles.msgText, isMe ? { color: '#fff' } : { color: T.text }]}>{item.content}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Reaction pills — rendered OUTSIDE the bubble touchable to prevent
                event bubbling from pill taps triggering the bubble's onPress handler */}
            {reactionPills}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, marginHorizontal: 6 }}>
              {!!item.pinned && (
                <Ionicons name="pin" size={11} color={T.green || '#2ECC71'} style={{ marginRight: 4 }} />
              )}
              <Text style={{ fontSize: 10, color: T.textMuted }}>
                {formatMessageTime(item.createdAt || item.created_at)}
              </Text>
              {isMe && !isTemp && !isDeleted && (() => {
                const isRead = (() => {
                  const ch = chat.channel;
                  if (!ch) return false;
                  const parts = ch.participants || ch.members || [];
                  const msgTime = new Date(item.createdAt || item.created_at).getTime();

                  if (isDMChannel) {
                    const partner = parts.find((p: any) => {
                      const pId = p.userId?._id || p.userId || p._id || p.id;
                      return pId && String(pId) !== String(user?._id);
                    });
                    if (!partner || !partner.lastReadAt) return false;
                    return new Date(partner.lastReadAt).getTime() >= msgTime;
                  } else {
                    return parts.some((p: any) => {
                      const pId = p.userId?._id || p.userId || p._id || p.id;
                      return pId && String(pId) !== String(user?._id) && p.lastReadAt && new Date(p.lastReadAt).getTime() >= msgTime;
                    });
                  }
                })();

                if (isRead) {
                  return (
                    <Ionicons name="checkmark-done" size={13} color={T.green || '#2ECC71'} style={{ marginLeft: 3 }} />
                  );
                } else {
                  return (
                    <Ionicons name="checkmark" size={13} color={T.textMuted || '#888'} style={{ marginLeft: 3 }} />
                  );
                }
              })()}
              {!!item.editedAt && !isDeleted && (
                <Text style={{ fontSize: 9, color: T.textMuted, marginLeft: 4, fontStyle: 'italic' }}>{t('edited')}</Text>
              )}
            </View>
          </View>
        </AnimatedReanimated.View>
      </View>
    );
  }, [
    chat.messages, chat.channel, chat.playingId, chat.audioProgress,
    user, T, isDark, isRTL, dmPartnerId, isDMChannel,
    highlightedMsgId, windowWidth, seenIds, reducedMotion,
    chat.handleToggleReaction, chat.setReactionMsgId, chat.playAudio,
    chat.handlePressMessage, chat.handleRetrySend, chat.handleTogglePin,
    setReactorsMsgId, setReactorsCounts, setReactorsSheetVisible,
    t, formatMessageTime, formatDuration, styles,
  ]);

  if (!chat.channel) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.bg }}>
        <ActivityIndicator size="large" color={T.green || '#2ECC71'} />
        <Text style={{ color: T.textMuted, marginTop: 12 }}>{t('Loading channel...')}</Text>
      </View>
    );
  }

  const display = getChatDisplay(chat.channel);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Left: back + avatar + identity */}
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => {
              // Always go to the main messaging list to match expected UX
              try {
                navigation.navigate('MessagingHome');
              } catch (e) {
                if (navigation.canGoBack && navigation.canGoBack()) navigation.goBack();
              }
            }}
            style={styles.backBtn}
          >
            <Ionicons name={isRTL ? 'arrow-forward-outline' : 'arrow-back-outline'} size={22} color={T.text} />
          </TouchableOpacity>

          {showSearchHeader ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                placeholder={t('Search messages') || 'Search messages'}
                placeholderTextColor={T.textMuted}
                value={messageSearchText}
                onChangeText={setMessageSearchText}
                style={{ flex: 1, color: T.text, fontSize: 15, paddingVertical: 4, paddingHorizontal: 12, backgroundColor: T.surfaceAlt, borderRadius: 8, marginRight: 8 }}
                autoFocus
              />
              <TouchableOpacity onPress={() => { setShowSearchHeader(false); setMessageSearchText(''); }}>
                <Ionicons name="close" size={20} color={T.text} style={{ marginRight: 8 }} />
              </TouchableOpacity>
            </View>
          ) : isChannel ? (
            /* ── Channel Header ─────────────────────────────────────────────── */
            <TouchableOpacity
              onPress={() => navigation.navigate('ChannelMembers', { channelId: chat.channel.id || chat.channel._id })}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}
              activeOpacity={0.75}
            >
              <View style={[styles.groupAvatar, { width: 38, height: 38, borderRadius: 10 }]}>
                {display.avatar ? (
                  <Image source={{ uri: display.avatar }} style={{ width: 38, height: 38, borderRadius: 10 }} />
                ) : (
                  <Ionicons name="megaphone-outline" size={18} color={T.green || '#2ECC71'} />
                )}
              </View>
              <View style={styles.headerMeta}>
                <Text style={styles.headerName} numberOfLines={1}>{display.name}</Text>
                <Text style={styles.headerSub}>
                  {chat.channel?.participants?.length || 0} {t('members') || 'members'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : isDMChannel ? (
            /* ── DM Header ──────────────────────────────────────────────────── */
            <TouchableOpacity
              onPress={() => dmPartnerId && chat.openUserProfile(dmPartnerId)}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}
              activeOpacity={0.75}
            >
              {/* Avatar with presence dot */}
              <TouchableOpacity
                onPress={() => dmPartnerId && chat.openUserProfile(dmPartnerId)}
                activeOpacity={0.8}
                style={{ position: 'relative' }}
              >
                {partnerUser?.avatarUrl || partnerUser?.avatar || display.avatar ? (
                  <Image source={{ uri: partnerUser?.avatarUrl || partnerUser?.avatar || display.avatar }} style={styles.dmAvatar} />
                ) : (
                  <View style={[styles.dmAvatar, { backgroundColor: isDark ? '#1E4A3A' : '#D5F5E3', alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: T.green || '#2ECC71' }}>
                      {String(partnerUser?.fullName || partnerUser?.name || display.name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <OnlineDot isOnline={partnerOnline} size={12} />
              </TouchableOpacity>

              {/* Name + status */}
              <View style={styles.headerMeta}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={styles.headerName} numberOfLines={1}>
                    {partnerUser?.fullName || partnerUser?.name || display.name}
                  </Text>
                  <TouchableOpacity
                    onPress={async () => {
                      // If already muted, unmute immediately. If not muted, ask for confirmation.
                      try {
                        if (chat.channel?.myMuted) {
                          setMuting(true);
                          await chat.handleMuteDM();
                        } else {
                          setShowConfirmMuteDM(true);
                        }
                      } finally {
                        setMuting(false);
                      }
                    }}
                    style={{ marginLeft: 8, padding: 4 }}
                  >
                    <Ionicons
                      name={chat.channel?.myMuted ? 'notifications-off' : 'notifications'}
                      size={13}
                      color={chat.channel?.myMuted ? T.textMuted : '#8BC34A'}
                    />
                  </TouchableOpacity>
                </View>
                {chat.typingUser ? (
                  <Text style={styles.headerSubOnline}>{t('typing...')}</Text>
                ) : (
                  <Text style={partnerOnline ? styles.headerSubOnline : styles.headerSub}>
                    {partnerOnline ? t('Online') : formatLastSeen(dmPartnerId || '')}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ) : (
            /* ── Group Header ───────────────────────────────────────────────── */
            <TouchableOpacity
              onPress={() => chat.setMembersSheetVisible(true)}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}
              activeOpacity={0.75}
            >
              {/* Group icon */}
              <View style={styles.groupAvatar}>
                {display.avatar ? (
                  <Image source={{ uri: display.avatar }} style={{ width: 40, height: 40, borderRadius: 12 }} />
                ) : (
                  <Ionicons name="people" size={20} color={T.green || '#2ECC71'} />
                )}
              </View>

              {/* Name + member count */}
              <View style={styles.headerMeta}>
                <Text style={styles.headerName} numberOfLines={1}>{display.name}</Text>
                {chat.typingUser ? (
                  <Text style={styles.headerSubOnline} numberOfLines={1}>
                    {chat.typingUser} {t('typing...')}
                  </Text>
                ) : (
                  <Text style={styles.headerSub}>
                    {(chat.channel?.participants?.length || 0) > 0
                       ? `${chat.channel.participants.length} ${t('members')}`
                       : t('Group')}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Right: actions */}
        <View style={styles.headerRight}>
          {isChannel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={{ padding: 8 }} onPress={() => setShowSearchHeader(prev => !prev)}>
                <Ionicons name="search" size={20} color={T.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 8 }}
                onPress={async () => {
                  try {
                    if (chat.channel?.myMuted) {
                      setMuting(true);
                      await chat.updateNotificationSettings('all');
                    } else {
                      setShowNotificationModal(true);
                    }
                  } finally {
                    setMuting(false);
                  }
                }}
              >
                <Ionicons
                  name={chat.channel?.myMuted ? 'notifications-off' : 'notifications'}
                  size={20}
                  color={chat.channel?.myMuted ? T.textMuted : '#8BC34A'}
                />
              </TouchableOpacity>
              
              {chat.channel?.myRole === 'owner' && (
                <TouchableOpacity style={{ padding: 8 }} onPress={() => setShowOwnerMenu(true)}>
                  <Ionicons name="settings" size={20} color={T.text} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={{ padding: 8 }}
              onPress={() => chat.setMenuVisible(true)}
              accessibilityLabel="Options"
            >
              <Ionicons name="ellipsis-vertical" size={20} color={T.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!isConnected && (
        <AnimatedReanimated.View
          entering={FadeInDown.duration(300)}
          style={{
            backgroundColor: '#D35400',
            paddingVertical: 5,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6
          }}
        >
          <ActivityIndicator size="small" color="#fff" style={{ transform: [{ scale: 0.8 }] }} />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
            {t('Reconnecting...')}
          </Text>
        </AnimatedReanimated.View>
      )}

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && (() => {
        const safeIndex = Math.min(currentPinIndex, pinnedMessages.length - 1);
        const activePin = pinnedMessages[safeIndex];
        if (!activePin) return null;

        return (
          <View
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              borderBottomWidth: 1,
              borderBottomColor: T.divider,
              backgroundColor: isDark ? '#1C2833' : '#F2F4F4',
              paddingVertical: 10,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <TouchableOpacity
              onPress={() => {
                const msgId = activePin.messageId;
                const index = chat.messages.findIndex((m: any) => String(m.id || m._id) === String(msgId));
                if (index >= 0) {
                  try {
                    chat.listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
                    setHighlightedMsgId(msgId);
                    setTimeout(() => setHighlightedMsgId(null), 1500);
                  } catch (e) { }
                } else {
                  Alert.alert(t('Info'), t('Message is older. Scroll up to find it.'));
                }
              }}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="pin" size={16} color={T.green || '#2ECC71'} style={{ marginRight: 10 }} />
              <View style={{ width: 2, height: 26, backgroundColor: T.divider, marginRight: 10 }} />
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: T.green || '#2ECC71' }}>
                    {activePin.senderName || t('User')}
                  </Text>
                  {pinnedMessages.length > 1 && (
                    <Text style={{ fontSize: 10, color: T.textMuted, marginLeft: 8 }}>
                      ({safeIndex + 1} {t('of')} {pinnedMessages.length})
                    </Text>
                  )}
                </View>
                <Text numberOfLines={1} style={{ fontSize: 12.5, color: T.text, marginTop: 1 }}>
                  {activePin.content || (activePin.attachments?.[0]?.type === 'audio' ? t('Voice Message') : t('[Attachment]'))}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {pinnedMessages.length > 1 && (
                <View style={{ flexDirection: 'row', marginRight: 8 }}>
                  <TouchableOpacity
                    disabled={safeIndex === 0}
                    onPress={() => setCurrentPinIndex(safeIndex - 1)}
                    style={{ padding: 4, opacity: safeIndex === 0 ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-back" size={16} color={T.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={safeIndex === pinnedMessages.length - 1}
                    onPress={() => setCurrentPinIndex(safeIndex + 1)}
                    style={{ padding: 4, opacity: safeIndex === pinnedMessages.length - 1 ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-forward" size={16} color={T.text} />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                onPress={() => chat.handleTogglePin(activePin.messageId)}
                style={{ padding: 4 }}
                accessibilityLabel="Unpin message"
              >
                <Ionicons name="close" size={18} color={T.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}

      {/* Notification Settings Modal */}
      <Modal visible={showNotificationModal} transparent animationType="fade" onRequestClose={() => setShowNotificationModal(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setShowNotificationModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Pressable onPress={() => { /* consume tap so outer Pressable doesn't close modal */ }} style={{ backgroundColor: T.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 6, width: '86%', maxWidth: 360 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: T.text, marginBottom: 12, textAlign: 'center' }}>{t('Mute messages') || 'Mute messages'}</Text>
              {[
                { key: 'mute_1h', label: t('For 1 hour') || 'For 1 hour' },
                { key: 'mute_8h', label: t('For 8 hours') || 'For 8 hours' },
                { key: 'mute_24h', label: t('For 24 hours') || 'For 24 hours' },
                { key: 'mute_indefinite', label: t('Until I change it') || 'Until I change it' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={async () => {
                    try {
                      setMuting(true);
                      await chat.updateNotificationSettings(opt.key);
                    } finally {
                      setMuting(false);
                      setShowNotificationModal(false);
                    }
                  }}
                  style={{ paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.divider, alignItems: 'center' }}
                >
                  <Text style={{ color: T.text, textAlign: 'center' }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Owner Controls Modal */}
      <Modal visible={showOwnerMenu} transparent animationType="fade" onRequestClose={() => setShowOwnerMenu(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setShowOwnerMenu(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Pressable onPress={() => { /* consume tap so outer Pressable doesn't close modal */ }} style={{ backgroundColor: T.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, width: '86%', maxWidth: 360 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: T.text, marginBottom: 8, textAlign: 'center' }}>{t('Channel Settings') || 'Channel Settings'}</Text>
              <TouchableOpacity style={{ paddingVertical: 12 }} onPress={() => { setShowOwnerMenu(false); navigation.navigate('ChannelMembers', { channelId: chat.channel.id || chat.channel._id }); }}>
                <Text style={{ color: T.text, textAlign: 'center' }}>{t('Manage Members') || 'Manage Members'}</Text>
              </TouchableOpacity>
              {/* Manage Writers removed — use Manage Members to handle both roles */}
              <TouchableOpacity style={{ paddingVertical: 12 }} onPress={() => { setShowOwnerMenu(false); chat.setEditSheetVisible(true); }}>
                <Text style={{ color: T.text, textAlign: 'center' }}>{t('Edit Channel') || 'Edit Channel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingVertical: 12 }} onPress={() => { setShowOwnerMenu(false); chat.setConfirmDeleteVisible(true); }}>
                <Text style={{ color: '#E74C3C', textAlign: 'center' }}>{t('Delete Channel') || 'Delete Channel'}</Text>
              </TouchableOpacity>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Confirm Mute (DM) Modal */}
      <ConfirmationModal
        visible={showConfirmMuteDM}
        onClose={() => { if (!muting) setShowConfirmMuteDM(false); }}
        title={chat.channel?.myMuted ? t('Unmute Notifications') : t('Mute Notifications')}
        message={chat.channel?.myMuted ? t('Re-enable notifications for this conversation?') : t('You will no longer receive notifications from this conversation.')}
        confirmLabel={chat.channel?.myMuted ? t('Unmute') : t('Mute')}
        cancelLabel={t('Cancel')}
        onConfirm={async () => {
          try {
            setMuting(true);
            await chat.handleMuteDM();
          } finally {
            setMuting(false);
            setShowConfirmMuteDM(false);
          }
        }}
        loading={muting}
        isDestructive={!chat.channel?.myMuted}
        theme={T}
        isDark={isDark}
        BlurView={BlurView}
        t={t}
        modalBg={modalBg}
        overlayFallback={overlayFallback}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 + insets.top : 0}
      >
        {/* Messages List */}
        {chat.loading && chat.messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>
        ) : (
          <FlatList
            ref={chat.listRef}
            data={filteredMessages}
            keyExtractor={(i) => String(i.id || i._id || Math.random())}
            renderItem={renderItem}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: 16 },
              chat.messages.length === 0 && { flexGrow: 1, justifyContent: 'center' }
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            // ── Performance ────────────────────────────────────────────
            windowSize={10}
            maxToRenderPerBatch={10}
            initialNumToRender={20}
            removeClippedSubviews={Platform.OS === 'android'}
            // ── Scroll throttle — fire at most every 100ms ─────────────
            scrollEventThrottle={100}
            onScroll={(event) => {
              const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

              // Track whether user is near the bottom (within 150px)
              const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
              const nearBottom = distanceFromBottom < 150;
              chat.isNearBottomRef.current = nearBottom;

              if (nearBottom !== isNearBottom) {
                setIsNearBottom(nearBottom);
              }

              // If the user reaches the bottom, clear unread count
              if (nearBottom && chat.unreadCount > 0) {
                chat.setUnreadCount(0);
              }

              // Load more when scrolled to the very top
              if (contentOffset.y <= 20 && !chat.loadingMore) {
                chat.loadMoreMessages();
              }
            }}
            ListHeaderComponent={
              chat.loadingMore ? (
                <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={T.green || '#2ECC71'} />
                </View>
              ) : null
            }
            onContentSizeChange={() => { /* no-op — auto-scroll disabled */ }}
            onLayout={() => { /* no-op — auto-scroll disabled */ }}

            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
                <Ionicons name="chatbubbles-outline" size={64} color={T.textMuted} style={{ marginBottom: 12, opacity: 0.5 }} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: T.text, textAlign: 'center' }}>
                  {dmPartnerId
                    ? `${t('Say hi to')} ${display.name} 👋`
                    : t('Start the conversation!')}
                </Text>
                <Text style={{ fontSize: 13, color: T.textMuted, textAlign: 'center', marginTop: 4, paddingHorizontal: 40 }}>
                  {dmPartnerId
                    ? t('Send a message to start direct messaging')
                    : t('No messages in this group yet')}
                </Text>
              </View>
            }
          />
        )}

        {/* Emoji pop animation */}
        {chat.popEmoji ? (
          <Animated.View pointerEvents="none" style={{ position: 'absolute', right: 36, bottom: 80, transform: [{ scale: chat.popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.15] }) }], opacity: chat.popAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 0] }) }}>
            <Text style={{ fontSize: 40 }}>{chat.popEmoji}</Text>
          </Animated.View>
        ) : null}

        {/* Floating Scroll to Bottom Arrow */}
        {(!isNearBottom || chat.unreadCount > 0) && (() => {
          const ButtonContent = (
            <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              <Ionicons name="arrow-down" size={20} color={T.text} />
              {chat.unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  backgroundColor: T.green || '#2ECC71',
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                  borderWidth: 1.5,
                  borderColor: T.surface,
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                    {chat.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          );

          return (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: chat.isRecording ? 104 : insets.bottom + 104, // floats elegantly above the input bar with plenty of clearance
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  chat.listRef.current?.scrollToEnd({ animated: true });
                  chat.setUnreadCount(0);
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  overflow: 'hidden',
                  backgroundColor: isDark ? 'rgba(30, 30, 30, 0.75)' : 'rgba(255, 255, 255, 0.8)',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.15,
                  shadowRadius: 5,
                  elevation: 4,
                }}
              >
                {BlurView ? (
                  <BlurView
                    intensity={60}
                    tint={isDark ? 'dark' : 'light'}
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {ButtonContent}
                  </BlurView>
                ) : (
                  <View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' }}>
                    {ButtonContent}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Messaging Input Bar */}
        {(() => {
          const isChannel = chat.channel?.type === 'channel';
          if (isChannel) {
            const myRole = chat.channel?.myRole;
            const isParticipant = !!myRole;

            if (!isParticipant) {
              return (
                <View style={[styles.inputBar, { paddingBottom: insets.bottom + 12, alignItems: 'center' }]}>
                  <TouchableOpacity
                    style={{
                      width: '100%',
                      backgroundColor: '#8BC34A',
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={chat.joinChannel}
                  >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                      {t('Join Channel') || 'Join Channel'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }

            if (myRole === 'member') {
              return (
                <View style={[styles.inputBar, { paddingBottom: insets.bottom + 12 }]}>
                  <View style={{ backgroundColor: T.surfaceAlt, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#8BC34A', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: T.text, fontSize: 13, fontWeight: '600', lineHeight: 18, textAlign: 'center' }}>
                      {t('This channel is read-only. Only authorized writers can publish messages.') || 'This channel is read-only. Only authorized writers can publish messages.'}
                    </Text>
                  </View>
                </View>
              );
            }
          }

          const placeholderText = isChannel
            ? (chat.channel?.myRole === 'owner' ? t('Share an update...') : t('Write a message...'))
            : t('Message');

          return (
            <View style={[styles.inputBar, { paddingBottom: chat.isRecording ? 12 : insets.bottom + 12 }]}>
              {chat.typingUser ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingLeft: 8 }}>
                  <Text style={{ color: T.textMuted, fontSize: 12, fontStyle: 'italic' }}>
                    {chat.typingUser} {t('is typing')}...
                  </Text>
                </View>
              ) : null}

              {chat.replyingTo ? (
                <View style={{ backgroundColor: T.surfaceAlt, padding: 8, borderRadius: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: T.textMuted, fontSize: 12 }}>{t('Replying to')} <Text style={{ color: T.text, fontWeight: '700' }}>{chat.replyingTo.senderName}</Text></Text>
                    <Text style={{ color: T.textMuted, fontSize: 12 }} numberOfLines={1}>{chat.replyingTo.preview}</Text>
                  </View>
                  <TouchableOpacity onPress={() => chat.setReplyingTo(null)} style={{ padding: 8 }}>
                    <Ionicons name="close" size={18} color={T.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.inputRow}>
                {!chat.isRecording && (
                  <TouchableOpacity
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        chat.pickMediaAndSend();
                      } else {
                        Alert.alert(
                          t('Attach Media'),
                          '',
                          [
                            { text: t('Photo / Video'), onPress: () => chat.pickMediaAndSend() },
                            { text: t('Cancel'), style: 'cancel' },
                          ]
                        );
                      }
                    }}
                    style={{ padding: 8 }}
                    accessibilityLabel="Attach media"
                  >
                    <Ionicons name="attach" size={22} color={T.text} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={chat.isRecording ? chat.stopRecordingAndSend : chat.startRecording}
                  style={{ padding: 8 }}
                  accessibilityLabel="Voice message"
                >
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: chat.isRecording ? '#E74C3C' : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Ionicons name="mic" size={18} color={chat.isRecording ? '#fff' : T.text} />
                  </View>
                </TouchableOpacity>

                {chat.isRecording ? (
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#E74C3C', opacity: pulseAnim, marginRight: 6 }} />
                      <Text style={{ color: T.text, fontSize: 14, fontWeight: '600' }}>
                        {t('Recording')} {formatRecordingTime(chat.recordingDuration)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity
                        onPress={chat.cancelRecording}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, marginRight: 4 }}
                        accessibilityLabel="Cancel recording"
                      >
                        <Ionicons name="trash-outline" size={16} color="#E74C3C" />
                        <Text style={{ color: '#E74C3C', marginLeft: 3, fontWeight: '600', fontSize: 13 }}>
                          {t('Cancel')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={chat.stopRecordingAndSend}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#2ECC71', borderRadius: 16 }}
                        accessibilityLabel="Send recording"
                      >
                        <Ionicons name="send" size={14} color="#fff" />
                        <Text style={{ color: '#fff', marginLeft: 4, fontWeight: '700', fontSize: 13 }}>
                          {t('Send')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <TextInput
                      value={chat.input}
                      onChangeText={chat.setInput}
                      placeholder={placeholderText}
                      placeholderTextColor={T.textMuted}
                      style={styles.textInput}
                      multiline
                    />
                    <TouchableOpacity onPress={() => { chat.handleSend(); chat.setReplyingTo(null); }} style={styles.sendBtn}>
                      <Ionicons name="send" size={18} color="#fff" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        })()}
      </KeyboardAvoidingView>

      {/* Options Menu Modal */}
      <OptionsActionMenu
        visible={chat.menuVisible}
        onRequestClose={() => chat.setMenuVisible(false)}
        isDM={!!isDMChannel}
        isMuted={!!chat.channel?.myMuted}
        onOpenMembers={() => chat.setMembersSheetVisible(true)}
        onOpenEditGroup={() => chat.setEditSheetVisible(true)}
        onMuteToggle={() => {
          if (isDMChannel) {
            setShowConfirmMuteDM(true);
          } else {
            // If channel already muted, unmute immediately; otherwise open settings
            if (chat.channel?.myMuted) {
              setMuting(true);
              chat.updateNotificationSettings('all').finally(() => setMuting(false));
            } else {
              setShowNotificationModal(true);
            }
          }
        }}
        onClearChat={chat.handleClearChat}
        onDeleteConversation={chat.handleDeleteDM}
        theme={T}
        insets={insets}
        isDark={isDark}
        BlurView={BlurView}
        t={t}
      />

      {/* Members Bottom Sheet */}
      <MembersBottomSheet
        visible={chat.membersSheetVisible}
        onClose={() => chat.setMembersSheetVisible(false)}
        channel={chat.channel}
        members={chat.members}
        membersLoading={chat.membersLoading}
        isAdmin={chat.isAdmin}
        user={user}
        allUsers={chat.allUsers}
        showAddList={chat.showAddList}
        setShowAddList={chat.setShowAddList}
        selectedToAdd={chat.selectedToAdd}
        toggleSelectToAdd={chat.toggleSelectToAdd}
        addMembers={chat.addMembers}
        adding={chat.adding}
        removeMember={chat.removeMember}
        openEditSheet={() => chat.setEditSheetVisible(true)}
        copyChannelLink={chat.copyChannelLink}
        fetchMembers={chat.fetchMembers}
        theme={T}
        isRTL={isRTL}
        t={t}
        isDark={isDark}
        BlurView={BlurView}
        onPressMemberAvatar={chat.openUserProfile}
      />

      {/* Edit Group Info Modal */}
      <EditGroupModal
        visible={chat.editSheetVisible}
        onClose={() => chat.setEditSheetVisible(false)}
        channel={chat.channel}
        editName={chat.editName}
        setEditName={chat.setEditName}
        editPhotoUri={chat.editPhotoUri}
        uploadingPhoto={chat.uploadingPhoto}
        saving={chat.saving}
        hasChanges={chat.hasChanges}
        isCreator={chat.isCreator}
        isAdmin={chat.isAdmin}
        showImageOptions={chat.showImageOptions}
        saveGroupEdits={chat.saveGroupEdits}
        setConfirmDeleteVisible={chat.setConfirmDeleteVisible}
        theme={T}
        isDark={isDark}
        BlurView={BlurView}
        t={t}
        modalBg={modalBg}
        overlayFallback={overlayFallback}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        visible={chat.confirmDeleteVisible}
        onClose={() => chat.setConfirmDeleteVisible(false)}
        deleting={chat.deleting}
        performDeleteGroup={chat.performDeleteGroup}
        theme={T}
        isDark={isDark}
        BlurView={BlurView}
        t={t}
        modalBg={modalBg}
        overlayFallback={overlayFallback}
      />

      {/* Clear Chat Confirmation Modal */}
      <ConfirmationModal
        visible={chat.confirmClearVisible}
        onClose={() => chat.setConfirmClearVisible(false)}
        title={t('Clear Chat')}
        message={t('All messages in this conversation will be permanently deleted for you. This cannot be undone.')}
        confirmLabel={t('Clear')}
        onConfirm={chat.performClearChat}
        loading={chat.clearingChat}
        isDestructive={true}
        theme={T}
        isDark={isDark}
        BlurView={BlurView}
        t={t}
        modalBg={modalBg}
        overlayFallback={overlayFallback}
      />

      {/* Delete Conversation Confirmation Modal */}
      <ConfirmationModal
        visible={chat.confirmDeleteDMVisible}
        onClose={() => chat.setConfirmDeleteDMVisible(false)}
        title={t('Delete Conversation')}
        message={t('This conversation and all its messages will be permanently deleted for you. This cannot be undone.')}
        confirmLabel={t('Delete')}
        onConfirm={chat.performDeleteDM}
        loading={chat.deletingDM}
        isDestructive={true}
        theme={T}
        isDark={isDark}
        BlurView={BlurView}
        t={t}
        modalBg={modalBg}
        overlayFallback={overlayFallback}
      />

      {/* Reactions Overlay Modal */}
      <ReactionsOverlayModal
        visible={!!chat.reactionMsgId}
        reactionMsgId={chat.reactionMsgId}
        onClose={() => chat.setReactionMsgId(null)}
        reactionEmojis={chat.reactionEmojis}
        handleToggleReaction={chat.handleToggleReaction}
        selectedMsg={selectedMsg}
        handleReplyTo={chat.handleReplyTo}
        handleCopy={chat.handleCopy}
        handleStartEdit={chat.handleStartEdit}
        handleDeleteMessage={chat.handleDeleteMessage}
        handleTogglePin={chat.handleTogglePin}
        user={user}
        theme={T}
        isDark={isDark}
        BlurView={BlurView}
        t={t}
        modalBg={modalBg}
        overlayFallback={overlayFallback}
      />

      {/* User Profile Bottom Sheet */}
      <UserProfileBottomSheet
        visible={chat.profileSheetVisible}
        onClose={chat.closeUserProfile}
        userId={chat.selectedProfileUserId}
        theme={T}
        isDark={isDark}
        BlurView={BlurView}
        t={t}
        onStartChat={chat.startDirectMessage}
      />

      {/* Reactors Bottom Sheet */}
      <ReactorsBottomSheet
        visible={reactorsSheetVisible}
        onClose={() => setReactorsSheetVisible(false)}
        messageId={reactorsMsgId}
        reactionCounts={reactorsCounts}
        theme={T}
        isDark={isDark}
        BlurView={BlurView}
        t={t}
        isRTL={isRTL}
        onPressUser={(userId) => chat.openUserProfile(userId)}
      />
    </SafeAreaView>
  );
}
