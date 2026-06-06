import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Clipboard,
  Image,
  ScrollView,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../auth/state/auth.context';
import { TokenStore } from '../../../../core/storage/secure-store';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { useTheme } from '../../../../shared/context/theme.context';
import { useLanguage } from '../../../../shared/context/language.context';
import * as Haptics from 'expo-haptics';
// Force reload comment

// ── Microservice configuration ──────────────────────────────────────────────
const CORE_API_URL = API_BASE_URL; // Port 5000 (usually)
const MSG_SERVICE_URL = API_BASE_URL.replace(':5000', ':5001'); // Port 5001 (e.g., http://localhost:5001/api)
const MSG_SERVICE_SOCKET_URL = MSG_SERVICE_URL.replace('/api', ''); // e.g., http://localhost:5001

// ── Visual mapping helper for channel icons ──────────────────────────────────
const getChannelVisual = (channelName: string) => {
  const name = channelName.toLowerCase();
  if (name.includes('tips') || name.includes('tip') || name.includes('gf')) {
    return { icon: 'search-outline', unread: 3 };
  }
  if (name.includes('reviews') || name.includes('review')) {
    return { icon: 'star-outline', unread: 0 };
  }
  if (name.includes('begin')) {
    return { icon: 'leaf-outline', unread: 12 };
  }
  if (name.includes('store') || name.includes('restau')) {
    return { icon: 'storefront-outline', unread: 0 };
  }
  return { icon: 'chatbubbles-outline', unread: 0 };
};

const CELIAC_BADGES = [
  {
    id: 'bronze',
    name: 'Bronze Initiator',
    description: 'Unlock at 150 XP to start your journey.',
    pointsRequired: 150,
    color: '#CD7F32',
    bgColor: 'rgba(205, 127, 50, 0.12)',
  },
  {
    id: 'silver',
    name: 'Active Contributor',
    description: 'Unlock at 500 XP to showcase your contribution.',
    pointsRequired: 500,
    color: '#A0AAB5',
    bgColor: 'rgba(160, 170, 181, 0.15)',
  },
  {
    id: 'gold',
    name: 'Gluten-Free Champion',
    description: 'Unlock at 2500 XP as the ultimate guardian.',
    pointsRequired: 2500,
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.15)',
  },
];

const PRO_BADGES = [
  {
    id: 'pro_silver',
    name: 'Silver Advocate',
    description: 'Unlock at 300 XP to show advocacy.',
    pointsRequired: 300,
    color: '#A0AAB5',
    bgColor: 'rgba(160, 170, 181, 0.15)',
  },
  {
    id: 'pro_gold',
    name: 'Gold Guardian',
    description: 'Unlock at 2500 XP as the ultimate guardian.',
    pointsRequired: 2500,
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.15)',
  },
];

// ── Explore communities mock data ───────────────────────────────────────────
const exploreCommunities = [
  { id: 'exp1', name: 'Beginner Guide', description: 'New to gluten-free? Start here.' },
  { id: 'exp2', name: 'Healthy Lifestyle', description: 'Balance your diet and wellness.' },
  { id: 'exp3', name: 'Gluten-Free Desserts', description: 'Sweet treats without gluten.' },
];

const formatStackTime = (dateStr: string) => {
  if (!dateStr) return { datePart: '', timePart: '' };
  const d = new Date(dateStr);
  const datePart = d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
  const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return { datePart, timePart };
};

