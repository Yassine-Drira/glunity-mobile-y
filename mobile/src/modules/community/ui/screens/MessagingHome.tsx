import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Animated, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import http from '../../../../core/network/http.client';
import messagingEvents from '../../../../shared/utils/messagingEvents';
import { useTheme } from '../../../../shared/context/theme.context';
import { useLanguage } from '../../../../shared/context/language.context';
import { useAuth } from '../../../../modules/auth/state/auth.context';
import { useSocket } from '../../../../shared/context/socket.context';
import { ChatCacheService } from '../../services/chat-cache.service';
import { usePresence } from '../../../../shared/hooks/usePresence';
import AnimatedReanimated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

function formatTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString();
}

export default function MessagingHome({ navigation }: any) {
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { isOnline } = usePresence();

  const seenIds = useRef<Set<string>>(new Set());
  const hasPopulatedChannels = useRef(false);
  const hasPopulatedContacts = useRef(false);
  const reducedMotion = useReducedMotion();

  const [channels, setChannels] = useState<any[]>([]);
  // sortOrder: explicit ordered list of channelIds, most-recent first.
  // Updated immediately on conversation:updated so the list reorders in real-time.
  const [sortOrder, setSortOrder] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<'all'|'groups'|'contacts'>('all');
  const [tabsWidth, setTabsWidth] = useState(0);
  const anim = useRef(new Animated.Value(0)).current; // 0,1,2

  const fetchChannels = useCallback(async () => {
    try {
      const cached = await ChatCacheService.getChannels();
      if (cached && cached.length > 0) {
        setChannels(cached);
        setLoading(false);
      }
    } catch (err) {
      console.warn('Failed to load cached channels list', err);
    }

    try {
      const res = await http.get('/channels');
      const fresh = res.data?.data || [];
      // Build initial sort order from server response (already sorted by lastMessage)
      const ids = fresh.map((c: any) => String(c._id || c.id));
      setSortOrder(ids);
      setChannels(fresh);
      await ChatCacheService.saveChannels(fresh);
    } catch (err) {
      if (channels.length === 0) setChannels([]);
    } finally {
      setLoading(false);
    }
  }, [channels.length]);

  useEffect(() => {
    fetchChannels();
  }, []);

  // Synchronize channel mutations (unread counts, snippets) to local database cache
  useEffect(() => {
    if (channels.length > 0) {
      ChatCacheService.saveChannels(channels);
    }
  }, [channels]);

  useEffect(() => {
    (async () => {
      try {
        const res = await http.get('/users');
        setUsers(res.data?.data || []);
      } catch (err) {
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, []);

  // Refresh channels when screen is focused so recently-active chats jump to top
  useFocusEffect(
    useCallback(() => {
      fetchChannels();
    }, [fetchChannels])
  );

  const [creatingContactFor, setCreatingContactFor] = useState<string | null>(null);

  function isDMChannel(c: any) {
    if (!c) return false;
    if (c.name && c.name.startsWith && c.name.startsWith('DM-')) return true;
    if (c.type && (c.type === 'direct' || c.type === 'dm')) return true;
    if (c.participants && Array.isArray(c.participants) && c.participants.length === 2) return true;
    return false;
  }

  function isGroupChannel(c: any) {
    if (!c) return false;
    if (c.type && c.type === 'group') return true;
    if (c.participants && Array.isArray(c.participants) && c.participants.length > 2) return true;
    // Fallback: if not DM, treat as group/space
    return !isDMChannel(c);
  }

  function findOtherParticipant(channel: any) {
    if (!channel || !user) return null;
    // participants may be array of ids or objects
    const parts = channel.participants || channel.members || channel.participantIds || channel.userIds;
    let otherId: any = null;

    if (parts && Array.isArray(parts)) {
      const ids = parts.map((p: any) => (typeof p === 'string' ? p : (p._id || p.id || p.userId || p._userId)));
      otherId = ids.find((id: any) => id && String(id) !== String(user._id));
    }

    // fallback: try parse ids from channel.name (some DM names contain both ids)
    if (!otherId && channel.name && typeof channel.name === 'string') {
      const matches = channel.name.match(/[0-9a-fA-F]{6,}/g);
      if (matches && matches.length) {
        const m = matches.find((mId: string) => String(mId) !== String(user._id));
        if (m) otherId = m;
      }
    }

    if (!otherId) return null;

    // try find in local users cache
    const found = users.find(u => String(u._id) === String(otherId) || String(u.id) === String(otherId));
    if (found) return found;

    // if participants array contains user objects, return that
    if (parts && Array.isArray(parts)) {
      const obj = parts.find((p: any) => p && (String(p._id) === String(otherId) || String(p.id) === String(otherId)));
      if (obj) return obj;
    }

    return { _id: otherId, fullName: otherId, avatarUrl: null };
  }

  function getChannelDisplay(channel: any) {
    if (!channel) return { name: channel?.name || 'Channel', avatarUrl: null, isDM: false };
    if (isDMChannel(channel)) {
      const other = findOtherParticipant(channel);
      const name = other ? (other.fullName || other.name || other.displayName || `User`) : (channel.name || 'Direct Message');
      const avatarUrl = other ? (other.avatarUrl || other.avatar || null) : null;
      return { name, avatarUrl, isDM: true };
    }
    return { name: channel.name || channel.displayName || 'Channel', avatarUrl: channel.avatarUrl || null, isDM: false };
  }

  const filteredChannels = useMemo(() => {
    if (activeTab === 'contacts') return [];
    if (activeTab === 'groups') return channels.filter(isGroupChannel);
    // all: include both groups and direct/private chats
    return channels.filter(c => isGroupChannel(c) || isDMChannel(c));
  }, [channels, activeTab]);

  // Sort channels using explicit sortOrder array (updated on each new message).
  // Falls back to timestamp sort only if sortOrder has no entry for a channel.
  const sortedChannels = useMemo(() => {
    const list = filteredChannels ? [...filteredChannels] : [];
    if (sortOrder.length > 0) {
      list.sort((a: any, b: any) => {
        const aId = String(a._id || a.id);
        const bId = String(b._id || b.id);
        const ai = sortOrder.indexOf(aId);
        const bi = sortOrder.indexOf(bId);
        // Items in sortOrder come first (lower index = more recent)
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        // Both unknown: fall back to timestamp
        const ta = a?.lastMessage?.createdAt || a?.updatedAt || a?.createdAt || 0;
        const tb = b?.lastMessage?.createdAt || b?.updatedAt || b?.createdAt || 0;
        return new Date(tb).getTime() - new Date(ta).getTime();
      });
    } else {
      list.sort((a: any, b: any) => {
        const ta = a?.lastMessage?.createdAt || a?.updatedAt || a?.createdAt || 0;
        const tb = b?.lastMessage?.createdAt || b?.updatedAt || b?.createdAt || 0;
        return new Date(tb).getTime() - new Date(ta).getTime();
      });
    }
    return list;
  }, [filteredChannels, sortOrder]);

  const contactsList = useMemo(() => {
    if (!users || users.length === 0 || !user) return [];
    // find users that don't have a DM channel with current user
    const dmChannels = channels.filter(isDMChannel);
    return users.filter(u => {
      if (u._id === user._id) return false;
      const hasDM = dmChannels.some(dc => {
        if (dc.participants && Array.isArray(dc.participants)) {
          return dc.participants.includes(u._id) && dc.participants.includes(user._id);
        }
        // fallback: if channel has members array
        if (dc.members && Array.isArray(dc.members)) {
          return dc.members.includes(u._id) && dc.members.includes(user._id);
        }
        return false;
      });
      return !hasDM;
    });
  }, [users, channels, user]);

  if (!hasPopulatedChannels.current && sortedChannels && sortedChannels.length > 0) {
    sortedChannels.forEach((c: any) => {
      seenIds.current.add(String(c._id || c.id));
    });
    hasPopulatedChannels.current = true;
  }

  if (!hasPopulatedContacts.current && contactsList && contactsList.length > 0) {
    contactsList.forEach((u: any) => {
      seenIds.current.add(String(u._id || u.id || u.fullName));
    });
    hasPopulatedContacts.current = true;
  }

  async function contactUser(targetId: string) {
    setCreatingContactFor(targetId);
    try {
      const res = await http.post('/channels/direct', { userId: targetId });
      const channel = res.data?.data;
      if (channel) {
        navigation.navigate('CommunityChat', {
          initialChannel: channel,
          channelId: String(channel._id || channel.id || ''),
        });
      }
    } catch (err) {
      console.error('Failed to create direct channel', err);
    } finally {
      setCreatingContactFor(null);
    }
  }

  const pinnedChannels = useMemo(() => {
    return sortedChannels.filter((c) => c.isPinned);
  }, [sortedChannels]);

  const unpinnedChannels = useMemo(() => {
    return sortedChannels.filter((c) => !c.isPinned);
  }, [sortedChannels]);

  const flattenedList = useMemo(() => {
    const list: any[] = [];
    if (pinnedChannels.length > 0) {
      list.push({ isHeader: true, title: t('Pinned') });
      list.push(...pinnedChannels);
    }
    if (unpinnedChannels.length > 0) {
      if (pinnedChannels.length > 0) {
        list.push({ isHeader: true, title: t('Recent Chats') });
      }
      list.push(...unpinnedChannels);
    }
    return list;
  }, [pinnedChannels, unpinnedChannels, t]);

  const togglePinChannel = async (channel: any) => {
    const channelId = channel._id || channel.id;
    const originalPinned = !!channel.isPinned;
    const nextPinned = !originalPinned;

    setChannels((prev) => 
      prev.map((c) => 
        (String(c._id || c.id) === String(channelId)) 
          ? { ...c, isPinned: nextPinned } 
          : c
      )
    );

    try {
      if (originalPinned) {
        await http.delete(`/channels/${channelId}/pin`);
      } else {
        await http.post(`/channels/${channelId}/pin`, {});
      }
    } catch (err) {
      setChannels((prev) => 
        prev.map((c) => 
          (String(c._id || c.id) === String(channelId)) 
            ? { ...c, isPinned: originalPinned } 
            : c
        )
      );
      Alert.alert(t('Error'), t('Failed to update pin status'));
    }
  };

  const handleLongPressChannel = (channel: any) => {
    const isPinned = !!channel.isPinned;
    const title = getChannelDisplay(channel).name;
    
    Alert.alert(
      title,
      isPinned ? t('Unpin this conversation?') : t('Pin this conversation to top?'),
      [
        {
          text: t('Cancel'),
          style: 'cancel',
        },
        {
          text: isPinned ? t('Unpin') : t('Pin'),
          onPress: () => togglePinChannel(channel),
        },
      ],
      { cancelable: true }
    );
  };

  // Attach event listeners to the global socket for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ message }: any) => {
      setChannels((prev) => {
        const cid = String(message.channelId || message.channel || '');
        let found = false;
        const next = prev.map((c) => {
          const cId = String(c._id || c.id || c.channelId || '');
          if (cId === cid) {
            found = true;
            const isSenderMe = String(message.senderId) === String(user?._id);
            const unread = isSenderMe ? 0 : ((c.unreadCount || 0) + 1);
            return { ...c, lastMessage: { content: message.content, createdAt: message.createdAt, messageId: message.id || message._id }, unreadCount: unread };
          }
          return c;
        });
        if (!found) return prev;
        return next;
      });
    };

    const handleMessageEdited = ({ messageId, content }: any) => {
      setChannels((prev) => prev.map((c) => {
        const lm = c.lastMessage || {};
        if (lm.messageId && String(lm.messageId) === String(messageId)) return { ...c, lastMessage: { ...lm, content } };
        return c;
      }));
    };

    const handleMessageDeleted = ({ messageId, channelId }: any) => {
      setChannels((prev) => prev.map((c) => {
        const lm = c.lastMessage || {};
        if ((lm.messageId && String(lm.messageId) === String(messageId)) || String(c._id || c.id) === String(channelId)) {
          return { ...c, lastMessage: { ...lm, content: null } };
        }
        return c;
      }));
    };

    const handleConversationUpdated = ({ channelId, lastMessage, unreadCount }: any) => {
      if (!channelId) return;
      const cid = String(channelId);

      // Bubble this channel to front of sortOrder
      setSortOrder(prev => {
        const next = prev.filter(id => id !== cid);
        next.unshift(cid);
        return next;
      });

      setChannels((prev) => {
        const idx = prev.findIndex(c => String(c._id || c.id) === cid);
        if (idx === -1) return prev;
        const updated = {
          ...prev[idx],
          ...(lastMessage ? { lastMessage } : {}),
          ...(unreadCount !== undefined ? { unreadCount } : {}),
        };
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:edited', handleMessageEdited);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('conversation:updated', handleConversationUpdated);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('conversation:updated', handleConversationUpdated);
    };
  }, [socket, user]);

  // When the chat screen marks a channel as opened/read, clear the badge here
  useEffect(() => {
    const onOpened = (channelId: any) => {
      setChannels(prev => prev.map(c => (String(c._id || c.id) === String(channelId) ? { ...c, unreadCount: 0 } : c)));
    };
    messagingEvents.on('channel:opened', onOpened);
    return () => { messagingEvents.off('channel:opened', onOpened); };
  }, []);

  // Also listen to local message events emitted by the chat screen to update list instantly
  useEffect(() => {
    const onLocalMessage = (message: any) => {
      if (!message) return;
      const cid = String(message.channelId || message.channel || '');
      // Bubble this channel to top of sort order
      setSortOrder(prev => {
        const next = prev.filter(id => id !== cid);
        next.unshift(cid);
        return next;
      });
      setChannels((prev) => {
        let found = false;
        const next = prev.map((c) => {
          const cId = String(c._id || c.id || c.channelId || '');
          if (cId === cid) {
            found = true;
            const isSenderMe = String(message.senderId) === String(user?._id);
            const unread = isSenderMe ? 0 : ((c.unreadCount || 0) + 1);
            return { ...c, lastMessage: { content: message.content, createdAt: message.createdAt, messageId: message.id || message._id }, unreadCount: unread };
          }
          return c;
        });
        if (!found) return prev;
        return next;
      });
    };
    messagingEvents.on('message:new', onLocalMessage);
    return () => { messagingEvents.off('message:new', onLocalMessage); };
  }, [user]);


  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: { paddingHorizontal: 18, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    greetingWrap: { flexDirection: 'column' },
    hello: { color: T.textMuted, fontSize: 12 },
    userName: { color: T.text, fontSize: 22, fontWeight: '900', marginTop: 6 },
    headerIcons: { flexDirection: 'row', alignItems: 'center' },
    searchIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    menuIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface, justifyContent: 'center', alignItems: 'center' },
    tabsWrap: { paddingHorizontal: 16, marginTop: 10, marginBottom: 8 },
    tabsContainer: { flexDirection: 'row', backgroundColor: T.surfaceAlt, borderRadius: 999, padding: 4, alignSelf: 'flex-start' },
    tab: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    tabActive: { backgroundColor: '#8BC34A' },
    tabText: { color: T.textMuted, fontSize: 14, fontWeight: '700', textAlign: 'center' },
    tabTextActive: { color: '#fff' },
    list: { paddingHorizontal: 12, paddingRight: 12 },
    row: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.divider, paddingHorizontal: 6, paddingRight: 12, minHeight: 68 },
    avatar: { width: 52, height: 52, borderRadius: 26 },
    rowContent: { flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowName: { fontSize: 16, fontWeight: '700', color: T.text },
    rowTime: { color: T.textMuted, fontSize: 12 },
    rowSnippet: { color: T.textMuted, fontSize: 13, marginTop: 4 },
    unreadBadge: { backgroundColor: '#8BC34A', minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    unreadWrap: { justifyContent: 'center', alignItems: 'center', marginLeft: 8, paddingRight: 8 },
    contactBtn: { backgroundColor: '#8BC34A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 10, minWidth: 78, elevation: 4 },
    unreadText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    fab: { position: 'absolute', right: 18, bottom: 28, width: 64, height: 64, borderRadius: 32, backgroundColor: '#8BC34A', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 },
  }), [T, isRTL]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.greetingWrap}>
          <Text style={styles.hello}>Hello.</Text>
          <Text style={styles.userName}>{user?.fullName?.split(' ')[0] || 'Johan'}</Text>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.searchIconWrap} onPress={() => { /* TODO: search */ }}>
            <Ionicons name="search" size={18} color={T.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuIconWrap} onPress={() => { /* menu */ }}>
            <Ionicons name="ellipsis-vertical" size={18} color={T.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsWrap}>
        <View style={[styles.tabsContainer, { width: '100%' }]} onLayout={(e) => setTabsWidth(e.nativeEvent.layout.width)}>
          {/* Animated active pill */}
          {tabsWidth > 0 && (
            <Animated.View
              style={{
                position: 'absolute',
                left: 4,
                top: 4,
                bottom: 4,
                width: tabsWidth / 3 - 8,
                borderRadius: 999,
                backgroundColor: '#8BC34A',
                transform: [{ translateX: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, tabsWidth / 3, (tabsWidth / 3) * 2] }) }]
              }}
            />
          )}

            <TouchableOpacity style={[styles.tab, { flex: 1 }]} onPress={() => { setActiveTab('all'); Animated.timing(anim, { toValue: 0, useNativeDriver: Platform.OS !== 'web', duration: 220 }).start(); }}>
            <Text style={[styles.tabText, activeTab === 'all' ? styles.tabTextActive : undefined]}>All Chats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, { flex: 1 }]} onPress={() => { setActiveTab('groups'); Animated.timing(anim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', duration: 220 }).start(); }}>
            <Text style={[styles.tabText, activeTab === 'groups' ? styles.tabTextActive : undefined]}>Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, { flex: 1 }]} onPress={() => { setActiveTab('contacts'); Animated.timing(anim, { toValue: 2, useNativeDriver: Platform.OS !== 'web', duration: 220 }).start(); }}>
            <Text style={[styles.tabText, activeTab === 'contacts' ? styles.tabTextActive : undefined]}>Contacts</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} />
      ) : activeTab === 'contacts' ? (
        loadingUsers ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={contactsList}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyExtractor={(i, idx) => String(i._id || i.id || i.fullName || idx)}
            renderItem={({ item, index }) => {
              const itemId = String(item._id || item.id || item.fullName);
              const shouldAnimate = !seenIds.current.has(itemId);
              if (shouldAnimate) {
                seenIds.current.add(itemId);
              }
              const enteringAnimation = !shouldAnimate || reducedMotion
                ? undefined
                : FadeInDown.duration(250).delay(index * 40);
              return (
                <AnimatedReanimated.View
                  entering={enteringAnimation}
                  style={[styles.row, { justifyContent: 'space-between' }]}
                >
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                    <Image source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName || 'U')}&background=8BC34A&color=fff` }} style={styles.avatar} />
                    <View style={styles.rowContent}>
                      <Text style={styles.rowName}>{item.fullName}</Text>
                      <Text style={styles.rowSnippet}>{item.profileType || ''}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => contactUser(item._id)} style={styles.contactBtn} disabled={creatingContactFor === item._id}>
                    {creatingContactFor === item._id ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Contact</Text>}
                  </TouchableOpacity>
                </AnimatedReanimated.View>
              );
            }}
          />
        )
      ) : (
        <FlatList
          data={flattenedList}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyExtractor={(i, idx) => i.isHeader ? `header-${i.title}-${idx}` : String(i._id || i.id || i.name || idx)}
          renderItem={({ item, index }) => {
            if (item.isHeader) {
              return (
                <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: T.green || '#8BC34A', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    {item.title}
                  </Text>
                </View>
              );
            }

            const disp = getChannelDisplay(item);
            const avatarUri = disp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(disp.name || 'C')}&background=8BC34A&color=fff`;
            const unread: number = item.unreadCount || 0;
            const rawSubtitle = item.lastMessage?.content || item.description || '';
            // For unread messages: show count prefix or truncate to avoid overflow
            const subtitle = unread > 0 && !disp.isDM
              ? `${unread > 4 ? '4+' : unread} unread · ${rawSubtitle}`.slice(0, 80)
              : disp.isDM
                ? (rawSubtitle || `Direct message`)
                : rawSubtitle;

            // ── Online dot ────────────────────────────────────────────────────
            let showOnlineDot = false;
            if (disp.isDM) {
              const other = findOtherParticipant(item);
              if (other) showOnlineDot = isOnline(other._id || other.id);
            }
            
            const itemId = String(item._id || item.id);
            const shouldAnimate = !seenIds.current.has(itemId);
            if (shouldAnimate) {
              seenIds.current.add(itemId);
            }
            const enteringAnimation = !shouldAnimate || reducedMotion
              ? undefined
              : FadeInDown.duration(250).delay(index * 40);

            return (
              <AnimatedReanimated.View entering={enteringAnimation}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => {
                    // clear unread locally immediately, then open chat
                    setChannels(prev => prev.map(c => (String(c._id || c.id) === String(item._id || item.id) ? { ...c, unreadCount: 0 } : c)));
                    navigation.navigate('CommunityChat', {
                      initialChannel: item,
                      channelId: String(item._id || item.id || ''),
                    });
                  }}
                  onLongPress={() => handleLongPressChannel(item)}
                >
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    {showOnlineDot && (
                      <View style={{
                        position: 'absolute',
                        right: 1,
                        bottom: 1,
                        width: 13,
                        height: 13,
                        borderRadius: 7,
                        backgroundColor: '#4CAF50',
                        borderWidth: 2,
                        borderColor: T.bg,
                      }} />
                    )}
                  </View>
                  <View style={styles.rowContent}>
                    <View style={styles.rowTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.rowName, item.unreadCount > 0 && { fontWeight: '900', color: T.text }]} numberOfLines={1}>{disp.name}</Text>
                        {!!item.isPinned && (
                          <Ionicons name="pin" size={13} color={T.green || '#8BC34A'} style={{ marginLeft: 6 }} />
                        )}
                      </View>
                      <Text style={styles.rowTime}>{formatTime(item.lastMessage?.createdAt)}</Text>
                    </View>
                    <Text style={[styles.rowSnippet, item.unreadCount > 0 && { fontWeight: '700', color: T.text }]} numberOfLines={1}>{subtitle}</Text>
                  </View>
                  {unread > 0 ? (
                    <View style={styles.unreadWrap}>
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{unread > 4 ? '4+' : unread}</Text>
                      </View>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </AnimatedReanimated.View>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateGroup') }>
        <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
