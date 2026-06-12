import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Pressable, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, useWindowDimensions, Alert, Linking, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../auth/state/auth.context';
import { useTheme } from '../../../../shared/context/theme.context';
import { useLanguage } from '../../../../shared/context/language.context';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCommunityChat } from '../../hooks/useCommunityChat';
import { usePresence } from '../../../../shared/hooks/usePresence';
import OnlineDot from '../../../../shared/components/OnlineDot';
import AnimatedReanimated, { FadeInDown, SlideInRight, useReducedMotion } from 'react-native-reanimated';

// Decoupled sub-components
import { OptionsActionMenu } from '../components/OptionsActionMenu';
import { MembersBottomSheet } from '../components/MembersBottomSheet';
import { EditGroupModal } from '../components/EditGroupModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { ReactionsOverlayModal } from '../components/ReactionsOverlayModal';

// Optional native BlurView
let BlurView: any = null;
try { BlurView = require('expo-blur').BlurView; } catch (e) { BlurView = null; }

export default function CommunityMessaging({ initialChannel, initialChannelId, navigation }: any) {
  const { user } = useAuth();
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const [highlightedMsgId, setHighlightedMsgId] = React.useState<string | null>(null);
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

  // Extract all states and operations from our state controller
  const chat = useCommunityChat(initialChannel, initialChannelId, navigation);
  const { isOnline, fetchStatuses } = usePresence();

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
    if (!ch) return null;
    const isDM = ch.name?.startsWith('DM-') || ch.type === 'direct' || ch.type === 'dm';
    if (!isDM) return null;
    const parts = ch.participants || ch.members || [];
    for (const p of parts) {
      const id = p.userId ? String(p.userId) : String(p._id || p.id || p);
      if (id && id !== String(user?._id)) return id;
    }
    return null;
  }, [chat.channel, user?._id]);

  const partnerOnline = dmPartnerId ? isOnline(dmPartnerId) : false;

  React.useEffect(() => {
    if (dmPartnerId) {
      fetchStatuses([dmPartnerId]);
    }
  }, [dmPartnerId, fetchStatuses]);

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
    return chat.messages.find((m) => m.id === chat.reactionMsgId);
  }, [chat.messages, chat.reactionMsgId]);

  const formatDuration = (sec?: number) => {
    if (sec === undefined || isNaN(sec)) return '0:00';
    const roundedSec = Math.round(sec);
    const mins = Math.floor(roundedSec / 60);
    const secs = roundedSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getChatDisplay = (ch: any) => {
    if (!ch) return { name: ch?.name || t('Chat'), avatar: ch?.avatarUrl || null };

    const desc: string | undefined = ch.description || ch.desc;
    const dmPrefix = 'Direct Message between ';
    if (desc && desc.startsWith(dmPrefix)) {
      const namesStr = desc.substring(dmPrefix.length);
      const parts = namesStr.split(' and ');
      if (parts.length === 2) {
        const otherName = parts[0] === user?.fullName ? parts[1] : parts[0];
        return { name: otherName, avatar: ch.avatarUrl || null };
      }
    }

    const parts = ch.participants || ch.members || ch.userIds || ch.participantIds;
    if (Array.isArray(parts) && parts.length > 0) {
      const obj = parts.find((p: any) => p && (p._id || p.id) && String(p._id || p.id) !== String(user?._id));
      if (obj) return { name: obj.fullName || obj.name || obj.displayName || String(obj._id || obj.id), avatar: obj.avatarUrl || obj.avatar || ch.avatarUrl || null };

      const otherId = parts.find((p: any) => String(p) !== String(user?._id));
      if (otherId) return { name: String(otherId), avatar: ch.avatarUrl || null };
    }

    if (ch.name && typeof ch.name === 'string' && ch.name.startsWith('DM-')) {
      return { name: desc || ch.name, avatar: ch.avatarUrl || null };
    }

    return { name: ch.name || ch.displayName || desc || t('Chat'), avatar: ch.avatarUrl || null };
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
      paddingVertical: 8, paddingHorizontal: 12,
      borderRadius: 18, borderBottomLeftRadius: 4,
      maxWidth: windowWidth * 0.72, minWidth: 60,
      alignSelf: 'flex-start', flexShrink: 1, marginHorizontal: 6,
      overflow: 'hidden',
      ...(Platform.OS === 'web' ? { wordBreak: 'break-word', overflowWrap: 'break-word' } as any : {}),
    },
    bubbleRight: {
      backgroundColor: isDark ? '#1E7A4D' : '#2ECC71',
      paddingVertical: 8, paddingHorizontal: 12,
      borderRadius: 18, borderBottomRightRadius: 4,
      maxWidth: windowWidth * 0.72, minWidth: 60,
      alignSelf: 'flex-end', flexShrink: 1, marginHorizontal: 6,
      overflow: 'hidden', alignItems: 'flex-start',
      ...(Platform.OS === 'web' ? { wordBreak: 'break-word', overflowWrap: 'break-word' } as any : {}),
    },
    msgText: {
      color: T.text, fontSize: 14.5, lineHeight: 20,
      flexWrap: 'wrap', flexShrink: 1, minWidth: 0,
      ...(Platform.OS === 'web' ? { wordBreak: 'break-word', overflowWrap: 'break-word' } as any : {}),
    },
    timeText: { fontSize: 10, color: T.textMuted, marginTop: 2 },
    messageBlock: { flexDirection: 'column', alignItems: 'flex-start' },
    inputBar: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
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

  const renderItem = ({ item, index }: { item: any; index: number }) => {
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

    // Attachment type helpers
    const firstAtt = item.attachments && item.attachments.length > 0 ? item.attachments[0] : null;
    const isAudio = firstAtt?.type === 'audio';
    const isImage = firstAtt?.type === 'image';
    const isVideo = firstAtt?.type === 'video';

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
          item.id === highlightedMsgId
            ? [styles.bubbleRight, { backgroundColor: isDark ? '#196F3D' : '#27AE60', transform: [{ scale: 1.02 }] }]
            : styles.bubbleRight,
          { borderBottomRightRadius: shouldGroup ? 18 : 4 }
        ]
      : [
          item.id === highlightedMsgId
            ? [styles.bubbleLeft, { backgroundColor: isDark ? '#2E4053' : '#D5F5E3', transform: [{ scale: 1.02 }] }]
            : styles.bubbleLeft,
          { borderBottomLeftRadius: shouldGroup ? 18 : 4 }
        ];

    // Reaction pills shared between bubble types
    const reactionPills = item.reactionCounts && Object.keys(item.reactionCounts).length > 0 ? (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
        {Object.entries(item.reactionCounts).map(([emoji, count]: any) => (
          <TouchableOpacity
            key={emoji}
            onPress={() => chat.handleToggleReaction(item.id || item._id, emoji)}
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
          <Text style={[styles.msgText, { fontStyle: 'italic', opacity: 0.55, color: isMe ? '#fff' : T.textMuted }]}>
            🗑 {t('Message deleted')}
          </Text>
        );
      }

        // Loading indicator for optimistic messages
        if (item.status === 'sending') {
          if (isImage || isVideo) {
            return (
              <View style={{ width: Math.min(windowWidth * 0.6, 260), height: Math.min(windowWidth * 0.45, 200), borderRadius: 10, backgroundColor: T.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
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
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 160 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isMe ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name={chat.playingId === (item.id || item._id) ? 'pause' : 'play'} size={16} color={isMe ? '#fff' : T.text} />
            </View>
            <View style={{ flex: 1, marginLeft: 8, marginRight: 6, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 26 }}>
                {[6,10,14,20,14,10,8,12].map((h, idx) => {
                  const isPlayed = chat.playingId === (item.id || item._id) && chat.audioProgress >= (idx / 8);
                  return (
                    <Animated.View key={idx} style={{ width: 3.5, marginHorizontal: 1.5, backgroundColor: isMe ? '#fff' : T.text, height: h - 2, borderRadius: 1.5, opacity: isPlayed ? 1 : 0.4 }} />
                  );
                })}
              </View>
            </View>
            <Text style={{ color: isMe ? '#fff' : T.text, fontSize: 11 }}>{formatDuration(firstAtt?.duration || item.duration)}</Text>
          </View>
        );
      }

      if (isImage) {
        const imgUrl = firstAtt?.thumbnail || firstAtt?.url;
        return (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => { if (firstAtt?.url) Linking.openURL(firstAtt.url).catch(() => {}); }}
            style={{ borderRadius: 10, overflow: 'hidden' }}
          >
            <Image
              source={{ uri: imgUrl }}
              style={{
                width: Math.min(windowWidth * 0.6, 260),
                height: Math.min(windowWidth * 0.45, 200),
                borderRadius: 10,
                backgroundColor: T.surfaceAlt,
              }}
              resizeMode="cover"
            />
            {!!item.content && (
              <Text style={[styles.msgText, { marginTop: 6, color: isMe ? '#fff' : T.text }]}>{item.content}</Text>
            )}
          </TouchableOpacity>
        );
      }

      if (isVideo) {
        const thumbUrl = firstAtt?.thumbnail;
        return (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => { if (firstAtt?.url) Linking.openURL(firstAtt.url).catch(() => {}); }}
            style={{ borderRadius: 10, overflow: 'hidden', position: 'relative' }}
          >
            {thumbUrl ? (
              <Image
                source={{ uri: thumbUrl }}
                style={{
                  width: Math.min(windowWidth * 0.6, 260),
                  height: Math.min(windowWidth * 0.38, 170),
                  borderRadius: 10,
                  backgroundColor: T.surfaceAlt,
                }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ width: Math.min(windowWidth * 0.6, 260), height: Math.min(windowWidth * 0.38, 170), borderRadius: 10, backgroundColor: isDark ? '#1a2a1a' : '#e8f5e9', justifyContent: 'center', alignItems: 'center' }}>
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
              <Text style={[styles.msgText, { marginTop: 6, color: isMe ? '#fff' : T.text }]}>{item.content}</Text>
            )}
          </TouchableOpacity>
        );
      }

      // Default: text
      return (
        <Text style={[styles.msgText, isMe ? { color: '#fff' } : undefined]}>{item.content}</Text>
      );
    };

    const longPressHandler = () => {
      if (isTemp) return;
      chat.setReactionMsgId(item.id || item._id);
    };

    const pressHandler = () => {
      if (isTemp) return;
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

            <TouchableOpacity
              activeOpacity={0.92}
              onLongPress={longPressHandler}
              onPress={pressHandler}
              style={bubbleStyle}
            >
              {replyPreview}
              {renderBubbleContent()}
              {reactionPills}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, marginHorizontal: 6 }}>
              {!!item.pinned && (
                <Ionicons name="pin" size={11} color={T.green || '#2ECC71'} style={{ marginRight: 4 }} />
              )}
              <Text style={{ fontSize: 10, color: T.textMuted }}>
                {formatMessageTime(item.createdAt || item.created_at)}
              </Text>
              {isMe && !isTemp && (
                <Ionicons name="checkmark-done" size={13} color={T.green || '#2ECC71'} style={{ marginLeft: 3 }} />
              )}
              {!!item.editedAt && (
                <Text style={{ fontSize: 9, color: T.textMuted, marginLeft: 4, fontStyle: 'italic' }}>{t('edited')}</Text>
              )}
            </View>
          </View>
        </AnimatedReanimated.View>
      </View>
    );
  };

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
    <SafeAreaView style={styles.container} edges={["top","left","right"]}>
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Left: back + avatar + identity */}
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack && navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('MessagingHome');
            }}
            style={styles.backBtn}
          >
            <Ionicons name={isRTL ? 'arrow-forward-outline' : 'arrow-back-outline'} size={22} color={T.text} />
          </TouchableOpacity>

          {dmPartnerId ? (
            /* ── DM Header ──────────────────────────────────────────────────── */
            <TouchableOpacity
              onPress={() => chat.setMembersSheetVisible(true)}
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}
              activeOpacity={0.75}
            >
              {/* Avatar with presence dot */}
              <View style={{ position: 'relative' }}>
                {display.avatar ? (
                  <Image source={{ uri: display.avatar }} style={styles.dmAvatar} />
                ) : (
                  <View style={[styles.dmAvatar, { backgroundColor: isDark ? '#1E4A3A' : '#D5F5E3', alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: T.green || '#2ECC71' }}>
                      {String(display.name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <OnlineDot isOnline={partnerOnline} size={12} />
              </View>

              {/* Name + status */}
              <View style={styles.headerMeta}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={styles.headerName} numberOfLines={1}>{display.name}</Text>
                  {!!chat.channel?.myMuted && (
                    <Ionicons name="notifications-off" size={13} color={T.textMuted} />
                  )}
                </View>
                {chat.typingUser ? (
                  <Text style={styles.headerSubOnline}>{t('typing...')}</Text>
                ) : (
                  <Text style={partnerOnline ? styles.headerSubOnline : styles.headerSub}>
                    {partnerOnline ? t('Online') : t('Offline')}
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
                <Text style={styles.headerSub}>
                  {(chat.channel?.participants?.length || 0) > 0
                    ? `${chat.channel.participants.length} ${t('members')}`
                    : t('Group')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Right: actions */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={{ padding: 8 }}
            onPress={() => chat.setMenuVisible(true)}
            accessibilityLabel="Options"
          >
            <Ionicons name="ellipsis-vertical" size={20} color={T.text} />
          </TouchableOpacity>
        </View>
      </View>

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
                  } catch (e) {}
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

      {/* Messages List */}
      {chat.loading && chat.messages.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>
      ) : (
        <FlatList
          ref={chat.listRef}
          data={chat.messages}
          keyExtractor={(i) => String(i.id || i._id || Math.random())}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 120 + insets.bottom },
            chat.messages.length === 0 && { flexGrow: 1, justifyContent: 'center' }
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
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
        <Animated.View pointerEvents="none" style={{ position: 'absolute', right: 36, bottom: 120, transform: [{ scale: chat.popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.15] }) }], opacity: chat.popAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 0] }) }}>
          <Text style={{ fontSize: 40 }}>{chat.popEmoji}</Text>
        </Animated.View>
      ) : null}

      {/* Messaging Input Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 + insets.bottom : 0}>
        <View style={[styles.inputBar, { bottom: insets.bottom }]}>
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
                  placeholder={t('Message')}
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
      </KeyboardAvoidingView>

      {/* Options Menu Modal */}
      <OptionsActionMenu
        visible={chat.menuVisible}
        onRequestClose={() => chat.setMenuVisible(false)}
        isDM={!!dmPartnerId}
        isMuted={!!chat.channel?.myMuted}
        onOpenMembers={() => chat.setMembersSheetVisible(true)}
        onOpenEditGroup={() => chat.setEditSheetVisible(true)}
        onMuteToggle={chat.handleMuteDM}
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
    </SafeAreaView>
  );
}