export function TempCommunityMessaging({ initialChannel, initialChannelId }: { initialChannel?: any; initialChannelId?: string } = {}) {
  const { user } = useAuth();
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();

  // State variables
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any | null>(null);

  const getChannelDisplayName = (channel: any) => {
    if (!channel) return '';
    if (channel.name && channel.name.startsWith('DM-')) {
      const desc = channel.description || '';
      const prefix = 'Direct Message between ';
      if (desc.startsWith(prefix)) {
        const namesStr = desc.substring(prefix.length);
        const parts = namesStr.split(' and ');
        if (parts.length === 2) {
          const otherName = parts[0] === user?.fullName ? parts[1] : parts[0];
          return otherName;
        }
      }
      return channel.description || channel.name;
    }
    return channel.name;
  };
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [connected, setConnected] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showChannelSelect, setShowChannelSelect] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [composerHeight, setComposerHeight] = useState(36);
  const [composerExpanded, setComposerExpanded] = useState(false);

  // Reaction Modal State
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const [reactionEmojis] = useState(['❤️', '👍', '😂', '😮', '😢', '🔥', '🎉', '✅']);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [joinedExploreIds, setJoinedExploreIds] = useState<string[]>([]);
  const [consultedUser, setConsultedUser] = useState<any | null>(null);
  const [consultingLoading, setConsultingLoading] = useState(false);

  // Refs
  const lastTapRef = useRef<{ [msgId: string]: number }>({});
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<{ [userId: string]: NodeJS.Timeout }>({});

  const pinnedMessages = useMemo(() => {
    return messages.filter((m) => m.pinned && !m.deletedAt);
  }, [messages]);

  const selectedMsg = useMemo(() => {
    return messages.find((m) => m.id === reactionMsgId);
  }, [messages, reactionMsgId]);

  const hasText = inputText.trim().length > 0;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: T.bg,
    },
    header: {
      height: 56,
      borderBottomWidth: 1,
      borderBottomColor: T.divider,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      backgroundColor: T.surface,
    },
    headerTitleContainer: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: T.text,
      marginHorizontal: 6,
    },
    headerSubtitle: {
      fontSize: 12,
      color: T.textMuted,
    },
    connectionDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 8,
    },
    listContent: {
      paddingHorizontal: 12,
      paddingVertical: 16,
      paddingBottom: 24,
    },
    // Redesigned Message Row & Bubble layouts
    messageRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      marginVertical: 8,
      width: '100%',
    },
    myMessageRow: {
      justifyContent: isRTL ? 'flex-start' : 'flex-end',
      paddingLeft: isRTL ? 0 : 40,
      paddingRight: isRTL ? 40 : 0,
    },
    otherMessageRow: {
      justifyContent: isRTL ? 'flex-end' : 'flex-start',
      paddingRight: isRTL ? 0 : 40,
      paddingLeft: isRTL ? 40 : 0,
    },
    avatarContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 8,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitials: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    timestampStack: {
      flexDirection: 'column',
      justifyContent: 'center',
      minWidth: 50,
    },
    timestampStackText: {
      fontSize: 8,
      color: T.textMuted,
      lineHeight: 11,
    },
    bubble: {
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
      maxWidth: '65%',
      shadowColor: T.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    myBubble: {
      backgroundColor: isDark ? '#2E4C1F' : '#C5E1A5', // Soft dark green in dark mode, light green in light mode
      borderWidth: isDark ? 1 : 0,
      borderColor: T.greenBorder,
    },
    otherBubble: {
      backgroundColor: isDark ? '#4D2327' : '#E8A2A9', // Soft dark rose in dark mode, light pink/rose in light mode
      borderWidth: isDark ? 1 : 0,
      borderColor: 'rgba(232, 162, 169, 0.3)',
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
      textAlign: isRTL ? 'right' : 'left',
    },
    myMessageText: {
      color: isDark ? '#F0FDF4' : '#2C3E50',
    },
    otherMessageText: {
      color: isDark ? '#FFF0F1' : '#2C3E50',
    },
    mediaCard: {
      width: 220,
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 6,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: T.border,
      backgroundColor: T.surface,
      shadowColor: T.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 3,
    },
    mediaImage: {
      width: '100%',
      height: 150,
    },
    mediaOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 10,
    },
    mediaLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    mediaCaption: {
      marginTop: 4,
      fontSize: 12,
      color: '#FFFFFF',
    },
    voiceCard: {
      marginTop: 6,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: T.border,
      backgroundColor: T.surface,
    },
    voiceCardMe: {
      backgroundColor: isDark ? 'rgba(46, 76, 31, 0.2)' : 'rgba(197, 225, 165, 0.35)',
      borderColor: isDark ? 'rgba(46, 76, 31, 0.4)' : 'rgba(140, 190, 120, 0.4)',
    },
    voiceCardOther: {
      backgroundColor: isDark ? 'rgba(77, 35, 39, 0.25)' : 'rgba(232, 162, 169, 0.3)',
      borderColor: isDark ? 'rgba(77, 35, 39, 0.45)' : 'rgba(232, 162, 169, 0.5)',
    },
    voiceRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 10,
    },
    voicePlayButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    voicePlayButtonMe: {
      backgroundColor: isDark ? '#2E4C1F' : '#5BAE4B',
    },
    voicePlayButtonOther: {
      backgroundColor: isDark ? '#4D2327' : '#D9646E',
    },
    voiceMeta: {
      flex: 1,
    },
    voiceTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: T.text,
      marginBottom: 2,
    },
    voiceSubtitle: {
      fontSize: 11,
      color: T.textMuted,
      marginBottom: 6,
    },
    voiceWave: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 4,
    },
    voiceBar: {
      width: 3,
      borderRadius: 2,
      backgroundColor: T.green,
      opacity: 0.7,
    },
    voiceDuration: {
      fontSize: 11,
      color: T.textMuted,
      marginLeft: isRTL ? 0 : 6,
      marginRight: isRTL ? 6 : 0,
    },
    reelCard: {
      width: 220,
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 6,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
      shadowColor: T.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 3,
    },
    reelMedia: {
      width: '100%',
      height: 120,
      overflow: 'hidden',
    },
    reelOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    reelMeta: {
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    reelTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      color: T.text,
    },
    reelSubtitle: {
      fontSize: 10.5,
      color: T.textMuted,
      marginTop: 2,
    },
    timeText: {
      fontSize: 9,
      color: T.textMuted,
    },
    myTimeText: {
      color: isDark ? 'rgba(240, 253, 244, 0.6)' : 'rgba(44, 62, 80, 0.6)',
    },
    otherTimeText: {
      color: isDark ? 'rgba(255, 240, 241, 0.6)' : 'rgba(44, 62, 80, 0.6)',
    },
    senderName: {
      fontSize: 11,
      color: T.textMuted,
      marginBottom: 3,
      marginLeft: 4,
      textAlign: isRTL ? 'right' : 'left',
    },
    // Reply bubble
    replyRefContainer: {
      borderLeftWidth: isRTL ? 0 : 3,
      borderRightWidth: isRTL ? 3 : 0,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      marginBottom: 6,
    },
    myReplyRefContainer: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      borderLeftColor: isRTL ? undefined : (isDark ? '#F0FDF4' : '#2C3E50'),
      borderRightColor: isRTL ? (isDark ? '#F0FDF4' : '#2C3E50') : undefined,
    },
    otherReplyRefContainer: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      borderLeftColor: isRTL ? undefined : (isDark ? '#FFF0F1' : '#2C3E50'),
      borderRightColor: isRTL ? (isDark ? '#FFF0F1' : '#2C3E50') : undefined,
    },
    replyRefSender: {
      fontSize: 10,
      fontWeight: '600',
      marginBottom: 2,
      textAlign: isRTL ? 'right' : 'left',
    },
    myReplyRefSender: {
      color: isDark ? '#F0FDF4' : '#2C3E50',
    },
    otherReplyRefSender: {
      color: isDark ? '#FFF0F1' : '#2C3E50',
    },
    replyRefText: {
      fontSize: 12,
      textAlign: isRTL ? 'right' : 'left',
    },
    myReplyRefText: {
      color: isDark ? 'rgba(240, 253, 244, 0.8)' : 'rgba(44, 62, 80, 0.8)',
    },
    otherReplyRefText: {
      color: isDark ? 'rgba(255, 240, 241, 0.8)' : 'rgba(44, 62, 80, 0.8)',
    },
    // Reactions
    reactionsContainer: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginTop: -8,
      zIndex: 10,
      alignSelf: 'flex-start',
      marginLeft: 12,
      gap: 4,
    },
    reactionsContainerMe: {
      alignSelf: 'flex-end',
      marginRight: 12,
      marginLeft: 0,
    },
    reactionBadge: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2.5,
      shadowColor: T.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 1,
      elevation: 1,
    },
    myReactionBadge: {
      borderColor: T.green,
      backgroundColor: T.greenLight,
    },
    reactionEmoji: {
      fontSize: 12,
    },
    reactionCount: {
      fontSize: 10.5,
      color: T.text,
      marginLeft: 3,
      fontWeight: '600',
    },
    // Input bar (Capsule style matching Image 1)
    inputSection: {
      backgroundColor: 'transparent',
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === 'ios' ? 24 : 12,
      paddingTop: 8,
    },
    replyBar: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: T.surface,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderBottomWidth: 1,
      borderBottomColor: T.border,
    },
    replyBarLabel: {
      fontSize: 12,
      color: T.textSub,
    },
    replyBarName: {
      fontWeight: '700',
      color: T.text,
    },
    typingIndicatorBar: {
      height: 20,
      justifyContent: 'center',
      paddingHorizontal: 16,
      marginBottom: 4,
    },
    typingText: {
      fontSize: 11,
      color: T.textMuted,
      fontStyle: 'italic',
      textAlign: isRTL ? 'right' : 'left',
    },
    inputRowCapsule: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      backgroundColor: T.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: T.border,
      paddingHorizontal: 10,
      paddingVertical: 8,
      shadowColor: T.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    composerAddButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: T.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 6,
    },
    textInputCapsule: {
      flex: 1,
      color: T.text,
      fontSize: 15,
      minHeight: 36,
      maxHeight: 120,
      paddingTop: 4,
      paddingBottom: 4,
      textAlign: isRTL ? 'right' : 'left',
    },
    sendIconOnly: {
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 6,
      width: 36,
      height: 36,
      borderRadius: 18,
      overflow: 'hidden',
    },
    sendIconGradient: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    micButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: T.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 6,
    },
    composerActionsRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 10,
      paddingHorizontal: 4,
    },
    composerActionCard: {
      flex: 1,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 14,
      backgroundColor: T.surface,
      borderWidth: 1,
      borderColor: T.border,
    },
    composerActionIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: T.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    composerActionText: {
      fontSize: 12,
      fontWeight: '600',
      color: T.text,
    },
    // Channel select modal
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      backgroundColor: T.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 16,
      paddingBottom: Platform.OS === 'ios' ? 40 : 20,
      maxHeight: '60%',
    },
    modalHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: T.text,
    },
    channelItem: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: T.divider,
    },
    activeChannelItem: {
      backgroundColor: T.greenLight,
    },
    channelName: {
      fontSize: 16,
      color: T.text,
      marginHorizontal: 12,
      fontWeight: '500',
    },
    channelDesc: {
      fontSize: 12,
      color: T.textMuted,
      marginHorizontal: 12,
      marginTop: 2,
    },
    // Reaction menu modal
    reactionBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    reactionMenuContainer: {
      backgroundColor: T.surface,
      borderRadius: 18,
      width: 320,
      padding: 12,
      shadowColor: T.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    emojiPickerRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: T.divider,
      marginBottom: 8,
    },
    emojiButton: {
      paddingVertical: 6,
      paddingHorizontal: 4,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    emojiText: {
      fontSize: 22,
    },
    contextActionsList: {
      flexDirection: 'column',
    },
    contextActionItem: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
    },
    contextActionText: {
      fontSize: 14,
      fontWeight: '500',
      color: T.text,
      marginHorizontal: 12,
    },
    contextActionTextDanger: {
      color: T.red,
    },
    pinnedBanner: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: T.surface,
      borderBottomWidth: 1,
      borderBottomColor: T.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    pinnedBannerText: {
      flex: 1,
      fontSize: 13,
      color: T.text,
      marginHorizontal: 8,
      fontWeight: '500',
    },
    pinnedBannerAction: {
      fontSize: 12,
      fontWeight: '600',
      color: T.green,
      marginHorizontal: 8,
    },
    // Community List Screen styles (Image 2)
    spacesContainer: {
      flex: 1,
      backgroundColor: T.bg,
    },
    spacesHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
      backgroundColor: T.surface,
      borderBottomWidth: 1,
      borderBottomColor: T.divider,
    },
    spacesHeaderTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: T.text,
    },
    spacesSectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: T.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 20,
      marginBottom: 10,
      paddingHorizontal: 20,
      textAlign: isRTL ? 'right' : 'left',
    },
    spaceCard: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: T.surface,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 20,
      marginVertical: 6,
      shadowColor: T.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1.5,
    },
    spaceIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: isRTL ? 0 : 14,
      marginLeft: isRTL ? 14 : 0,
    },
    spaceTitle: {
      fontSize: 15.5,
      fontWeight: '700',
      color: T.text,
      textAlign: isRTL ? 'right' : 'left',
    },
    spaceSubtext: {
      fontSize: 12.5,
      color: T.textMuted,
      marginTop: 3,
      paddingHorizontal: isRTL ? 20 : 0,
      paddingRight: isRTL ? 0 : 20,
      textAlign: isRTL ? 'right' : 'left',
    },
    spaceBadge: {
      backgroundColor: T.green,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 5,
      position: 'absolute',
      right: isRTL ? undefined : 16,
      left: isRTL ? 16 : undefined,
    },
    spaceBadgeText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    exploreSection: {
      paddingBottom: 40,
    },
    exploreCard: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      backgroundColor: T.surface,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 20,
      marginVertical: 5,
    },
    exploreJoinButton: {
      backgroundColor: T.greenLight,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 6,
      position: 'absolute',
      right: isRTL ? undefined : 16,
      left: isRTL ? 16 : undefined,
    },
    exploreJoinText: {
      fontSize: 13,
      fontWeight: '600',
      color: T.green,
    },
    exploreJoinedText: {
      fontSize: 13,
      fontWeight: '600',
      color: T.textMuted,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    consultProfileCard: {
      margin: 16,
      borderRadius: 24,
      overflow: 'hidden',
      maxHeight: '85%',
      shadowColor: T.shadow,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
      elevation: 8,
    },
    consultHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: T.border,
    },
    consultTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    consultScroll: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    consultAvatarSection: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    consultAvatarWrap: {
      width: 96,
      height: 96,
      borderRadius: 48,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: T.green,
    },
    consultAvatar: {
      width: '100%',
      height: '100%',
    },
    consultCheckBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 22,
      height: 22,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: T.surface,
      backgroundColor: T.green,
    },
    consultName: {
      marginTop: 10,
      fontSize: 18,
      fontWeight: '700',
    },
    consultRoleBadge: {
      marginTop: 6,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    consultRoleText: {
      fontSize: 12,
      fontWeight: '600',
    },
    consultBio: {
      marginTop: 8,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 16,
    },
    consultStatsRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 12,
    },
    consultStatCard: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
    },
    consultStatVal: {
      marginTop: 6,
      fontSize: 16,
      fontWeight: '700',
    },
    consultStatLabel: {
      marginTop: 2,
      fontSize: 11,
    },
    consultSectionLabel: {
      marginTop: 16,
      fontSize: 13,
      fontWeight: '700',
    },
    consultBadgesGrid: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 12,
    },
    consultBadgeCard: {
      width: '47%',
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: T.border,
    },
    consultBadgeIconBg: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    consultBadgeName: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '600',
    },
    consultBadgeDesc: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 14,
    },
  }), [T, isDark, isRTL]);

  // ── 1. Fetch Channels from Core API (Port 5000) ─────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const token = await TokenStore.getAccessToken();
        const res = await axios.get(`${CORE_API_URL}/channels`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = res.data.data || [];
        
        if (initialChannel) {
          if (!list.some((c: any) => c.id === initialChannel.id)) {
            list.push(initialChannel);
          }
          setActiveChannel(initialChannel);
        } else if (initialChannelId) {
          const matched = list.find((c: any) => c.id === initialChannelId);
          if (matched) {
            setActiveChannel(matched);
          } else {
            try {
              const chRes = await axios.get(`${CORE_API_URL}/channels/${initialChannelId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (chRes.data?.data) {
                list.push(chRes.data.data);
                setActiveChannel(chRes.data.data);
              }
            } catch (e) {
              console.error('[community] Failed to fetch channel details', e);
            }
          }
        }
        
        setChannels(list);
      } catch (err) {
        console.error('[community] Failed to load channels', err);
      } finally {
        setLoadingChannels(false);
      }
    }
    load();
  }, [initialChannel, initialChannelId]);

  // ── 2. Socket.IO Connection Setup (Port 5001) ──────────────────────────────
  useEffect(() => {
    let active = true;

    async function initSocket() {
      const token = await TokenStore.getAccessToken();
      if (!token) return;

      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socket = io(MSG_SERVICE_SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        if (!active) return;
        setConnected(true);
        console.log('[socket] Connected to Port 5001 microservice');
      });

      socket.on('disconnect', () => {
        if (!active) return;
        setConnected(false);
        console.log('[socket] Disconnected');
      });

      socket.on('connect_error', (err) => {
        console.warn('[socket] Connection error:', err.message);
      });

      // Handle real-time incoming messages
      socket.on('message:new', ({ message }) => {
        if (!active) return;
        if (message.channelId === activeChannel?.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      });

      // Handle message edits
      socket.on('message:edited', ({ messageId, content, editedAt }) => {
        if (!active) return;
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, content, editedAt } : m))
        );
      });

      // Handle message deletion
      socket.on('message:deleted', ({ messageId }) => {
        if (!active) return;
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), content: null } : m))
        );
      });

      // Handle real-time reaction updates
      socket.on('reaction:updated', ({ messageId, emoji, count, action, userId: reactionUserId }) => {
        if (!active) return;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            const updatedCounts = { ...m.reactionCounts };
            if (count > 0) {
              updatedCounts[emoji] = count;
            } else {
              delete updatedCounts[emoji];
            }
            return { ...m, reactionCounts: updatedCounts };
          })
        );
      });

      // Handle typing indicator events
      socket.on('message:typing', ({ channelId, userId, fullName }) => {
        if (!active) return;
        if (channelId !== activeChannel?.id || userId === user?._id) return;

        setTypingUsers((prev) => {
          if (prev.includes(fullName)) return prev;
          return [...prev, fullName];
        });

        if (typingTimeoutRef.current[userId]) {
          clearTimeout(typingTimeoutRef.current[userId]);
        }

        typingTimeoutRef.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((name) => name !== fullName));
        }, 3000);
      });

      socketRef.current = socket;
    }

    if (activeChannel) {
      initSocket();
    }

    return () => {
      active = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
    };
  }, [activeChannel]);

  // ── 3. Fetch Message History from Microservice (Port 5001) ─────────────────
  useEffect(() => {
    if (!activeChannel) return;

    async function loadHistory() {
      setLoadingMessages(true);
      try {
        const token = await TokenStore.getAccessToken();
        const res = await axios.get(`${MSG_SERVICE_URL}/channels/${activeChannel.id}/messages?limit=40`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = res.data.data || [];
        setMessages(list);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      } catch (err) {
        console.error('[community] Failed to load messages history', err);
      } finally {
        setLoadingMessages(false);
      }
    }

    loadHistory();
  }, [activeChannel]);

  // ── 4. Message Actions ──────────────────────────────────────────────────────
  const handleSendMessage = () => {
    if (!inputText.trim() || !socketRef.current || !activeChannel) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (editingMsgId) {
      // Edit Mode
      socketRef.current.emit('message:edit', { messageId: editingMsgId, content: inputText }, (res: any) => {
        if (res?.ok) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === editingMsgId
                ? { ...m, content: inputText, editedAt: new Date().toISOString() }
                : m
            )
          );
          setEditingMsgId(null);
          setInputText('');
          setComposerHeight(36);
          setComposerExpanded(false);
        } else {
          Alert.alert('Error', res?.error || 'Failed to edit message');
        }
      });
      return;
    }

    const payload: any = {
      channelId: activeChannel.id,
      content: inputText,
      type: 'text',
    };

    if (replyingTo) {
      payload.replyTo = {
        messageId: replyingTo.id,
        senderName: replyingTo.senderName,
      };
    }

    socketRef.current.emit('message:send', payload, (res: any) => {
      if (res?.ok) {
        setInputText('');
        setReplyingTo(null);
        setComposerHeight(36);
        setComposerExpanded(false);
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', res?.error || 'Failed to send message');
      }
    });
  };

  const handleSendMockPhoto = () => {
    if (!socketRef.current || !activeChannel) return;
    const mockPhotos = [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop&q=60'
    ];
    const randomUrl = mockPhotos[Math.floor(Math.random() * mockPhotos.length)];
    const payload: any = {
      channelId: activeChannel.id,
      content: t('Sent a photo'),
      type: 'media',
      attachments: [{ url: randomUrl, type: 'image' }]
    };

    socketRef.current.emit('message:send', payload, (res: any) => {
      if (res?.ok) {
        setComposerExpanded(false);
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', res?.error || 'Failed to send photo');
      }
    });
  };

  const handleSendMockVocal = () => {
    if (!socketRef.current || !activeChannel) return;
    const payload: any = {
      channelId: activeChannel.id,
      content: t('Voice note (0:08)'),
      type: 'media',
      attachments: [{ url: 'https://example.com/audio.mp3', type: 'audio' }]
    };

    socketRef.current.emit('message:send', payload, (res: any) => {
      if (res?.ok) {
        setComposerExpanded(false);
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', res?.error || 'Failed to send voice note');
      }
    });
  };

  const handleSendMockReel = () => {
    if (!socketRef.current || !activeChannel) return;
    const mockReels = [
      { id: '60b9c32f8f1b2c3d4e5f6a70', title: 'Gluten-Free Garlic Bread 🥖', thumbnailUrl: 'https://images.unsplash.com/photo-1573145959986-652d078a4935?w=500&auto=format&fit=crop&q=60' },
      { id: '60b9c32f8f1b2c3d4e5f6a71', title: 'Fluffy GF Pancakes 🥞', thumbnailUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&auto=format&fit=crop&q=60' },
      { id: '60b9c32f8f1b2c3d4e5f6a72', title: 'Ultimate GF Pizza Crust 🍕', thumbnailUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60' }
    ];
    const randomReel = mockReels[Math.floor(Math.random() * mockReels.length)];
    const payload: any = {
      channelId: activeChannel.id,
      content: `${t('Shared a Reel')}: ${randomReel.title}`,
      type: 'reel',
      reelRef: {
        reelId: randomReel.id,
        title: randomReel.title,
        thumbnailUrl: randomReel.thumbnailUrl
      }
    };

    socketRef.current.emit('message:send', payload, (res: any) => {
      if (res?.ok) {
        setComposerExpanded(false);
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', res?.error || 'Failed to share reel');
      }
    });
  };

  const handleInputKeyPress = () => {
    if (!socketRef.current || !activeChannel) return;
    socketRef.current.emit('message:typing', { channelId: activeChannel.id });
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (!socketRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    socketRef.current.emit('reaction:toggle', { messageId, emoji }, (res: any) => {
      if (!res?.ok) {
        console.warn('Reaction toggle failed:', res?.error);
      }
    });
  };

  const handleMessageLongPress = (messageId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setReactionMsgId(messageId);
  };

  const handleMessagePress = (messageId: string) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[messageId] || 0;
    if (now - lastTap < 300) {
      // Double tap detected!
      handleToggleReaction(messageId, '❤️');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      delete lastTapRef.current[messageId];
    } else {
      lastTapRef.current[messageId] = now;
    }
  };

  const handleTogglePin = async (messageId: string) => {
    if (!activeChannel) return;
    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg) return;

    const isCurrentlyPinned = targetMsg.pinned;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const token = await TokenStore.getAccessToken();
      if (isCurrentlyPinned) {
        await axios.delete(`${MSG_SERVICE_URL}/channels/${activeChannel.id}/messages/${messageId}/pin`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, pinned: false } : m))
        );
      } else {
        await axios.post(`${MSG_SERVICE_URL}/channels/${activeChannel.id}/messages/${messageId}/pin`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, pinned: true } : m))
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to toggle pin state');
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!socketRef.current) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

    socketRef.current.emit('message:delete', { messageId }, (res: any) => {
      if (res?.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, deletedAt: new Date().toISOString(), content: null }
              : m
          )
        );
      } else {
        Alert.alert('Error', res?.error || 'Failed to delete message');
      }
    });
  };

  const handleToggleComposerActions = () => {
    setComposerExpanded((prev) => !prev);
  };

  const handleConsultProfile = async (targetUserId?: string) => {
    if (!targetUserId) return;
    setConsultedUser({ _id: targetUserId } as any);
    setConsultingLoading(true);
    try {
      const token = await TokenStore.getAccessToken();
      const res = await axios.get(`${CORE_API_URL}/users/${targetUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedUser = res.data.data;
      if (fetchedUser) {
        setConsultedUser(fetchedUser);
      } else {
        throw new Error('No user data returned');
      }
    } catch (err) {
      console.warn('[community] Failed to fetch profile, using local fallback', err);
      const senderMsg = messages.find(m => m.senderId === targetUserId);
      setConsultedUser({
        _id: targetUserId,
        fullName: senderMsg?.senderName || 'Active Member',
        email: '',
        profileType: targetUserId === user?._id ? user.profileType : 'celiac',
        avatarUrl: senderMsg?.senderAvatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
        streakDays: targetUserId === user?._id ? user.streakDays : 8,
        points: targetUserId === user?._id ? user.points : 640,
        badges: [],
        language: 'en',
        darkMode: false,
        bio: targetUserId === user?._id ? user.bio : 'Gluten-Free food lover! 🌾'
      } as any);
    } finally {
      setConsultingLoading(false);
    }
  };

  const handleStartEdit = (message: any) => {
    setEditingMsgId(message.id);
    setInputText(message.content);
    setReplyingTo(null);
    setComposerExpanded(true);
  };

  const handleScrollToPinned = () => {
    if (pinnedMessages.length === 0) return;
    const lastPinned = pinnedMessages[pinnedMessages.length - 1];
    const index = messages.findIndex((m) => m.id === lastPinned.id);
    if (index !== -1) {
      try {
        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      } catch (_) {}
    }
  };

  // ── 5. Renderers ────────────────────────────────────────────────────────────
  // ── 5. Renderers ────────────────────────────────────────────────────────────
  const renderMessageItem = ({ item }: { item: any }) => {
    const isMe = item.senderId === user?._id;
    const timeInfo = formatStackTime(item.createdAt);

    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        {/* Left Side: Avatar for others, Timestamp for me */}
        {!isMe ? (
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => handleConsultProfile(item.senderId)}
          >
            {item.senderAvatarUrl ? (
              <Image source={{ uri: item.senderAvatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#4D2327' : '#E8A2A9' }]}>
                <Text style={styles.avatarInitials}>
                  {item.senderName ? item.senderName.substring(0, 2).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.timestampStack, { marginHorizontal: 8, alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
            <Text style={styles.timestampStackText}>{timeInfo.datePart}</Text>
            <Text style={styles.timestampStackText}>{timeInfo.timePart}</Text>
          </View>
        )}

        {/* Middle: Bubble & Reactions Container */}
        <View style={{ flex: 1, maxWidth: '65%' }}>
          {/* Sender Name for others */}
          {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}

          <TouchableOpacity
            activeOpacity={0.95}
            onLongPress={() => handleMessageLongPress(item.id)}
            onPress={() => handleMessagePress(item.id)}
            style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble, { maxWidth: '100%' }]}
          >
            {item.replyTo ? (
              <View style={[
                styles.replyRefContainer,
                isMe ? styles.myReplyRefContainer : styles.otherReplyRefContainer
              ]}>
                <Text style={[
                  styles.replyRefSender,
                  isMe ? styles.myReplyRefSender : styles.otherReplyRefSender
                ]}>
                  {t('Replying to')} {item.replyTo.senderName}
                </Text>
                <Text 
                  style={[
                    styles.replyRefText,
                    isMe ? styles.myReplyRefText : styles.otherReplyRefText
                  ]}
                  numberOfLines={1}
                >
                  {item.replyTo.preview || t('[Deleted message]')}
                </Text>
              </View>
            ) : null}

            {item.deletedAt ? (
              <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                {t('[Message deleted]')}
              </Text>
            ) : (
              <>
                {item.content && (item.type === 'text' || (!item.attachments?.length && !item.reelRef)) && (
                  <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                    {item.content}
                  </Text>
                )}

                {item.attachments && item.attachments.filter((a: any) => a.type === 'image').map((att: any, idx: number) => (
                  <View key={`img-${idx}`} style={styles.mediaCard}>
                    <Image 
                      source={{ uri: att.url }} 
                      style={styles.mediaImage} 
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)']}
                      style={styles.mediaOverlay}
                    >
                      <Text style={styles.mediaLabel}>{t('Photo')}</Text>
                      {item.content ? (
                        <Text style={styles.mediaCaption} numberOfLines={2}>
                          {item.content}
                        </Text>
                      ) : null}
                    </LinearGradient>
                  </View>
                ))}

                {item.attachments && item.attachments.filter((a: any) => a.type === 'audio').map((att: any, idx: number) => (
                  <View key={`audio-${idx}`} style={[styles.voiceCard, isMe ? styles.voiceCardMe : styles.voiceCardOther]}>
                    <View style={styles.voiceRow}>
                      <TouchableOpacity 
                        style={[styles.voicePlayButton, isMe ? styles.voicePlayButtonMe : styles.voicePlayButtonOther]}
                        onPress={() => Alert.alert(t('Vocal'), t('Playing vocal message...'))}
                      >
                        <Ionicons name="play" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                      <View style={styles.voiceMeta}>
                        <Text style={styles.voiceTitle}>{t('Voice Note')}</Text>
                        <Text style={styles.voiceSubtitle}>{t('Tap to listen')}</Text>
                        <View style={styles.voiceWave}>
                          <View style={[styles.voiceBar, { height: 8 }]} />
                          <View style={[styles.voiceBar, { height: 16 }]} />
                          <View style={[styles.voiceBar, { height: 12 }]} />
                          <View style={[styles.voiceBar, { height: 20 }]} />
                          <View style={[styles.voiceBar, { height: 14 }]} />
                          <View style={[styles.voiceBar, { height: 6 }]} />
                        </View>
                      </View>
                      <Text style={styles.voiceDuration}>0:08</Text>
                    </View>
                  </View>
                ))}

                {(item.type === 'reel' || item.type === 'reel_share' || item.reelRef) && item.reelRef && (
                  <TouchableOpacity 
                    style={styles.reelCard}
                    onPress={() => Alert.alert(t('Reels'), `${t('Opening Reel')}: ${item.reelRef.title || t('Reel')}`)}
                  >
                    <View style={styles.reelMedia}>
                      {item.reelRef.thumbnailUrl ? (
                        <Image source={{ uri: item.reelRef.thumbnailUrl }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <View style={{ width: '100%', height: '100%', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="videocam" size={24} color="#FFF" />
                        </View>
                      )}
                      <LinearGradient
                        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.55)']}
                        style={styles.reelOverlay}
                      >
                        <Ionicons name="play-circle" size={36} color="#FFFFFF" />
                      </LinearGradient>
                    </View>
                    <View style={styles.reelMeta}>
                      <Text style={styles.reelTitle} numberOfLines={1}>
                        {item.reelRef.title || t('Gluten-Free Recipe Video')}
                      </Text>
                      <Text style={styles.reelSubtitle}>{t('Watch Reel')}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 }}>
              {item.pinned && (
                <Ionicons 
                  name="pin" 
                  size={10} 
                  color={T.textMuted} 
                  style={{ marginHorizontal: 4 }} 
                />
              )}
              {item.editedAt && (
                <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.otherTimeText, { marginHorizontal: 4 }]}>
                  {t('edited')}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Reaction badges aligned correctly */}
          {item.reactionCounts && Object.keys(item.reactionCounts).length > 0 ? (
            <View style={[styles.reactionsContainer, isMe && styles.reactionsContainerMe]}>
              {Object.entries(item.reactionCounts).map(([emoji, count]: any) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.reactionBadge, isMe && styles.myReactionBadge]}
                  onPress={() => handleToggleReaction(item.id, emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text style={styles.reactionCount}>{count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        {/* Right Side: Timestamp for others, Avatar for me */}
        {!isMe ? (
          <View style={[styles.timestampStack, { marginHorizontal: 8, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={styles.timestampStackText}>{timeInfo.datePart}</Text>
            <Text style={styles.timestampStackText}>{timeInfo.timePart}</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => handleConsultProfile(user?._id)}
          >
            {user?.avatar?.url ? (
              <Image source={{ uri: user.avatar.url }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#2E4C1F' : '#C5E1A5' }]}>
                <Text style={styles.avatarInitials}>
                  {user?.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'ME'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const handleJoinExploreCommunity = (community: any) => {
    if (joinedExploreIds.includes(community.id)) return;
    setJoinedExploreIds(prev => [...prev, community.id]);
    
    // Simulate inserting this community space into the list of channels
    const newChan = {
      id: community.id,
      name: community.name,
      description: community.description,
      isPrivate: false,
    };
    setChannels(prev => [...prev, newChan]);
    Alert.alert(t('Joined Space'), `${t('You have joined the community space!')} "${community.name}"`);
  };

  // Render main screen
  if (!activeChannel) {
    // ── View A: Spaces / Community Main Screen (Image 2 style) ──────────────────
    return (
      <View style={styles.spacesContainer}>
        {/* Header */}
        <View style={styles.spacesHeader}>
          <Text style={styles.spacesHeaderTitle}>{t('Community')}</Text>
          <TouchableOpacity onPress={() => Alert.alert(t('Search'), t('Search spaces feature coming soon!'))}>
            <Ionicons name="search-outline" size={24} color={T.text} />
          </TouchableOpacity>
        </View>

        {/* Channels List */}
        <FlatList
          data={channels}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={() => (
            <Text style={styles.spacesSectionTitle}>{t('Your Spaces')}</Text>
          )}
          renderItem={({ item }) => {
            const isDM = item.name && item.name.startsWith('DM-');
            const displayName = getChannelDisplayName(item);
            const visual = getChannelVisual(item.name);
            const iconName = isDM ? 'person-outline' : visual.icon;
            const subtext = isDM ? t('Direct Message') : (item.description || t('Welcome to this space! Tap to read.'));
            const unreadCount = isDM ? 0 : visual.unread;
            return (
              <TouchableOpacity
                style={styles.spaceCard}
                onPress={() => {
                  setActiveChannel(item);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }}
              >
                <View style={[styles.spaceIconContainer, { backgroundColor: T.surfaceAlt }]}>
                  <Ionicons name={iconName as any} size={22} color={T.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.spaceTitle}>{displayName}</Text>
                  <Text style={styles.spaceSubtext} numberOfLines={1}>
                    {subtext}
                  </Text>
                </View>
                {unreadCount > 0 && (
                  <View style={styles.spaceBadge}>
                    <Text style={styles.spaceBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={() => (
            <View style={styles.exploreSection}>
              <Text style={styles.spacesSectionTitle}>{t('Explore Communities')}</Text>
              {exploreCommunities.map((item) => {
                const isJoined = joinedExploreIds.includes(item.id);
                return (
                  <View key={item.id} style={styles.exploreCard}>
                    <View style={[styles.spaceIconContainer, { backgroundColor: T.surfaceAlt }]}>
                      <Ionicons name="chatbubble-outline" size={20} color={T.textMuted} />
                    </View>
                    <View style={{ flex: 1, paddingRight: 80 }}>
                      <Text style={styles.spaceTitle}>{item.name}</Text>
                      <Text style={styles.spaceSubtext} numberOfLines={1}>
                        {item.description}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.exploreJoinButton}
                      onPress={() => handleJoinExploreCommunity(item)}
                      disabled={isJoined}
                    >
                      <Text style={isJoined ? styles.exploreJoinedText : styles.exploreJoinText}>
                        {isJoined ? t('Joined') : t('Join')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        />
      </View>
    );
  }

  // ── View B: Chat View (Image 1 style) ───────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <TouchableOpacity
            style={{ marginHorizontal: 12, paddingVertical: 4 }}
            onPress={() => {
              setActiveChannel(null);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }}
          >
            <Ionicons name={isRTL ? "arrow-forward-outline" : "arrow-back-outline"} size={24} color={T.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {activeChannel?.name?.startsWith('DM-') ? '' : '# '}
            {getChannelDisplayName(activeChannel) || t('Loading...')}
          </Text>
        </View>

        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
          <View
            style={[
              styles.connectionDot,
              { backgroundColor: connected ? '#2ECC71' : '#E74C3C' },
            ]}
          />
          <Text style={styles.headerSubtitle}>{connected ? t('Online') : t('Offline')}</Text>
        </View>
      </View>

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && (
        <View style={styles.pinnedBanner}>
          <Ionicons name="pin" size={16} color={T.green} />
          <Text style={styles.pinnedBannerText} numberOfLines={1}>
            {t('Pinned')}: {pinnedMessages[pinnedMessages.length - 1].content || t('[Attachment]')}
          </Text>
          <TouchableOpacity onPress={handleScrollToPinned}>
            <Text style={styles.pinnedBannerAction}>{t('Jump')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Message Feed */}
      {loadingMessages ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={T.green} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Input keyboard layout */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <View style={styles.inputSection}>
          {/* Reply bar */}
          {replyingTo ? (
            <View style={styles.replyBar}>
              <Text style={styles.replyBarLabel}>
                {t('Replying to')} <Text style={styles.replyBarName}>{replyingTo.senderName}</Text>
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close-circle" size={20} color={T.textMuted} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Edit bar */}
          {editingMsgId ? (
            <View style={styles.replyBar}>
              <Text style={styles.replyBarLabel}>
                {t('✏️ Editing message...')}
              </Text>
              <TouchableOpacity onPress={() => { setEditingMsgId(null); setInputText(''); }}>
                <Ionicons name="close-circle" size={20} color={T.textMuted} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Typing users status */}
          <View style={styles.typingIndicatorBar}>
            {typingUsers.length > 0 ? (
              <Text style={styles.typingText}>
                {typingUsers.join(', ')} {typingUsers.length === 1 ? t('is') : t('are')} {t('typing...')}
              </Text>
            ) : null}
          </View>

          {/* Input controls row (Capsule style matching Image 1) */}
          <View style={styles.inputRowCapsule}>
            <TouchableOpacity style={styles.composerAddButton} onPress={handleToggleComposerActions}>
              <Ionicons name={composerExpanded ? 'close' : 'add'} size={20} color={T.text} />
            </TouchableOpacity>

            <TextInput
              style={[styles.textInputCapsule, { height: Math.max(36, composerHeight) }]}
              placeholder={t('Write a message')}
              placeholderTextColor={T.textMuted}
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                handleInputKeyPress();
              }}
              onFocus={() => setComposerExpanded(true)}
              onBlur={() => {
                if (!inputText.trim()) {
                  setComposerExpanded(false);
                }
              }}
              onContentSizeChange={(event) => {
                const nextHeight = Math.min(120, Math.max(36, event.nativeEvent.contentSize.height));
                setComposerHeight(nextHeight);
              }}
              multiline
            />

            {hasText ? (
              <TouchableOpacity style={styles.sendIconOnly} onPress={handleSendMessage}>
                <LinearGradient
                  colors={[T.green, isDark ? '#1E7A4D' : '#2ECC71']}
                  style={styles.sendIconGradient}
                >
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.micButton} onPress={handleSendMockVocal}>
                <Ionicons name="mic" size={20} color={T.text} />
              </TouchableOpacity>
            )}
          </View>

          {composerExpanded ? (
            <View style={styles.composerActionsRow}>
              <TouchableOpacity style={styles.composerActionCard} onPress={handleSendMockPhoto}>
                <View style={styles.composerActionIconWrap}>
                  <Ionicons name="camera" size={18} color={T.text} />
                </View>
                <Text style={styles.composerActionText}>{t('Photo')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.composerActionCard} onPress={handleSendMockVocal}>
                <View style={styles.composerActionIconWrap}>
                  <Ionicons name="mic" size={18} color={T.text} />
                </View>
                <Text style={styles.composerActionText}>{t('Voice')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.composerActionCard} onPress={handleSendMockReel}>
                <View style={styles.composerActionIconWrap}>
                  <Ionicons name="play" size={18} color={T.text} />
                </View>
                <Text style={styles.composerActionText}>{t('Reel')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      {/* Instagram-Style Context Menu Modal */}
      <Modal visible={!!reactionMsgId} transparent animationType="fade">
        <TouchableOpacity
          style={styles.reactionBackdrop}
          activeOpacity={1}
          onPress={() => setReactionMsgId(null)}
        >
          <View style={styles.reactionMenuContainer}>
            {/* Emojis Pick Row */}
            <View style={styles.emojiPickerRow}>
              {reactionEmojis.map((emoji) => {
                const hasReacted = selectedMsg?.reactionCounts && selectedMsg.reactionCounts[emoji] > 0;
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.emojiButton, hasReacted && { backgroundColor: T.greenLight }]}
                    onPress={() => {
                      if (reactionMsgId) {
                        handleToggleReaction(reactionMsgId, emoji);
                        setReactionMsgId(null);
                      }
                    }}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Menu Actions List */}
            <View style={styles.contextActionsList}>
              <TouchableOpacity
                style={styles.contextActionItem}
                onPress={() => {
                  if (selectedMsg) {
                    setReplyingTo(selectedMsg);
                    setReactionMsgId(null);
                  }
                }}
              >
                <Ionicons name="arrow-undo-outline" size={20} color={T.text} />
                <Text style={styles.contextActionText}>{t('Reply')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contextActionItem}
                onPress={() => {
                  if (selectedMsg) {
                    Clipboard.setString(selectedMsg.content || '');
                    setReactionMsgId(null);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                  }
                }}
              >
                <Ionicons name="copy-outline" size={20} color={T.text} />
                <Text style={styles.contextActionText}>{t('Copy Text')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contextActionItem}
                onPress={() => {
                  if (selectedMsg) {
                    setReactionMsgId(null);
                    handleConsultProfile(selectedMsg.senderId);
                  }
                }}
              >
                <Ionicons name="person-outline" size={20} color={T.text} />
                <Text style={styles.contextActionText}>{t('Visit Profile')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contextActionItem}
                onPress={() => {
                  if (selectedMsg) {
                    handleTogglePin(selectedMsg.id);
                    setReactionMsgId(null);
                  }
                }}
              >
                <Ionicons name="pin-outline" size={20} color={T.text} />
                <Text style={styles.contextActionText}>
                  {selectedMsg?.pinned ? t('Unpin Message') : t('Pin Message')}
                </Text>
              </TouchableOpacity>

              {selectedMsg?.senderId === user?._id && !selectedMsg?.deletedAt && (
                <>
                  <TouchableOpacity
                    style={styles.contextActionItem}
                    onPress={() => {
                      if (selectedMsg) {
                        handleStartEdit(selectedMsg);
                        setReactionMsgId(null);
                      }
                    }}
                  >
                    <Ionicons name="pencil-outline" size={20} color={T.text} />
                    <Text style={styles.contextActionText}>{t('Edit Message')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.contextActionItem}
                    onPress={() => {
                      if (selectedMsg) {
                        handleDeleteMessage(selectedMsg.id);
                        setReactionMsgId(null);
                      }
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color={T.red} />
                    <Text style={[styles.contextActionText, styles.contextActionTextDanger]}>
                      {t('Delete Message')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 🔐 ConsultProfile Secure View Modal */}
      <Modal visible={!!consultedUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.consultProfileCard, { backgroundColor: T.surface }]}>
            {/* Header */}
            <View style={styles.consultHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="lock-closed" size={16} color={T.green} />
                <Text style={[styles.consultTitle, { color: T.text }]}>{t('ConsultProfile')}</Text>
              </View>
              <TouchableOpacity onPress={() => setConsultedUser(null)}>
                <Ionicons name="close-circle" size={24} color={T.textMuted} />
              </TouchableOpacity>
            </View>

            {consultingLoading ? (
              <View style={{ padding: 40, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={T.green} />
              </View>
            ) : consultedUser ? (
              <ScrollView contentContainerStyle={styles.consultScroll} showsVerticalScrollIndicator={false}>
                {/* Avatar Wrap */}
                <View style={styles.consultAvatarSection}>
                  <View style={styles.consultAvatarWrap}>
                    <Image
                      source={{ uri: consultedUser.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop' }}
                      style={styles.consultAvatar}
                    />
                    <View style={[styles.consultCheckBadge, consultedUser.profileType?.startsWith('pro_') && { backgroundColor: T.red }]}>
                      <Ionicons 
                        name={consultedUser.profileType?.startsWith('pro_') ? "ribbon" : "checkmark-circle"}
                        size={14} 
                        color="#FFFFFF" 
                      />
                    </View>
                  </View>
                  <Text style={[styles.consultName, { color: T.text }]}>{consultedUser.fullName}</Text>
                  <View style={[styles.consultRoleBadge, consultedUser.profileType?.startsWith('pro_') ? { backgroundColor: T.redLight } : { backgroundColor: T.greenLight }]}>
                    <Text style={[styles.consultRoleText, consultedUser.profileType?.startsWith('pro_') ? { color: T.red } : { color: T.green }]}>
                      {consultedUser.profileType === 'pro_commerce'
                        ? t('Pro Partner')
                        : consultedUser.profileType === 'pro_health'
                        ? t('Pro Contributor')
                        : t('Gluten-Free Warrior')}
                    </Text>
                  </View>
                  <Text style={[styles.consultBio, { color: T.textMuted }]}>
                    {consultedUser.bio || t('Gluten-Free community member 🌿')}
                  </Text>
                </View>

                {/* Score and Stats row */}
                <View style={styles.consultStatsRow}>
                  <View style={[styles.consultStatCard, { backgroundColor: T.surfaceAlt }]}>
                    <Ionicons name="star" size={20} color="#FFD700" />
                    <Text style={[styles.consultStatVal, { color: T.text }]}>{consultedUser.points || 0}</Text>
                    <Text style={[styles.consultStatLabel, { color: T.textMuted }]}>{t('XP Score')}</Text>
                  </View>

                  <View style={[styles.consultStatCard, { backgroundColor: T.surfaceAlt }]}>
                    <Ionicons name="flame" size={20} color="#FF5722" />
                    <Text style={[styles.consultStatVal, { color: T.text }]}>{consultedUser.streakDays || 0}</Text>
                    <Text style={[styles.consultStatLabel, { color: T.textMuted }]}>{t('Streak Days')}</Text>
                  </View>
                </View>

                {/* Badges Section */}
                <Text style={[styles.consultSectionLabel, { color: T.text }]}>{t('Badges')}</Text>
                <View style={styles.consultBadgesGrid}>
                  {(consultedUser.profileType?.startsWith('pro_') ? PRO_BADGES : CELIAC_BADGES).map((badge) => {
                    const points = consultedUser.points || 0;
                    const isUnlocked = points >= badge.pointsRequired;
                    return (
                      <View 
                        key={badge.id} 
                        style={[
                          styles.consultBadgeCard, 
                          { backgroundColor: T.surfaceAlt },
                          !isUnlocked && { opacity: 0.5 }
                        ]}
                      >
                        <View style={[styles.consultBadgeIconBg, { backgroundColor: badge.bgColor || 'rgba(0,0,0,0.05)' }]}>
                          <Ionicons 
                            name={isUnlocked ? "medal" : "lock-closed"} 
                            size={28} 
                            color={isUnlocked ? (badge.color || '#FFD700') : T.textMuted} 
                          />
                        </View>
                        <Text style={[styles.consultBadgeName, { color: T.text }]} numberOfLines={1}>
                          {t(badge.name)}
                        </Text>
                        <Text style={[styles.consultBadgeDesc, { color: T.textMuted }]} numberOfLines={2}>
                          {t(badge.description)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}
