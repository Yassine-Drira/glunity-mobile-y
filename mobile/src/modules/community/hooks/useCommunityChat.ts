import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Platform, Alert, Animated, Dimensions, Clipboard, LayoutAnimation, UIManager } from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../auth/state/auth.context';
import { useSocket } from '../../../shared/context/socket.context';
import { useTheme } from '../../../shared/context/theme.context';
import { useLanguage } from '../../../shared/context/language.context';
import { TokenStore } from '../../../core/storage/secure-store';
import { API_BASE_URL } from '../../../core/config/api.config';
import http from '../../../core/network/http.client';
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

  const [channel, setChannel] = useState<any>(initialChannel || null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState<any>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Group Details & Modals states
  const [menuVisible, setMenuVisible] = useState(false);
  const [membersSheetVisible, setMembersSheetVisible] = useState(false);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);

  // Audio playback references
  const activeSoundRef = useRef<any>(null);

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

  // Fetch Message History with Cache-Aside strategy
  useEffect(() => {
    if (!channel) return;
    let mounted = true;

    async function loadHistory() {
      const targetId = channel.id || channel._id;

      // 1. Try to load from cache first for instant UI response
      try {
        const cached = await ChatCacheService.getMessages(targetId);
        if (mounted && cached && cached.length > 0) {
          setMessages(cached);
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

        // 3. Update the local cache
        await ChatCacheService.saveMessages(targetId, fresh);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);
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
  }, [channel]);

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

    const handleNewMessage = ({ message }: any) => {
      const msgChannelId = message.channelId?.toString?.() || message.channelId;
      const thisChannelId = (channel.id || channel._id)?.toString?.() || (channel.id || channel._id);
      if (msgChannelId !== thisChannelId) return;

      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }

      setMessages((prev) => {
        const realId = message.id || message._id;
        // Already in list (exact id match) — skip
        if (prev.some(m => (m.id || m._id) === realId)) return prev;

        // Own message: replace the first temp- placeholder so it doesn't ghost
        if (String(message.senderId) === String(user?._id)) {
          const tempIdx = prev.findIndex(m => String(m.id || '').startsWith('temp-'));
          if (tempIdx !== -1) {
            const next = [...prev];
            next[tempIdx] = { ...message, status: 'sent' };
            return next;
          }
        }

        return [...prev, message];
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    };

    const handleReactionUpdated = ({ messageId, emoji, count }: any) => {
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setMessages((prev) => prev.map((m) => {
        if (m.id !== messageId) return m;
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
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, content, editedAt } : m));
    };

    const handleMessageDeleted = ({ messageId }: any) => {
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), content: null } : m));
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

    socket.on('message:new', handleNewMessage);
    socket.on('reaction:updated', handleReactionUpdated);
    socket.on('message:edited', handleMessageEdited);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('message:pinned', handleMessagePinned);
    socket.on('message:unpinned', handleMessageUnpinned);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('reaction:updated', handleReactionUpdated);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('message:pinned', handleMessagePinned);
      socket.off('message:unpinned', handleMessageUnpinned);
    };
  }, [channel, socket]);

  // Clean up any playing audio when the hook unmounts
  useEffect(() => {
    return () => {
      if (activeSoundRef.current) {
        activeSoundRef.current.stopAsync().catch(() => { });
        activeSoundRef.current.unloadAsync().catch(() => { });
      }
    };
  }, []);

  // Emitting typing events (throttled client-side to prevent socket spam)
  useEffect(() => {
    if (!input.trim() || !socket || !channel) return;
    const targetId = channel.id || channel._id;

    const throttle = setTimeout(() => {
      socket.emit('message:typing', { channelId: targetId });
    }, 150);

    return () => clearTimeout(throttle);
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

    if (editingMsgId) {
      socket.emit('message:edit', { messageId: editingMsgId, content: textToSend }, (res: any) => {
        if (res?.ok) {
          setMessages((prev) => prev.map(m => m.id === editingMsgId ? { ...m, content: textToSend, editedAt: new Date().toISOString() } : m));
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
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

    const payload = { channelId: channel.id || channel._id, content: textToSend, type: 'text' };

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
        setMessages((prev) => {
          const realId = res.data?.id || res.data?._id;
          // handleNewMessage already swapped temp- with the real message — just remove the ghost temp
          if (realId && prev.some(m => (m.id || m._id) === realId)) {
            return prev.filter(m => m.id !== tempId);
          }
          // Socket event hasn't arrived yet — do the swap ourselves
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
    setPopEmoji(emoji);
    popAnim.setValue(0);
    Animated.sequence([
      Animated.spring(popAnim, { toValue: 1, friction: 6, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(popAnim, { toValue: 0, duration: 360, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => setPopEmoji(null));

    // Capture original state for potential error rollbacks
    let previousReactions: any = null;
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m;
      previousReactions = m.reactionCounts ? { ...m.reactionCounts } : {};

      const updated = { ...m };
      updated.reactionCounts = { ...(updated.reactionCounts || {}) };
      const cur = updated.reactionCounts[emoji] || 0;
      if (cur > 0) {
        const next = cur - 1;
        if (next > 0) updated.reactionCounts[emoji] = next;
        else delete updated.reactionCounts[emoji];
      } else {
        updated.reactionCounts[emoji] = 1;
      }
      return updated;
    }));

    socket.emit('reaction:toggle', { messageId, emoji }, (res: any) => {
      if (!res?.ok) {
        console.warn('Reaction toggle failed', res?.error);
        // Rollback optimistic reaction changes
        setMessages((prev) => prev.map((m) => {
          if (m.id !== messageId) return m;
          return { ...m, reactionCounts: previousReactions };
        }));
        Alert.alert(t('Error'), res?.error || t('Failed to update reaction'));
      }
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
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), content: null } : m));
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
    try {
      if (recordingInstance) return;
      const { status } = await ExpoAV.Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('Permission Denied ❌'), t('You must allow microphone access to record audio.'));
        return;
      }
      await ExpoAV.Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new ExpoAV.Audio.Recording();
      await recording.prepareToRecordAsync(ExpoAV.Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.startAsync();
      setRecordingInstance(recording);
      setIsRecording(true);
    } catch (err) {
      console.warn('startRecording failed', err);
    }
  }, [recordingInstance, t]);

  const uploadAudioAndSend = useCallback(async (uri: string, durationSec?: number) => {
    try {
      const token = await TokenStore.getAccessToken();
      const filename = uri.split('/').pop() || 'voice.m4a';
      const form = new FormData();
      if (Platform.OS === 'web' || (typeof uri === 'string' && uri.startsWith('blob:'))) {
        const blobResp = await fetch(uri);
        const blob = await blobResp.blob();
        const fileObj: any = typeof File !== 'undefined' ? new File([blob], filename, { type: blob.type || 'audio/m4a' }) : blob;
        form.append('file', fileObj);
      } else {
        form.append('file', { uri, name: filename, type: 'audio/m4a' } as any);
      }

      const res = await fetch(`${CORE_API_URL}/uploads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const body = await res.json();
      const data = body?.data;
      if (!data || !data.url) throw new Error('Invalid upload response');

      if (!socket || !channel) return;
      const attachments = [{ url: data.url, type: 'audio', filename: data.filename || filename, size: data.size, duration: durationSec }];
      socket.emit('message:send', { channelId: channel.id || channel._id, content: '', type: 'media', attachments }, (res2: any) => {
        if (res2?.ok) setMessages(prev => (prev.some(m => m.id === res2.data.id) ? prev : [...prev, res2.data]));
      });
    } catch (err) {
      Alert.alert('Error', t('Failed to upload audio'));
    }
  }, [socket, channel, t]);

  const stopRecordingAndSend = useCallback(async () => {
    if (!ExpoAV || !recordingInstance) return;
    try {
      let durationSec: number | undefined = undefined;
      try {
        const status = await recordingInstance.getStatusAsync();
        if (status && typeof status.durationMillis === 'number') {
          durationSec = Math.max(0, Math.round(status.durationMillis / 1000));
        }
      } catch (e) { }

      await recordingInstance.stopAndUnloadAsync();
      const uri = recordingInstance.getURI();
      setIsRecording(false);
      setRecordingInstance(null);
      if (uri) await uploadAudioAndSend(uri, durationSec);
    } catch (err) {
      setIsRecording(false);
      setRecordingInstance(null);
    }
  }, [recordingInstance, uploadAudioAndSend]);

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
    Alert.alert('Remove member', 'Are you sure you want to remove this member?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
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
            Alert.alert('Error', 'Failed to remove member');
          }
        }
      }
    ]);
  }, [channel, isAdmin, fetchMembers]);

  const uploadImageForEdit = useCallback(async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const token = await TokenStore.getAccessToken();
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

      const res = await fetch(`${CORE_API_URL}/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      if (!res.ok) throw new Error('Upload failed');
      const body = await res.json();
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
      navigation.goBack();
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
    if (lastTapRef.current.id === message.id && (now - lastTapRef.current.time) < 350) {
      lastTapRef.current = { id: null, time: 0 };
      handleToggleReaction(message.id, '❤️');
      return;
    }
    lastTapRef.current = { id: message.id, time: now };
    setTimeout(() => {
      if (Date.now() - lastTapRef.current.time >= 350) lastTapRef.current = { id: null, time: 0 };
    }, 400);
  }, [handleToggleReaction]);

  const handleStartEdit = useCallback((message: any) => {
    setEditingMsgId(message.id);
    setInput(message.content || '');
    setReactionMsgId(null);
  }, []);

  const handleReplyTo = useCallback((message: any) => {
    setReplyingTo({ id: message.id, senderName: message.senderName, preview: message.content });
    setReactionMsgId(null);
  }, []);

  const handleCopy = useCallback((text: string) => {
    Clipboard.setString(text || '');
    setReactionMsgId(null);
  }, []);

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
    playingId,
    reactionMsgId,
    setReactionMsgId,
    reactionEmojis,
    popEmoji,
    popAnim,
    listRef,

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
    handleTogglePin,
    handleDeleteMessage,
    startRecording,
    stopRecordingAndSend,
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
  };
}
