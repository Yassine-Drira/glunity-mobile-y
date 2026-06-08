import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, SafeAreaView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { TokenStore } from '../../../../core/storage/secure-store';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { useTheme } from '../../../../shared/context/theme.context';
import { useLanguage } from '../../../../shared/context/language.context';
import { useAuth } from '../../../../modules/auth/state/auth.context';

const CORE_API_URL = API_BASE_URL;

const fallbackChannels = [
  { _id: 'c1', name: 'General', description: 'Ok. Let me check', lastMessage: { content: 'Ok. Let me check', createdAt: new Date().toISOString() }, unreadCount: 0, avatarUrl: null },
  { _id: 'c2', name: 'Designers', description: 'Natalie is typing...', lastMessage: { content: 'Natalie is typing...', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() }, unreadCount: 2, avatarUrl: 'https://randomuser.me/api/portraits/women/65.jpg' },
  { _id: 'c3', name: 'Support', description: 'Voice message', lastMessage: { content: 'Voice message', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() }, unreadCount: 0, avatarUrl: 'https://randomuser.me/api/portraits/men/76.jpg' },
];

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

  const [channels, setChannels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<'all'|'groups'|'contacts'>('all');
  const [tabsWidth, setTabsWidth] = useState(0);
  const anim = useRef(new Animated.Value(0)).current; // 0,1,2

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const token = await TokenStore.getAccessToken();
      const res = await axios.get(`${CORE_API_URL}/channels`, { headers: { Authorization: `Bearer ${token}` } });
      setChannels(res.data?.data || fallbackChannels);
    } catch (err) {
      setChannels(fallbackChannels);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    (async () => {
      try {
        const token = await TokenStore.getAccessToken();
        const res = await axios.get(`${CORE_API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
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

  // Sort channels by last message timestamp (most recent first)
  const sortedChannels = useMemo(() => {
    const list = filteredChannels ? [...filteredChannels] : [];
    list.sort((a: any, b: any) => {
      const ta = (a?.lastMessage?.createdAt || a?.lastMessage?.created_at || 0);
      const tb = (b?.lastMessage?.createdAt || b?.lastMessage?.created_at || 0);
      const na = typeof ta === 'string' ? new Date(ta).getTime() : (ta || 0);
      const nb = typeof tb === 'string' ? new Date(tb).getTime() : (tb || 0);
      return nb - na;
    });
    return list;
  }, [filteredChannels]);

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

  async function contactUser(targetId: string) {
    setCreatingContactFor(targetId);
    try {
      const token = await TokenStore.getAccessToken();
      const res = await axios.post(`${CORE_API_URL}/channels/direct`, { userId: targetId }, { headers: { Authorization: `Bearer ${token}` } });
      const channel = res.data?.data;
      if (channel) {
        navigation.navigate('CommunityChat', { initialChannel: channel });
      }
    } catch (err) {
      console.error('Failed to create direct channel', err);
    } finally {
      setCreatingContactFor(null);
    }
  }

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
    list: { paddingHorizontal: 12, paddingRight: 96 },
    row: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.divider, paddingHorizontal: 6, paddingRight: 96, minHeight: 68 },
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

            <TouchableOpacity style={[styles.tab, { flex: 1 }]} onPress={() => { setActiveTab('all'); Animated.timing(anim, { toValue: 0, useNativeDriver: true, duration: 220 }).start(); }}>
            <Text style={[styles.tabText, activeTab === 'all' ? styles.tabTextActive : undefined]}>All Chats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, { flex: 1 }]} onPress={() => { setActiveTab('groups'); Animated.timing(anim, { toValue: 1, useNativeDriver: true, duration: 220 }).start(); }}>
            <Text style={[styles.tabText, activeTab === 'groups' ? styles.tabTextActive : undefined]}>Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, { flex: 1 }]} onPress={() => { setActiveTab('contacts'); Animated.timing(anim, { toValue: 2, useNativeDriver: true, duration: 220 }).start(); }}>
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
            renderItem={({ item }) => (
              <View style={[styles.row, { justifyContent: 'space-between' }] }>
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
              </View>
            )}
          />
        )
      ) : (
        <FlatList
          data={sortedChannels}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyExtractor={(i, idx) => String(i._id || i.id || i.name || idx)}
          renderItem={({ item }) => {
            const disp = getChannelDisplay(item);
                const avatarUri = disp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(disp.name || 'C')}&background=8BC34A&color=fff`;
            const subtitle = disp.isDM ? `Direct message with ${disp.name}` : (item.lastMessage?.content || item.description);
            return (
              <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('CommunityChat', { initialChannel: item })}>
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
                <View style={styles.rowContent}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName}>{disp.name}</Text>
                    <Text style={styles.rowTime}>{formatTime(item.lastMessage?.createdAt)}</Text>
                  </View>
                  <Text style={styles.rowSnippet} numberOfLines={1}>{subtitle}</Text>
                </View>
                {item.unreadCount > 0 ? (
                  <View style={styles.unreadWrap}>
                    <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unreadCount}</Text></View>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Community') }>
        <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
