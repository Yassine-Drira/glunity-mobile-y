import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert, Animated, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { io } from 'socket.io-client';
import { TokenStore } from '../../../../core/storage/secure-store';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { useAuth } from '../../../auth/state/auth.context';
import { useTheme } from '../../../../shared/context/theme.context';
import { useLanguage } from '../../../../shared/context/language.context';

const CORE_API_URL = API_BASE_URL;
const MSG_SERVICE_URL = API_BASE_URL.replace(':5000', ':5001');
const MSG_SERVICE_SOCKET_URL = MSG_SERVICE_URL.replace('/api', '');

export default function CommunityMessaging({ initialChannel, initialChannelId, navigation }: any) {
  const { user } = useAuth();
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();

  const [channel, setChannel] = useState<any>(initialChannel || null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const [reactionEmojis] = useState(['❤️', '👍', '😂', '😮', '😢', '🔥', '🎉', '✅']);
  const [popEmoji, setPopEmoji] = useState<string | null>(null);
  const popAnim = useRef(new Animated.Value(0)).current;
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const socketRef = useRef<any>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    let mounted = true;
    async function loadChannel() {
      if (initialChannel) {
        setChannel(initialChannel);
        return;
      }
      if (!initialChannelId) return;
      try {
        const token = await TokenStore.getAccessToken();
        const res = await axios.get(`${CORE_API_URL}/channels/${initialChannelId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (mounted) setChannel(res.data?.data || null);
      } catch (err) {
        console.warn('[community] failed to fetch channel', err);
      }
    }
    loadChannel();
    return () => { mounted = false; };
  }, [initialChannel, initialChannelId]);

  useEffect(() => {
    if (!channel) return;
    let mounted = true;
    async function loadHistory() {
      setLoading(true);
      try {
        const token = await TokenStore.getAccessToken();
        const res = await axios.get(`${MSG_SERVICE_URL}/channels/${channel.id || channel._id}/messages?limit=60`, { headers: { Authorization: `Bearer ${token}` } });
        if (!mounted) return;
        setMessages(res.data?.data || []);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);
      } catch (err) {
        // Include request URL and error message to aid debugging (network/CORS/server down)
        console.warn('[community] loadHistory failed', String((err as any)?.message || err), 'url=', `${MSG_SERVICE_URL}/channels/${channel.id || channel._id}/messages?limit=60`);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();

    return () => { mounted = false; };
  }, [channel]);

  const pinnedMessages = useMemo(() => messages.filter(m => m.pinned && !m.deletedAt), [messages]);

  // Helper: derive display name and avatar for DM channels
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

    // If participants contains objects, find the other participant
    const parts = ch.participants || ch.members || ch.userIds || ch.participantIds;
    if (Array.isArray(parts) && parts.length > 0) {
      // If array of objects
      const obj = parts.find((p: any) => p && (p._id || p.id) && String(p._id || p.id) !== String(user?._id));
      if (obj) return { name: obj.fullName || obj.name || obj.displayName || String(obj._id || obj.id), avatar: obj.avatarUrl || obj.avatar || ch.avatarUrl || null };

      // If array of ids
      const otherId = parts.find((p: any) => String(p) !== String(user?._id));
      if (otherId) return { name: String(otherId), avatar: ch.avatarUrl || null };
    }

    // Fallback: use channel display name or the raw description
    if (ch.name && typeof ch.name === 'string' && ch.name.startsWith('DM-')) {
      // prefer description if present
      return { name: desc || ch.name, avatar: ch.avatarUrl || null };
    }

    return { name: ch.name || ch.displayName || desc || t('Chat'), avatar: ch.avatarUrl || null };
  };

  useEffect(() => {
    if (!channel) return;
    let active = true;
    (async () => {
      const token = await TokenStore.getAccessToken();
      if (!token) return;
      if (socketRef.current) socketRef.current.disconnect();
      const s = io(MSG_SERVICE_SOCKET_URL, { auth: { token } });
      s.on('connect', () => {});
      s.on('message:new', ({ message }: any) => {
        if (!active) return;
        if (message.channelId === (channel.id || channel._id)) {
          setMessages((prev) => (prev.some(m => m.id === message.id) ? prev : [...prev, message]));
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
        }
      });
      s.on('reaction:updated', ({ messageId, emoji, count }: any) => {
        if (!active) return;
        setMessages((prev) => prev.map((m) => {
          if (m.id !== messageId) return m;
          const updated = { ...m };
          updated.reactionCounts = updated.reactionCounts || {};
          if (count > 0) updated.reactionCounts[emoji] = count;
          else delete updated.reactionCounts[emoji];
          return updated;
        }));
      });
      s.on('message:edited', ({ messageId, content, editedAt }: any) => {
        if (!active) return;
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, content, editedAt } : m));
      });
      s.on('message:deleted', ({ messageId }: any) => {
        if (!active) return;
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), content: null } : m));
      });
      socketRef.current = s;
    })();

    return () => { active = false; if (socketRef.current) socketRef.current.disconnect(); };
  }, [channel]);

  const handleSend = () => {
    if (!input.trim() || !socketRef.current || !channel) return;
    if (editingMsgId) {
      socketRef.current.emit('message:edit', { messageId: editingMsgId, content: input.trim() }, (res: any) => {
        if (res?.ok) {
          setMessages((prev) => prev.map(m => m.id === editingMsgId ? { ...m, content: input.trim(), editedAt: new Date().toISOString() } : m));
          setEditingMsgId(null);
          setInput('');
        } else {
          Alert.alert('Error', res?.error || 'Failed to edit message');
        }
      });
      return;
    }

    const payload = { channelId: channel.id || channel._id, content: input.trim(), type: 'text' };
    socketRef.current.emit('message:send', payload, (res: any) => {
      if (res?.ok) {
        setMessages((prev) => (prev.some(m => m.id === res.data.id) ? prev : [...prev, res.data]));
        setInput('');
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      }
    });
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (!socketRef.current) return;
    // Animate pop
    setPopEmoji(emoji);
    popAnim.setValue(0);
    Animated.sequence([
      Animated.timing(popAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(popAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start(() => setPopEmoji(null));

    socketRef.current.emit('reaction:toggle', { messageId, emoji }, (res: any) => {
      if (!res?.ok) console.warn('Reaction toggle failed', res?.error);
    });
  };

  const handleTogglePin = async (messageId: string) => {
    if (!channel) return;
    try {
      const token = await TokenStore.getAccessToken();
      const targetId = channel.id || channel._id;
      // find message to see if pinned
      const msg = messages.find((m) => m.id === messageId);
      const isPinned = !!msg?.pinned;
      if (isPinned) {
        await axios.delete(`${MSG_SERVICE_URL}/channels/${targetId}/messages/${messageId}/pin`, { headers: { Authorization: `Bearer ${token}` } });
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, pinned: false } : m));
      } else {
        await axios.post(`${MSG_SERVICE_URL}/channels/${targetId}/messages/${messageId}/pin`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, pinned: true } : m));
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to toggle pin');
    }
  };

  const handleStartEdit = (message: any) => {
    setEditingMsgId(message.id);
    setInput(message.content || '');
    setReactionMsgId(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('message:delete', { messageId }, (res: any) => {
      if (res?.ok) {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), content: null } : m));
      } else {
        Alert.alert('Error', res?.error || 'Failed to delete message');
      }
    });
    setReactionMsgId(null);
  };

  const handleReplyTo = (message: any) => {
    setReplyingTo({ id: message.id, senderName: message.senderName, preview: message.content });
    setReactionMsgId(null);
  };

  const handleCopy = (text: string) => {
    try {
      Clipboard.setString(text || '');
    } catch (e) {}
    setReactionMsgId(null);
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: { height: 64, borderBottomWidth: 1, borderBottomColor: T.divider, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 12, justifyContent: 'space-between' },
    headerLeft: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    title: { fontSize: 16, fontWeight: '700', color: T.text },
    subtitle: { fontSize: 12, color: T.textMuted },
    // reduce bottom padding so messages fill the screen and sit just above input
    listContent: { padding: 16, paddingBottom: 24 },
    row: { marginVertical: 6, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-end' },
    // slightly wider bubbles and small horizontal margin to resemble design
    // let bubble size to content (don't force shrink) so short messages remain on one line
    // wider minWidth for outgoing messages and slightly larger padding
    bubbleLeft: { backgroundColor: T.surface, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, maxWidth: '82%', minWidth: 92, alignSelf: 'flex-start', flexShrink: 0, marginHorizontal: 6 },
    bubbleRight: { backgroundColor: isDark ? '#2E4C1F' : '#2ECC71', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, maxWidth: '82%', minWidth: 140, alignSelf: 'flex-end', flexShrink: 0, marginHorizontal: 6 },
    msgText: { color: T.text, fontSize: 15, flexWrap: 'wrap', flexShrink: 0 },
    timeText: { fontSize: 11, color: T.textMuted, marginTop: 6 },
    // container for bubble + timestamp so timestamp sits under the bubble
    messageBlock: { flexDirection: 'column', alignItems: 'flex-start' },
    inputBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.divider },
    inputRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
    textInput: { flex: 1, marginHorizontal: 8, backgroundColor: T.surfaceAlt, paddingVertical: Platform.OS === 'ios' ? 12 : 8, paddingHorizontal: 12, borderRadius: 24, color: T.text },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? '#1E7A4D' : '#2ECC71', justifyContent: 'center', alignItems: 'center' },
  }), [T, isDark, isRTL]);

  const renderItem = ({ item }: { item: any }) => {
    const isMe = String(item.senderId) === String(user?._id);
    return (
      <View style={[styles.row, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}
      >
        {/* left avatar for incoming messages */}
        {!isMe && item.senderAvatarUrl ? <Image source={{ uri: item.senderAvatarUrl }} style={styles.avatar} /> : null}

        <View style={[styles.messageBlock, isMe ? { alignItems: 'flex-end' } : undefined]}>
          <TouchableOpacity activeOpacity={0.95} onLongPress={() => setReactionMsgId(item.id)} onPress={() => {}} style={isMe ? styles.bubbleRight : styles.bubbleLeft}>
            <Text style={[styles.msgText, isMe ? { color: '#fff' } : undefined]}>{item.content}</Text>

            {item.reactionCounts && Object.keys(item.reactionCounts).length > 0 ? (
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                {Object.entries(item.reactionCounts).map(([emoji, count]: any) => (
                  <TouchableOpacity key={emoji} onPress={() => handleToggleReaction(item.id, emoji)} style={{ backgroundColor: 'rgba(0,0,0,0.04)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 6 }}>
                    <Text>{emoji} {count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </TouchableOpacity>

          {/* timestamp below the bubble */}
          <Text style={[styles.timeText, isMe ? { textAlign: 'right' } : { textAlign: 'left' }]}>
            {new Date(item.createdAt || item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* right avatar for my messages (hidden to give more room to bubbles) */}
      </View>
    );
  };

  const selectedMsg = messages.find((m) => m.id === reactionMsgId);

  if (!channel) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>{t('Loading channel...')}</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
            <Ionicons name={isRTL ? 'arrow-forward-outline' : 'arrow-back-outline'} size={22} color={T.text} />
          </TouchableOpacity>
          {(() => {
            const display = getChatDisplay(channel);
            return (
              <>
                {display.avatar ? <Image source={{ uri: display.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, { backgroundColor: T.surfaceAlt }]} />}
                <View>
                  <Text style={styles.title}>{display.name}</Text>
                  <Text style={styles.subtitle}>{t('Online')}</Text>
                </View>
              </>
            );
          })()}
        </View>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
          <TouchableOpacity style={{ padding: 8 }} onPress={() => {}}><Ionicons name="call-outline" size={20} color={T.text} /></TouchableOpacity>
          <TouchableOpacity style={{ padding: 8 }} onPress={() => {}}><Ionicons name="ellipsis-vertical" size={20} color={T.text} /></TouchableOpacity>
        </View>
      </View>

      {pinnedMessages.length > 0 && (
        <TouchableOpacity onPress={() => {
          // scroll to last pinned
          const lastPinned = pinnedMessages[pinnedMessages.length - 1];
          const index = messages.findIndex(m => m.id === lastPinned.id);
          if (index >= 0) try { listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }); } catch (e) {}
        }} style={{ position: 'absolute', top: 64, left: 12, right: 12, backgroundColor: T.surface, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', zIndex: 20 }}>
          <Ionicons name="pin" size={14} color={T.green} />
          <Text numberOfLines={1} style={{ marginLeft: 8, color: T.text, fontWeight: '600' }}>{pinnedMessages[pinnedMessages.length - 1].content || t('[Attachment]')}</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(i) => i.id || i._id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Reaction / Action Modal */}
      <Modal visible={!!reactionMsgId} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.32)' }}>
          <View style={{ width: 320, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12 }}>
              {reactionEmojis.map((emoji) => (
                <TouchableOpacity key={emoji} onPress={() => { if (reactionMsgId) handleToggleReaction(reactionMsgId, emoji); setReactionMsgId(null); }} style={{ paddingHorizontal: 6 }}>
                  <Text style={{ fontSize: 26 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: 1, backgroundColor: '#EFEFEF' }} />

            <TouchableOpacity onPress={() => { if (reactionMsgId) handleReplyTo(selectedMsg); }} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: '#222', fontSize: 16 }}>{t('Reply')}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { if (selectedMsg) handleCopy(selectedMsg.content || ''); }} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: '#222', fontSize: 16 }}>{t('Copy Text')}</Text>
            </TouchableOpacity>

            {selectedMsg?.senderId === user?._id && !selectedMsg?.deletedAt ? (
              <>
                <TouchableOpacity onPress={() => { if (selectedMsg) handleStartEdit(selectedMsg); }} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Text style={{ color: '#222', fontSize: 16 }}>{t('Edit Message')}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { if (selectedMsg) handleDeleteMessage(selectedMsg.id); }} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                  <Text style={{ color: '#D9534F', fontSize: 16 }}>{t('Delete Message')}</Text>
                </TouchableOpacity>
              </>
            ) : null}

            <View style={{ height: 8, backgroundColor: '#F8F8F8' }} />

            <TouchableOpacity onPress={() => { if (reactionMsgId) handleTogglePin(reactionMsgId); setReactionMsgId(null); }} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: '#222', fontSize: 16 }}>{selectedMsg?.pinned ? t('Unpin Message') : t('Pin Message')}</Text>
            </TouchableOpacity>

            <View style={{ height: 8, backgroundColor: '#F8F8F8' }} />

            <TouchableOpacity onPress={() => setReactionMsgId(null)} style={{ paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: T.textMuted }}>{t('Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Emoji pop animation */}
      {popEmoji ? (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', right: 36, bottom: 120, transform: [{ scale: popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.15] }) }], opacity: popAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 0] }) }}>
          <Text style={{ fontSize: 40 }}>{popEmoji}</Text>
        </Animated.View>
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <View style={styles.inputBar}>
          {replyingTo ? (
            <View style={{ backgroundColor: T.surface, padding: 8, borderRadius: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: T.textMuted, fontSize: 12 }}>{t('Replying to')} <Text style={{ color: T.text, fontWeight: '700' }}>{replyingTo.senderName}</Text></Text>
                <Text style={{ color: T.textMuted, fontSize: 12 }} numberOfLines={1}>{replyingTo.preview}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ padding: 8 }}>
                <Ionicons name="close" size={18} color={T.textMuted} />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.inputRow}>
            <TouchableOpacity onPress={() => {}} style={{ padding: 8 }}>
              <Ionicons name="add" size={20} color={T.text} />
            </TouchableOpacity>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t('Message')}
              placeholderTextColor={T.textMuted}
              style={styles.textInput}
              multiline
            />
            <TouchableOpacity onPress={() => { handleSend(); setReplyingTo(null); }} style={styles.sendBtn}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
