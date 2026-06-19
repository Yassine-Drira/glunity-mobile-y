import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Platform, Alert, Animated, Dimensions, Clipboard, LayoutAnimation, UIManager } from 'react-native';
import http from '../../../core/network/http.client';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../auth/state/auth.context';
import { useSocket } from '../../../shared/context/socket.context';
import { useTheme } from '../../../shared/context/theme.context';
import { useLanguage } from '../../../shared/context/language.context';
import { TokenStore } from '../../../core/storage/secure-store';
import { API_BASE_URL } from '../../../core/config/api.config';
import messagingHttp from '../../../core/network/messaging-http.client';
import messagingEvents from '../../../shared/utils/messagingEvents';
import { ChatCacheService } from '../services/chat-cache.service';

// Keep for legacy usages that don't go through the intercepted clients
const CORE_API_URL = API_BASE_URL;
const MSG_SERVICE_URL = API_BASE_URL.replace(':5000', ':5001');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Dynamic imports helper
let ExpoAV: any = null;
try { ExpoAV = require('expo-av'); } catch (e) { ExpoAV = null; }

let ImageManipulator: any = null;
try { ImageManipulator = require('expo-image-manipulator'); } catch (e) { ImageManipulator = null; }

export function useCommunityChat(initialChannel: any, initialChannelId: string | null, navigation: any) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { theme: T } = useTheme();
  const { t } = useLanguage();

  const safeGoBack = useCallback(() => {
    if (navigation && typeof navigation.goBack === 'function') {
      if (navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        if (typeof navigation.navigate === 'function') {
          navigation.navigate('CommunityChat', {
            initialChannel: null,
            initialChannelId: null,
            channelId: null,
          });
        }
      }
    }
  }, [navigation]);

  const [channel, setChannel] = useState<any>(initialChannel || null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');

  // Pagination states
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Audio recording
  const [isRecording, setIsRecordingState] = useState(false);
  const isRecordingRef = useRef(false);
  const setIsRecording = (val: boolean) => {
    isRecordingRef.current = val;
    setIsRecordingState(val);
  };

  const [recordingInstance, setRecordingInstanceState] = useState<any>(null);
  const recordingInstanceRef = useRef<any>(null);
  const setRecordingInstance = (val: any) => {
    recordingInstanceRef.current = val;
    setRecordingInstanceState(val);
  };

  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const isPreparingRecordingRef = useRef(false);
  const shouldStopRecordingRef = useRef(false);
  const pressStartRef = useRef(0);

  const [playingId, setPlayingId] = useState<string | null>(null);

  // Group Details & Modals states
  const [menuVisible, setMenuVisible] = useState(false);
  const [membersSheetVisible, setMembersSheetVisible] = useState(false);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [confirmClearVisible, setConfirmClearVisible] = useState(false);
  const [confirmDeleteDMVisible, setConfirmDeleteDMVisible] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [deletingDM, setDeletingDM] = useState(false);
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);

  // User Profile Bottom Sheet states
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [profileSheetVisible, setProfileSheetVisible] = useState(false);

  // Audio playback references
  const activeSoundRef = useRef<any>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Members lists
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [showAddList, setShowAddList] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  // Editing Group profile info
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoUri, setEditPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Message contexts
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);

  // Animation values
  const popAnim = useRef(new Animated.Value(0)).current;
  const [popEmoji, setPopEmoji] = useState<string | null>(null);
  const lastTapRef = useRef<{ id: string | null; time: number }>({ id: null, time: 0 });
  const listRef = useRef<any>(null);
  const shouldScrollToEndRef = useRef(false);
  // Tracks real message IDs already confirmed by the send ack callback.
  // Prevents the subsequent message:new socket event from re-inserting the same message.
  const confirmedIdsRef = useRef<Set<string>>(new Set());

  const reactionEmojis = useMemo(() => ['❤️', '👍', '😂', '😮', '😢', '🔥', '🎉', '✅'], []);

  const isAdmin = useMemo(() => {
    if (!channel || !user) return false;
    if (channel.ownerId && String(channel.ownerId) === String(user._id)) return true;
    if (channel.createdBy && String(channel.createdBy) === String(user._id)) return true;
    if (Array.isArray(channel.admins) && channel.admins.some((a: any) => String(a) === String(user._id))) return true;
    const parts = channel.participants || channel.members;
    if (Array.isArray(parts)) {
      const me = parts.find((p: any) => (p && (p._id || p.id)) && String(p._id || p.id) === String(user._id));
      if (me && (me.role === 'admin' || me.role === 'owner')) return true;
    }
    return false;
  }, [channel, user]);

  const isCreator = useMemo(() => {
    if (!channel || !user) return false;
    if (channel.ownerId && String(channel.ownerId) === String(user._id)) return true;
    if (channel.createdBy && String(channel.createdBy) === String(user._id)) return true;
    return false;
  }, [channel, user]);

  const hasChanges = useMemo(() => {
    if (!channel) return false;
    const nameChanged = (editName || '').trim() !== (channel?.name || '').trim();
    const currentAvatar = channel?.avatarUrl || channel?.icon || '';
    const photoChanged = !!editPhotoUri && String(editPhotoUri) !== String(currentAvatar);
    return nameChanged || photoChanged;
  }, [channel, editName, editPhotoUri]);

  // Sync edits
  useEffect(() => {
    setEditName(channel?.name || '');
    setEditPhotoUri(channel?.avatarUrl || channel?.icon || null);
  }, [channel]);

  // Fetch channel details if only ID is provided
  useEffect(() => {
    let mounted = true;
    async function loadChannel() {
      if (initialChannel) {
        setChannel(initialChannel);
        return;
      }
      if (!initialChannelId) return;
      try {
        const res = await http.get(`/channels/${initialChannelId}`);
        if (mounted) setChannel(res.data?.data || res.data || null);
      } catch (err) {
        try {
          const listRes = await http.get('/channels');
          const list = listRes.data?.data || listRes.data || [];
          const found = Array.isArray(list) ? list.find((c: any) => String(c._id || c.id) === String(initialChannelId)) : null;
          if (mounted && found) setChannel(found);
        } catch (ee) { }
      }
    }
    loadChannel();
    return () => { mounted = false; };
  }, [initialChannel, initialChannelId]);

  const markAsRead = useCallback(async (channelId: string, lastMsgId: string) => {
    if (!channelId || !lastMsgId || String(channelId).startsWith('local-')) return;
    try {
      await messagingHttp.post(`/channels/${channelId}/read`, { lastReadMsgId: lastMsgId });
    } catch (err) {
      console.warn('[community] Failed to persist read status', err);
    }
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (loading || loadingMore || !hasMore || !channel) return;
    const targetId = channel.id || channel._id;
    if (typeof targetId === 'string' && targetId.startsWith('local-')) return;
    if (messages.length === 0) return;

    const oldestMsg = messages[0];
    const cursor = oldestMsg._id || oldestMsg.id;
    if (!cursor) return;

    setLoadingMore(true);
    try {
      const res = await messagingHttp.get(`/channels/${targetId}/messages`, {
        params: {
          limit: 30,
          cursor,
          direction: 'before',
        },
      });

      const older = res.data?.data || [];
      if (older.length < 30) {
        setHasMore(false);
      }

      if (older.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id || m.id));
          const uniqueOlder = older.filter((m: any) => !existingIds.has(m._id || m.id));
          return [...uniqueOlder, ...prev];
        });
      }
    } catch (err) {
      console.warn('[community] Failed to load older messages', err);
    } finally {
      setLoadingMore(false);
    }
  }, [channel, messages, loading, loadingMore, hasMore]);

  // Fetch Message History with Cache-Aside strategy
  useEffect(() => {
    if (!channel) return;
    let mounted = true;

    async function loadHistory() {
      const targetId = channel.id || channel._id;
      if (typeof targetId === 'string' && targetId.startsWith('local-')) {
        setLoading(false);
        return;
      }

      // Reset hasMore/loadingMore when initial history loads
      setHasMore(true);
      setLoadingMore(false);

      // 1. Try to load from cache first for instant UI response
      try {
        const cached = await ChatCacheService.getMessages(targetId);
        if (mounted && cached && cached.length > 0) {
          const filtered = cached.filter((m: any) => !m.status || m.status === 'sent');
          setMessages(filtered);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 60);
        }
      } catch (err) {
        console.warn('[community] failed to load cached messages', err);
      }

      setLoading(true);
      try {
        // 2. Fetch fresh messages from the backend (uses auto-refresh interceptor)
        const res = await messagingHttp.get(`/channels/${targetId}/messages?limit=60`);
        if (!mounted) return;

        const fresh = res.data?.data || [];
        setMessages(fresh);
        if (fresh.length < 60) {
          setHasMore(false);
        }

        // 3. Update the local cache
        await ChatCacheService.saveMessages(targetId, fresh);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);

        if (fresh.length > 0) {
          const lastMsg = fresh[fresh.length - 1];
          const lastMsgId = lastMsg.id || lastMsg._id;
          if (lastMsgId) {
            markAsRead(targetId, lastMsgId);
          }
        }
      } catch (err) {
        console.warn('[community] loadHistory failed', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();

    // Mark channel as read
    try {
      messagingEvents.emit('channel:opened', channel.id || channel._id);
    } catch (e) { }

    return () => { mounted = false; };
  }, [channel, markAsRead]);

  // Synchronize state mutations (new WS messages, reactions, edits, deletions) to cache
  useEffect(() => {
    if (!channel || messages.length === 0) return;
    const targetId = channel.id || channel._id;
    ChatCacheService.saveMessages(targetId, messages);
  }, [messages, channel]);

  // Handle Channel edits from external events
  useEffect(() => {
    const handler = (updated: any) => {
      if (!updated) return;
      if ((updated.id || updated._id) && channel && String(updated.id || updated._id) === String(channel.id || channel._id)) {
        setChannel((prev: any) => ({ ...(prev || {}), ...(updated || {}) }));
        if (membersSheetVisible) fetchMembers();
      }
    };
    messagingEvents.on('channel:updated', handler);
    return () => { messagingEvents.off('channel:updated', handler); };
  }, [channel, membersSheetVisible]);

  // Websocket Room Listener bindings
  useEffect(() => {
    if (!channel || !socket) return;

    const targetId = channel.id || channel._id;
    if (typeof targetId === 'string' && !targetId.startsWith('local-')) {
      socket.emit('channel:join', { channelId: targetId });
    }

    const handleNewMessage = ({ message }: any) => {
      const msgChannelId = message.channelId?.toString?.() || message.channelId;
      const thisChannelId = (channel.id || channel._id)?.toString?.() || (channel.id || channel._id);
      if (msgChannelId !== thisChannelId) return;

      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }

      setMessages((prev) => {
        const realId = String(message.id || message._id || '');

        // Already in list (exact id or _id match) — deduplicate
        if (prev.some(m => (m.id || m._id) === realId)) return prev;

        // The send callback already swapped this temp → real message; skip
        if (confirmedIdsRef.current.has(realId)) {
          confirmedIdsRef.current.delete(realId); // free memory
          return prev;
        }

        // Own message: replace the best-matching temp- placeholder.
        if (String(message.senderId) === String(user?._id)) {
          const now = Date.now();
          let bestIdx = -1;
          let bestScore = -1;
          prev.forEach((m, idx) => {
            if (!String(m.id || '').startsWith('temp-')) return;
            let score = 0;
            if (m.content === message.content) score += 2;
            const age = now - parseInt(String(m.id || '0').replace('temp-', '') || '0', 10);
            if (age > 0) score += 1;
            if (score > bestScore) { bestScore = score; bestIdx = idx; }
          });
          if (bestIdx !== -1) {
            const next = [...prev];
            next[bestIdx] = { ...message, status: 'sent' };
            return next;
          }
        }

        return [...prev, message];
      });

      // Mark the incoming message as read if it is from someone else
      if (String(message.senderId) !== String(user?._id)) {
        markAsRead(thisChannelId, message.id || message._id);
        setTypingUser(null);
      }

      shouldScrollToEndRef.current = true;
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    };

    const handleReactionUpdated = ({ messageId, emoji, count }: any) => {
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setMessages((prev) => prev.map((m) => {
        // Match by either id or _id — server emits `id`, local messages may have `_id`
        if (String(m.id || m._id || '') !== String(messageId)) return m;
        const updated = { ...m };
        updated.reactionCounts = { ...(updated.reactionCounts || {}) };
        if (count > 0) updated.reactionCounts[emoji] = count;
        else delete updated.reactionCounts[emoji];
        return updated;
      }));
    };

    const handleMessageEdited = ({ messageId, content, editedAt }: any) => {
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setMessages((prev) => prev.map((m) =>
        String(m.id || m._id || '') === String(messageId) ? { ...m, content, editedAt } : m
      ));
    };

    const handleMessageDeleted = ({ messageId }: any) => {
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setMessages((prev) => prev.map((m) =>
        String(m.id || m._id || '') === String(messageId)
          ? { ...m, deletedAt: new Date().toISOString(), content: null, reactionCounts: {} }
          : m
      ));
    };

    const handleMessagePinned = ({ messageId, pinned, pinnedMessages }: any) => {
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setMessages((prev) => prev.map((m) => (m.id === messageId || m._id === messageId) ? { ...m, pinned } : m));
      if (pinnedMessages) {
        setChannel((prev: any) => prev ? { ...prev, pinnedMessages } : prev);
      }
    };

    const handleMessageUnpinned = ({ messageId, pinned, pinnedMessages }: any) => {
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setMessages((prev) => prev.map((m) => (m.id === messageId || m._id === messageId) ? { ...m, pinned: false } : m));
      if (pinnedMessages) {
        setChannel((prev: any) => prev ? { ...prev, pinnedMessages } : prev);
      }
    };

    const handleChannelDeleted = ({ channelId }: any) => {
      const thisChannelId = (channel.id || channel._id)?.toString?.() || (channel.id || channel._id);
      if (String(channelId) === String(thisChannelId)) {
        Alert.alert(t('Deleted'), t('This conversation has been deleted.'));
        safeGoBack();
      }
    };

    const handleChannelCleared = ({ channelId }: any) => {
      const thisChannelId = (channel.id || channel._id)?.toString?.() || (channel.id || channel._id);
      if (String(channelId) === String(thisChannelId)) {
        setMessages([]);
        setChannel((prev: any) => prev ? { ...prev, lastMessage: null, pinnedMessages: [] } : prev);
      }
    };

    const handleChannelRead = ({ userId, lastReadAt }: any) => {
      setChannel((prev: any) => {
        if (!prev) return prev;
        const participants = (prev.participants || []).map((p: any) => {
          const pId = p.userId?._id || p.userId || p._id || p.id;
          if (String(pId) === String(userId)) {
            return { ...p, lastReadAt: lastReadAt ? new Date(lastReadAt) : new Date() };
          }
          return p;
        });
        return { ...prev, participants };
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('reaction:updated', handleReactionUpdated);
    socket.on('message:edited', handleMessageEdited);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('message:pinned', handleMessagePinned);
    socket.on('message:unpinned', handleMessageUnpinned);
    socket.on('channel:deleted', handleChannelDeleted);
    socket.on('channel:cleared', handleChannelCleared);
    socket.on('channel:read', handleChannelRead);

    return () => {
      if (typeof targetId === 'string' && !targetId.startsWith('local-')) {
        socket.emit('channel:leave', { channelId: targetId });
      }
      socket.off('message:new', handleNewMessage);
      socket.off('reaction:updated', handleReactionUpdated);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('message:pinned', handleMessagePinned);
      socket.off('message:unpinned', handleMessageUnpinned);
      socket.off('channel:deleted', handleChannelDeleted);
      socket.off('channel:cleared', handleChannelCleared);
      socket.off('channel:read', handleChannelRead);
    };
  }, [channel, socket, markAsRead, user?._id]);

  // Clean up any playing audio and recording timers when the hook unmounts
  useEffect(() => {
    return () => {
      if (activeSoundRef.current) {
        activeSoundRef.current.stopAsync().catch(() => { });
        activeSoundRef.current.unloadAsync().catch(() => { });
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Emitting typing events (throttled client-side to prevent socket spam)
  useEffect(() => {
    if (!input.trim() || !socket || !channel) return;
    const targetId = channel.id || channel._id;
    if (typeof targetId === 'string' && targetId.startsWith('local-')) return;

    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      socket.emit('message:typing', { channelId: targetId });
    }
  }, [input, socket, channel]);

  // Listen for other participants typing
  useEffect(() => {
    if (!channel || !socket) return;
    const targetId = channel.id || channel._id;
    let timeoutInstance: any = null;

    const handleTyping = (data: any) => {
      if (String(data.channelId) === String(targetId) && String(data.userId) !== String(user?._id)) {
        setTypingUser(data.fullName || t('Someone'));
        if (timeoutInstance) clearTimeout(timeoutInstance);
        timeoutInstance = setTimeout(() => setTypingUser(null), 3000);
      }
    };

    socket.on('message:typing', handleTyping);
    return () => {
      socket.off('message:typing', handleTyping);
      if (timeoutInstance) clearTimeout(timeoutInstance);
    };
  }, [channel, socket, user, t]);

  // --- REST Operations & Actions ---

  const handleSend = useCallback((customContent?: string, retryTempId?: string) => {
    const textToSend = customContent !== undefined ? customContent : input.trim();
    if (!textToSend || !socket || !channel) return;

    const targetId = channel.id || channel._id;
    if (typeof targetId === 'string' && targetId.startsWith('local-')) {
      Alert.alert(t('Please wait'), t('The channel is still initializing.'));
      return;
    }

    if (editingMsgId) {
      socket.emit('message:edit', { messageId: editingMsgId, content: textToSend }, (res: any) => {
        if (res?.ok) {
          setMessages((prev) => prev.map(m => String(m.id || m._id) === String(editingMsgId) ? { ...m, content: textToSend, editedAt: new Date().toISOString() } : m));
          setEditingMsgId(null);
          setInput('');
        } else {
          Alert.alert(t('Error'), res?.error || t('Failed to edit message'));
        }
      });
      return;
    }

    const tempId = retryTempId || `temp-${Date.now()}`;

    // Clear the input field immediately to allow fast consecutive typing
    if (!retryTempId) {
      setInput('');
    }

    const optimisticMsg = {
      id: tempId,
      content: textToSend,
      senderId: user?._id,
      senderName: user?.fullName,
      senderAvatarUrl: user?.avatarUrl,
      createdAt: new Date().toISOString(),
      status: 'sending', // 'sending' | 'sent' | 'failed'
    };

    // Optimistically insert or update sending message
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setMessages((prev) => {
      const exists = prev.some(m => m.id === tempId);
      if (exists) {
        return prev.map(m => m.id === tempId ? optimisticMsg : m);
      }
      return [...prev, optimisticMsg];
    });
    shouldScrollToEndRef.current = true;
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);

    const payload: any = {
      channelId: channel.id || channel._id,
      content: textToSend,
      type: 'text',
    };
    // Include reply context when set
    if (replyingTo) {
      payload.replyTo = { messageId: replyingTo.id, senderName: replyingTo.senderName };
    }

    // Safety timeout: if server doesn't respond in 8 seconds, mark as failed
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (Platform.OS !== 'web') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        setMessages((prev) => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
      }
    }, 8000);

    socket.emit('message:send', payload, (res: any) => {
      clearTimeout(timeout);
      if (resolved) return;
      resolved = true;

      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      if (res?.ok) {
        const realId = String(res.data?.id || res.data?._id || '');
        // Clear reply context now that the message was sent successfully
        setReplyingTo(null);
        setMessages((prev) => {
          // handleNewMessage already swapped temp- with the real message — just remove the ghost temp
          if (realId && prev.some(m => (m.id || m._id) === realId)) {
            return prev.filter(m => m.id !== tempId);
          }
          // Socket event hasn't arrived yet — do the swap ourselves AND mark the ID
          // as confirmed so that when message:new fires, it won't re-insert it.
          if (realId) confirmedIdsRef.current.add(realId);
          return prev.map(m => m.id === tempId ? { ...res.data, status: 'sent' } : m);
        });
        try { messagingEvents.emit('message:new', res.data); } catch (e) { }
      } else {
        setMessages((prev) => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
      }
    });
  }, [input, editingMsgId, socket, channel, user, t]);

  const handleRetrySend = useCallback((message: any) => {
    if (!message || message.status !== 'failed') return;
    handleSend(message.content, message.id);
  }, [handleSend]);

  const handleToggleReaction = useCallback((messageId: string, emoji: string) => {
    if (!socket) return;

    // Pop animation — visual feedback only, no local count change
    setPopEmoji(emoji);
    popAnim.setValue(0);
    Animated.sequence([
      Animated.spring(popAnim, { toValue: 1, friction: 6, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(popAnim, { toValue: 0, duration: 360, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => setPopEmoji(null));

    // Capture snapshot for rollback if server rejects
    let previousReactions: any = null;
    setMessages((prev) => prev.map((m) => {
      if (String(m.id || m._id || '') !== String(messageId)) return m;
      previousReactions = m.reactionCounts ? { ...m.reactionCounts } : {};
      return m; // Do NOT mutate locally — server will broadcast the true count
    }));

    socket.emit('reaction:toggle', { messageId, emoji }, (res: any) => {
      if (!res?.ok) {
        console.warn('Reaction toggle failed', res?.error);
        // Rollback to captured state
        setMessages((prev) => prev.map((m) => {
          if (String(m.id || m._id || '') !== String(messageId)) return m;
          return { ...m, reactionCounts: previousReactions };
        }));
        Alert.alert(t('Error'), res?.error || t('Failed to update reaction'));
      }
      // On success: reaction:updated socket event will set the true count
    });
  }, [socket, popAnim, t]);

  const handleTogglePin = useCallback(async (messageId: string) => {
    if (!channel) return;
    try {
      const targetId = channel.id || channel._id;
      const isPinned = channel.pinnedMessages && channel.pinnedMessages.some((p: any) => String(p.messageId) === String(messageId));

      if (isPinned) {
        const res = await messagingHttp.delete(`/channels/${targetId}/messages/${messageId}/pin`);
        const updatedPinned = res.data?.pinnedMessages;
        setMessages((prev) => prev.map((m) => (m.id === messageId || m._id === messageId) ? { ...m, pinned: false } : m));
        if (updatedPinned) {
          setChannel((prev: any) => prev ? { ...prev, pinnedMessages: updatedPinned } : prev);
        }
      } else {
        const res = await messagingHttp.post(`/channels/${targetId}/messages/${messageId}/pin`, {});
        const updatedPinned = res.data?.pinnedMessages;
        setMessages((prev) => prev.map((m) => (m.id === messageId || m._id === messageId) ? { ...m, pinned: true } : m));
        if (updatedPinned) {
          setChannel((prev: any) => prev ? { ...prev, pinnedMessages: updatedPinned } : prev);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || err?.response?.data?.message || 'Failed to toggle pin');
    }
  }, [channel, messages]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    if (!socket) return;
    socket.emit('message:delete', { messageId }, (res: any) => {
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      if (res?.ok) {
        setMessages((prev) => prev.map((m) => String(m.id || m._id) === String(messageId) ? { ...m, deletedAt: new Date().toISOString(), content: null, reactionCounts: {} } : m));
      } else {
        Alert.alert('Error', res?.error || 'Failed to delete message');
      }
    });
    setReactionMsgId(null);
  }, [socket]);

  // Audio Recording Operations
  const startRecording = useCallback(async () => {
    if (!ExpoAV) {
      Alert.alert('Audio not available', 'Audio module is not installed in this runtime.');
      return;
    }
    // If we are already recording or in preparation, a pressIn is interpreted as a tap-to-stop toggle
    if (isRecordingRef.current || recordingInstanceRef.current || isPreparingRecordingRef.current) {
      await stopRecordingAndSend();
      return;
    }
    try {
      pressStartRef.current = Date.now();
      isPreparingRecordingRef.current = true;
      shouldStopRecordingRef.current = false;
      setRecordingDuration(0);

      const { status } = await ExpoAV.Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('Permission Denied ❌'), t('You must allow microphone access to record audio.'));
        isPreparingRecordingRef.current = false;
        return;
      }

      await ExpoAV.Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new ExpoAV.Audio.Recording();
      await recording.prepareToRecordAsync(ExpoAV.Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);

      // Check if user released while preparing
      if (shouldStopRecordingRef.current) {
        await recording.stopAndUnloadAsync().catch(() => {});
        isPreparingRecordingRef.current = false;
        return;
      }

      await recording.startAsync();
      setRecordingInstance(recording);
      setIsRecording(true);
      isPreparingRecordingRef.current = false;

      // Start timer
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('startRecording failed', err);
      isPreparingRecordingRef.current = false;
      setIsRecording(false);
    }
  }, [t]);

  const cancelRecording = useCallback(async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    isPreparingRecordingRef.current = false;
    shouldStopRecordingRef.current = false;

    const instance = recordingInstanceRef.current;
    if (instance) {
      await instance.stopAndUnloadAsync().catch(() => {});
    }

    setIsRecording(false);
    setRecordingInstance(null);
    setRecordingDuration(0);
  }, []);

  // ── Pick image / video from library and send as media message ──────────────
  const pickMediaAndSend = useCallback(async () => {
    if (!socket || !channel) return;
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert(t('Permission Denied ❌'), t('Media library access is required.'));
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // images + videos
        allowsMultipleSelection: false,
        quality: 0.85,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      const uri = asset.uri;
      if (!uri) return;

      const token = await TokenStore.getAccessToken();
      const targetId = channel.id || channel._id;
      const filename = uri.split('/').pop() || 'media';
      const isVideo = asset.type === 'video' || /\.(mp4|webm|mov)$/i.test(filename);
      const mimeType = isVideo ? (filename.endsWith('.webm') ? 'video/webm' : 'video/mp4') : (filename.endsWith('.png') ? 'image/png' : 'image/jpeg');

      // Optimistic placeholder
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        id: tempId,
        senderId: user?._id,
        senderName: user?.fullName,
        senderAvatarUrl: user?.avatarUrl,
        createdAt: new Date().toISOString(),
        type: 'media',
        status: 'sending',
        attachments: [{ url: uri, type: isVideo ? 'video' : 'image', filename }],
      };
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setMessages((prev) => [...prev, optimistic]);
      shouldScrollToEndRef.current = true;
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);

      // Build multipart form
      const form = new FormData();
      if (Platform.OS === 'web' || uri.startsWith('blob:')) {
        const blobResp = await fetch(uri);
        const blob = await blobResp.blob();
        const fileObj: any = typeof File !== 'undefined'
          ? new File([blob], filename, { type: mimeType })
          : blob;
        form.append('file', fileObj);
      } else {
        form.append('file', { uri, name: filename, type: mimeType } as any);
      }

      // Upload to messaging-service channel upload endpoint
      const uploadRes = await http.post(`${MSG_SERVICE_URL}/channels/${targetId}/upload`, form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const body = uploadRes.data;
      // The upload endpoint creates the message automatically and returns it
      const serverMsg = body?.data?.message || body?.data;
      if (serverMsg) {
        if (Platform.OS !== 'web') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        setMessages((prev) => {
          const realId = String(serverMsg.id || serverMsg._id || '');
          if (realId && prev.some((m) => String(m.id || m._id) === realId)) {
            // Socket event already swapped the temp — just clean up the temp ghost if still there
            return prev.filter((m) => m.id !== tempId);
          }
          // Mark as confirmed so the subsequent message:new socket event skips it
          if (realId) confirmedIdsRef.current.add(realId);
          return prev.map((m) => (m.id === tempId ? { ...serverMsg, status: 'sent' } : m));
        });
        try { messagingEvents.emit('message:new', serverMsg); } catch (e) { }
        shouldScrollToEndRef.current = true;
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
      } else {
        // Mark as sent even without full payload
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' } : m)));
      }
    } catch (err: any) {
      console.warn('[pickMediaAndSend] failed', err);
      Alert.alert(t('Error'), err?.message || t('Failed to send media'));
      // Mark optimistic message as failed
      setMessages((prev) => prev.map((m) =>
        typeof m.id === 'string' && m.id.startsWith('temp-') && m.status === 'sending'
          ? { ...m, status: 'failed' }
          : m
      ));
    }
  }, [socket, channel, user, t, listRef]);

  const uploadAudioAndSend = useCallback(async (uri: string, durationSec?: number) => {
    if (!socket || !channel) return;
    const targetId = channel.id || channel._id;
    const tempId = `temp-${Date.now()}`;
    try {
      const filename = uri.split('/').pop() || 'voice.m4a';

      // 1. Optimistic placeholder
      const optimistic = {
        id: tempId,
        senderId: user?._id,
        senderName: user?.fullName,
        senderAvatarUrl: user?.avatarUrl,
        createdAt: new Date().toISOString(),
        type: 'media',
        status: 'sending',
        attachments: [{ url: uri, type: 'audio', filename, duration: durationSec }],
      };
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setMessages((prev) => [...prev, optimistic]);
      shouldScrollToEndRef.current = true;
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);

      // 2. Build multipart form
      const form = new FormData();
      if (Platform.OS === 'web' || (typeof uri === 'string' && uri.startsWith('blob:'))) {
        const blobResp = await fetch(uri);
        const blob = await blobResp.blob();
        const fileObj: any = typeof File !== 'undefined' ? new File([blob], filename, { type: blob.type || 'audio/m4a' }) : blob;
        form.append('file', fileObj);
      } else {
        form.append('file', { uri, name: filename, type: 'audio/m4a' } as any);
      }
      if (durationSec !== undefined) {
        form.append('duration', String(durationSec));
      }

      // 3. Post to the messaging service channel upload endpoint (which uses Cloudinary)
      const uploadRes = await http.post(`${MSG_SERVICE_URL}/channels/${targetId}/upload`, form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const body = uploadRes.data;
      const serverMsg = body?.data?.message || body?.data;
      if (serverMsg) {
        if (Platform.OS !== 'web') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
        setMessages((prev) => {
          const realId = String(serverMsg.id || serverMsg._id || '');
          if (realId && prev.some((m) => String(m.id || m._id) === realId)) {
            return prev.filter((m) => m.id !== tempId);
          }
          if (realId) confirmedIdsRef.current.add(realId);
          return prev.map((m) => (m.id === tempId ? { ...serverMsg, status: 'sent' } : m));
        });
        try { messagingEvents.emit('message:new', serverMsg); } catch (e) { }
        shouldScrollToEndRef.current = true;
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
      } else {
        // Mark as sent even without full payload
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' } : m)));
      }
    } catch (err: any) {
      console.warn('[uploadAudioAndSend] failed', err);
      Alert.alert(t('Error'), err?.message || t('Failed to upload audio'));
      // Mark optimistic message as failed
      setMessages((prev) => prev.map((m) =>
        typeof m.id === 'string' && m.id.startsWith('temp-') && m.status === 'sending'
          ? { ...m, status: 'failed' }
          : m
      ));
    }
  }, [socket, channel, user, t, listRef]);

  const stopRecordingAndSend = useCallback(async () => {
    // If we are still preparing, mark that we should stop as soon as it's prepared
    if (isPreparingRecordingRef.current) {
      shouldStopRecordingRef.current = true;
      return;
    }

    const instance = recordingInstanceRef.current;
    if (!instance) return;

    // Distinguish between hold and quick tap
    const duration = Date.now() - pressStartRef.current;
    // If it's a quick tap (< 500ms) and we just started, treat it as "tap to toggle" mode.
    // So we don't stop yet on release.
    if (duration < 500 && isRecordingRef.current && recordingDuration === 0) {
      return;
    }

    try {
      // Clear timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      let durationSec = recordingDuration;
      try {
        const status = await instance.getStatusAsync();
        if (status && typeof status.durationMillis === 'number') {
          durationSec = Math.max(0, Math.round(status.durationMillis / 1000));
        }
      } catch (e) { }

      await instance.stopAndUnloadAsync().catch(() => {});
      const uri = instance.getURI();

      setIsRecording(false);
      setRecordingInstance(null);
      setRecordingDuration(0);

      if (uri) {
        await uploadAudioAndSend(uri, durationSec);
      }
    } catch (err) {
      setIsRecording(false);
      setRecordingInstance(null);
      setRecordingDuration(0);
    }
  }, [recordingDuration, uploadAudioAndSend]);

  const playAudio = useCallback(async (message: any) => {
    if (!ExpoAV) { Alert.alert('Audio not available'); return; }
    try {
      // If tapping the currently playing audio, pause and unload it
      if (playingId === message.id) {
        if (activeSoundRef.current) {
          await activeSoundRef.current.stopAsync().catch(() => { });
          await activeSoundRef.current.unloadAsync().catch(() => { });
          activeSoundRef.current = null;
        }
        setPlayingId(null);
        setAudioProgress(0);
        return;
      }

      // If another sound is currently playing, clean it up first
      if (activeSoundRef.current) {
        await activeSoundRef.current.stopAsync().catch(() => { });
        await activeSoundRef.current.unloadAsync().catch(() => { });
        activeSoundRef.current = null;
      }

      setPlayingId(message.id);
      setAudioProgress(0);

      const soundObj = new ExpoAV.Audio.Sound();
      activeSoundRef.current = soundObj;
      await soundObj.loadAsync({ uri: message.attachments[0].url });
      await soundObj.playAsync();

      soundObj.setOnPlaybackStatusUpdate((status: any) => {
        if (status?.didJustFinish) {
          setPlayingId(null);
          setAudioProgress(0);
          soundObj.unloadAsync().catch(() => { });
          if (activeSoundRef.current === soundObj) {
            activeSoundRef.current = null;
          }
        } else if (status?.isPlaying && status?.durationMillis) {
          setAudioProgress(status.positionMillis / status.durationMillis);
        }
      });
    } catch (err) {
      setPlayingId(null);
      setAudioProgress(0);
      activeSoundRef.current = null;
    }
  }, [playingId]);

  const fetchMembers = useCallback(async () => {
    if (!channel) return;
    setMembersLoading(true);
    try {
      const candidateKeys = ['participants', 'members', 'userIds', 'participantIds', 'memberIds'];
      let raw: any = null;
      for (const k of candidateKeys) {
        if (channel[k]) { raw = channel[k]; break; }
      }

      const membersEndpoints = [`/channels/${channel.id || channel._id}/members`, `/channels/${channel.id || channel._id}/participants`];
      if (!raw || (Array.isArray(raw) && raw.length === 0)) {
        for (const ep of membersEndpoints) {
          try {
            const res = await http.get(ep);
            const data = res.data?.data || res.data;
            if (Array.isArray(data) && data.length > 0) { raw = data; break; }
          } catch (e) { }
        }
      }

      if (!raw || (Array.isArray(raw) && raw.length === 0)) {
        setMembers([]);
        return;
      }

      if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object') {
        const normalized = raw.map((m: any) => ({
          _id: m._id || m.id || m.userId,
          fullName: m.fullName || m.name || m.displayName || m.username,
          avatarUrl: m.avatarUrl || m.avatar || m.profilePicture,
          role: m.role || (m.isAdmin ? 'admin' : 'member')
        }));
        setMembers(normalized);
        return;
      }

      if (Array.isArray(raw) && (typeof raw[0] === 'string' || typeof raw[0] === 'number')) {
        const ids = raw.map((r: any) => String(r));
        let fetched: any[] = [];
        try {
          const res = await http.get(`/users?ids=${encodeURIComponent(ids.join(','))}`);
          fetched = res.data?.data || res.data || [];
        } catch (e) {
          try {
            const res2 = await http.get('/users');
            fetched = (res2.data?.data || res2.data || []).filter((u: any) => ids.includes(String(u._id) || String(u.id)));
          } catch (ee) { }
        }
        const ms = fetched.map((u: any) => ({
          _id: u._id || u.id,
          fullName: u.fullName || u.name || u.displayName,
          avatarUrl: u.avatarUrl || u.avatar,
          role: u.role || 'member'
        }));
        setMembers(ms);
      }
    } catch (err) {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [channel]);

  const addMembers = useCallback(async () => {
    if (!isAdmin) return;
    if (!selectedToAdd || selectedToAdd.length === 0) return;
    setAdding(true);
    try {
      let ok = false;
      try {
        await http.post(`/channels/${channel.id || channel._id}/members`, { members: selectedToAdd });
        ok = true;
      } catch (e) { }

      if (!ok) {
        const added = allUsers.filter(u => selectedToAdd.includes(String(u._id || u.id)));
        setMembers(prev => [...prev, ...added]);
        setChannel((prev: any) => ({ ...prev, participants: [...(prev?.participants || []), ...added] }));
      } else {
        await fetchMembers();
      }
      setSelectedToAdd([]);
      setShowAddList(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to add members');
    } finally {
      setAdding(false);
    }
  }, [channel, selectedToAdd, allUsers, isAdmin, fetchMembers]);

  const removeMember = useCallback((memberId: string) => {
    if (!isAdmin) return;
    const performRemove = async () => {
      try {
        let ok = false;
        try {
          await http.delete(`/channels/${channel.id || channel._id}/members/${memberId}`);
          ok = true;
        } catch (e) { }

        if (!ok) {
          setMembers(prev => prev.filter(m => String(m._id || m.id) !== String(memberId)));
          setChannel((prev: any) => ({ ...prev, participants: (prev?.participants || []).filter((p: any) => String(p._id || p.id) !== String(memberId)) }));
        } else {
          await fetchMembers();
        }
      } catch (err) {
        if (Platform.OS === 'web') {
          alert('Failed to remove member');
        } else {
          Alert.alert('Error', 'Failed to remove member');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to remove this member?')) {
        performRemove();
      }
    } else {
      Alert.alert('Remove member', 'Are you sure you want to remove this member?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive', onPress: performRemove
        }
      ]);
    }
  }, [channel, isAdmin, fetchMembers]);

  const uploadImageForEdit = useCallback(async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const filename = uri.split('/').pop() || 'group.jpg';
      const form = new FormData();
      if (Platform.OS === 'web' || (typeof uri === 'string' && uri.startsWith('blob:'))) {
        const blobResp = await fetch(uri);
        const blob = await blobResp.blob();
        const fileObj = typeof File !== 'undefined' ? new File([blob], filename, { type: blob.type || 'image/jpeg' }) : blob;
        form.append('file', fileObj);
      } else {
        form.append('file', { uri, name: filename, type: 'image/jpeg' } as any);
      }

      const uploadRes = await http.post(`${CORE_API_URL}/uploads`, form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const body = uploadRes.data;
      const data = body?.data;
      if (!data || !data.url) throw new Error('Invalid upload response');
      setEditPhotoUri(data.url);
      return data.url;
    } catch (err) {
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  }, []);

  const compressImage = useCallback(async (uri: string) => {
    try {
      if (!ImageManipulator) return uri;
      const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG });
      return result?.uri || uri;
    } catch (e) {
      return uri;
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') return;
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
      const uri = res?.assets && res.assets.length > 0 ? res.assets[0].uri : (res as any).uri;
      if (!uri) return;
      const compressed = await compressImage(uri);
      setEditPhotoUri(compressed);
      await uploadImageForEdit(compressed);
    } catch (err) { }
  }, [compressImage, uploadImageForEdit]);

  const pickEditImage = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== 'granted') return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true });
      const uri = res?.assets && res.assets.length > 0 ? res.assets[0].uri : (res as any).uri;
      if (!uri) return;
      const compressed = await compressImage(uri);
      setEditPhotoUri(compressed);
      await uploadImageForEdit(compressed);
    } catch (err) { }
  }, [compressImage, uploadImageForEdit]);

  const showImageOptions = useCallback(() => {
    if (Platform.OS === 'web') {
      pickEditImage();
      return;
    }
    Alert.alert('', t('Change photo'), [
      { text: t('Take Photo'), onPress: () => capturePhoto() },
      { text: t('Choose From Library'), onPress: () => pickEditImage() },
      { text: t('Cancel'), style: 'cancel' }
    ]);
  }, [capturePhoto, pickEditImage, t]);

  const saveGroupEdits = useCallback(async () => {
    if (!isAdmin && !isCreator) return;
    if (!editName || editName.trim() === '') return;
    setSaving(true);
    try {
      const payload: any = {};
      if (editName && editName.trim() !== (channel?.name || '')) payload.name = editName.trim();

      let finalIcon = editPhotoUri;
      if (finalIcon && !/^https?:\/\//i.test(finalIcon)) {
        const uploadedUrl = await uploadImageForEdit(finalIcon);
        if (uploadedUrl) finalIcon = uploadedUrl;
      }
      if (finalIcon) {
        payload.icon = finalIcon;
        payload.avatarUrl = finalIcon;
      }

      try {
        await http.patch(`/channels/${channel.id || channel._id}`, payload);
      } catch (e) { }

      const updated = { ...(channel || {}), name: payload.name || channel?.name, avatarUrl: payload.avatarUrl || channel?.avatarUrl, icon: payload.icon || channel?.icon };
      setChannel(updated);
      messagingEvents.emit('channel:updated', updated);
      setEditSheetVisible(false);
    } catch (err) {
      Alert.alert('Error', t('Failed to save changes'));
    } finally {
      setSaving(false);
    }
  }, [channel, editName, editPhotoUri, isAdmin, isCreator, uploadImageForEdit, t]);

  const performDeleteGroup = useCallback(async () => {
    if (!isCreator) return;
    setDeleting(true);
    try {
      try {
        await http.delete(`/channels/${channel.id || channel._id}`);
      } catch (e) { }

      messagingEvents.emit('channel:deleted', channel.id || channel._id);
      safeGoBack();
    } catch (err) {
      Alert.alert('Error', t('Failed to delete group'));
    } finally {
      setDeleting(false);
      setConfirmDeleteVisible(false);
    }
  }, [channel, isCreator, navigation, t]);

  const copyChannelLink = useCallback(async () => {
    try {
      const link = `${CORE_API_URL}/channels/${channel?.id || channel?._id}`;
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
      } else {
        Clipboard.setString(link);
      }
      Alert.alert(t('Copied'), t('Link copied to clipboard'));
    } catch (e) {
      Alert.alert(t('Error'), t('Failed to copy link'));
    }
  }, [channel, t]);

  // ── DM-specific actions ─────────────────────────────────────────────────────

  const handleMuteDM = useCallback(async () => {
    try {
      const channelId = channel?.id || channel?._id;
      console.debug('[chat] mute request ->', `/channels/${channelId}/mute`);
      const res = await messagingHttp.post(`/channels/${channelId}/mute`, {});
      console.debug('[chat] mute response ->', res?.data);
      const muted = res.data?.data?.myMuted ?? res.data?.myMuted ?? false;
      setChannel((prev: any) => prev ? { ...prev, myMuted: muted } : prev);
      
      const alertTitle = muted ? t('Muted') : t('Unmuted');
      const alertMsg = muted ? t('You will no longer receive notifications from this conversation.') : t('Notifications re-enabled for this conversation.');
      if (Platform.OS === 'web') {
        alert(`${alertTitle}: ${alertMsg}`);
      } else {
        Alert.alert(alertTitle, alertMsg);
      }
    } catch (err: any) {
      console.warn('[chat] mute failed', err);
      const msg = err?.response?.data?.message || err?.message || t('Failed to toggle mute');
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert(
          t('Error'),
          msg,
          [
            { text: t('OK'), style: 'cancel' },
            { text: t('Retry'), onPress: () => handleMuteDM() },
          ]
        );
      }
    }
  }, [channel, t]);

  const performClearChat = useCallback(async () => {
    setConfirmClearVisible(false);
    setClearingChat(true);
    try {
      const channelId = channel?.id || channel?._id;
      console.debug('[chat] clear messages ->', `/channels/${channelId}/messages`);
      const res = await messagingHttp.delete(`/channels/${channelId}/messages`);
      console.debug('[chat] clear response ->', res?.data);
      setMessages([]);
      setChannel((prev: any) => prev ? { ...prev, lastMessage: null, pinnedMessages: [] } : prev);
    } catch (err: any) {
      console.warn('[chat] clear failed', err);
      const msg = err?.response?.data?.message || err?.message || t('Failed to clear chat');
      Alert.alert(t('Error'), msg);
    } finally {
      setClearingChat(false);
    }
  }, [channel, t]);

  const handleClearChat = useCallback(() => {
    setConfirmClearVisible(true);
  }, []);

  const performDeleteDM = useCallback(async () => {
    setConfirmDeleteDMVisible(false);
    setDeletingDM(true);
    try {
      const channelId = channel?.id || channel?._id;
      console.debug('[chat] delete channel ->', `/channels/${channelId}`);
      const res = await messagingHttp.delete(`/channels/${channelId}`);
      console.debug('[chat] delete response ->', res?.data);
      messagingEvents.emit('channel:deleted', channelId);
      safeGoBack();
    } catch (err: any) {
      console.warn('[chat] delete failed', err);
      const msg = err?.response?.data?.message || err?.message || t('Failed to delete conversation');
      Alert.alert(t('Error'), msg);
    } finally {
      setDeletingDM(false);
    }
  }, [channel, navigation, t]);

  const handleDeleteDM = useCallback(() => {
    setConfirmDeleteDMVisible(true);
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await http.get('/users');
      setAllUsers((res.data?.data || []).filter((u: any) => String(u._id || u.id) !== String(user?._id)));
    } catch (err) {
      setAllUsers([]);
    }
  }, [user]);

  // Load all users when "Add List" opens
  useEffect(() => {
    if (showAddList) fetchAllUsers();
  }, [showAddList, fetchAllUsers]);

  const toggleSelectToAdd = useCallback((id: string) => {
    setSelectedToAdd(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }, []);

  const handlePressMessage = useCallback((message: any) => {
    const now = Date.now();
    const msgId = message.id || message._id;
    if (lastTapRef.current.id === msgId && (now - lastTapRef.current.time) < 350) {
      lastTapRef.current = { id: null, time: 0 };
      handleToggleReaction(msgId, '❤️');
      return;
    }
    lastTapRef.current = { id: msgId, time: now };
    setTimeout(() => {
      if (Date.now() - lastTapRef.current.time >= 350) lastTapRef.current = { id: null, time: 0 };
    }, 400);
  }, [handleToggleReaction]);

  const handleStartEdit = useCallback((message: any) => {
    setEditingMsgId(message.id || message._id);
    setInput(message.content || '');
    setReactionMsgId(null);
  }, []);

  const handleReplyTo = useCallback((message: any) => {
    setReplyingTo({ id: message.id || message._id, senderName: message.senderName, preview: message.content });
    setReactionMsgId(null);
  }, []);

  const handleCopy = useCallback((text: string) => {
    Clipboard.setString(text || '');
    setReactionMsgId(null);
  }, []);

  const openUserProfile = useCallback((userId: string) => {
    setSelectedProfileUserId(userId);
    setProfileSheetVisible(true);
  }, []);

  const closeUserProfile = useCallback(() => {
    setProfileSheetVisible(false);
    setSelectedProfileUserId(null);
  }, []);

  const startDirectMessage = useCallback(async (targetUserId: string) => {
    try {
      const res = await http.post('/channels/direct', { userId: targetUserId });
      const channelObj = res.data?.data;
      if (channelObj) {
        if (typeof navigation.replace === 'function') {
          navigation.replace('CommunityChat', {
            initialChannel: channelObj,
            channelId: String(channelObj._id || channelObj.id || ''),
          });
        } else {
          navigation.navigate('CommunityChat', {
            initialChannel: channelObj,
            channelId: String(channelObj._id || channelObj.id || ''),
          });
        }
      }
    } catch (err) {
      console.warn('[chat] failed to start direct message:', err);
      Alert.alert(t('Error'), t('Failed to start conversation'));
    }
  }, [navigation, t]);

  return {
    // states
    channel,
    loading,
    messages,
    input,
    setInput,
    replyingTo,
    setReplyingTo,
    editingMsgId,
    setEditingMsgId,
    typingUser,
    audioProgress,
    isRecording,
    recordingDuration,
    playingId,
    reactionMsgId,
    setReactionMsgId,
    reactionEmojis,
    popEmoji,
    popAnim,
    listRef,
    shouldScrollToEndRef,

    // permissions & flags
    isAdmin,
    isCreator,
    hasChanges,

    // Group options / sheets states
    menuVisible,
    setMenuVisible,
    membersSheetVisible,
    setMembersSheetVisible,
    editSheetVisible,
    setEditSheetVisible,
    confirmDeleteVisible,
    setConfirmDeleteVisible,
    confirmClearVisible,
    setConfirmClearVisible,
    confirmDeleteDMVisible,
    setConfirmDeleteDMVisible,
    clearingChat,
    deletingDM,
    performClearChat,
    performDeleteDM,
    members,
    membersLoading,
    memberSearch,
    setMemberSearch,
    showAddList,
    setShowAddList,
    allUsers,
    selectedToAdd,
    toggleSelectToAdd,
    adding,
    uploadingPhoto,
    editName,
    setEditName,
    editPhotoUri,
    setEditPhotoUri,
    saving,
    deleting,

    // handlers
    handleSend,
    handleRetrySend,
    handleToggleReaction,
    pickMediaAndSend,
    handleTogglePin,
    handleDeleteMessage,
    startRecording,
    stopRecordingAndSend,
    cancelRecording,
    playAudio,
    handlePressMessage,
    handleStartEdit,
    handleReplyTo,
    handleCopy,

    // sheet handlers
    fetchMembers,
    addMembers,
    removeMember,
    saveGroupEdits,
    performDeleteGroup,
    copyChannelLink,
    showImageOptions,

    // DM-specific actions
    handleMuteDM,
    handleClearChat,
    handleDeleteDM,

    // User profile actions & states
    selectedProfileUserId,
    setSelectedProfileUserId,
    profileSheetVisible,
    setProfileSheetVisible,
    openUserProfile,
    closeUserProfile,
    startDirectMessage,

    // pagination
    loadingMore,
    hasMore,
    loadMoreMessages,
  };
}
