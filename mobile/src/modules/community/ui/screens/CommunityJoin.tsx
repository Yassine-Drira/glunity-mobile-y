import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import http from '../../../../core/network/http.client';
import axios from 'axios';
import { useTheme } from '../../../../shared/context/theme.context';
import { useLanguage } from '../../../../shared/context/language.context';
import { usePresence } from '../../../../shared/hooks/usePresence';
import OnlineDot from '../../../../shared/components/OnlineDot';
import { useAuth } from '../../../../modules/auth/state/auth.context';

const getChannelVisual = (channelName: string) => {
  const name = (channelName || '').toLowerCase();
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

function formatTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isDMChannel(c: any) {
  if (!c) return false;
  if (c.name && typeof c.name === 'string' && c.name.startsWith('DM-')) return true;
  if (c.type && (c.type === 'direct' || c.type === 'dm' || String(c.type).toUpperCase() === 'DM')) return true;
  if (c.participants && Array.isArray(c.participants) && c.participants.length === 2) return true;
  return false;
}

const badgeImageMap: { [key: string]: any } = {
  bronze: require('../../../../../assets/badges/bronze.png'),
  silver: require('../../../../../assets/badges/silver.png'),
  gold: require('../../../../../assets/badges/gold.png'),
  heromedaillegold: require('../../../../../assets/badges/heromedaillegold.png'),
  heromedaillesilver: require('../../../../../assets/badges/heromedaillesilver.png'),
  default: require('../../../../../assets/badges/Frame.png'),
};

export default function CommunityJoin({ navigation }: any) {
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const screenW = Dimensions.get('window').width;
  const { isOnline, fetchStatuses } = usePresence();

  const [users, setUsers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [fetchedCoreChannels, setFetchedCoreChannels] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [creatingChannelFor, setCreatingChannelFor] = useState<string | null>(null);
  const [joiningChannelId, setJoiningChannelId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const res = await http.get('/users');
        const userList = res.data?.data || [];
        setUsers(userList);
        const userIds = userList.map((u: any) => u._id).filter(Boolean);
        if (userIds.length > 0) {
          fetchStatuses(userIds);
        }
      } catch (e) {
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    })();

    (async () => {
      try {
        // fetch core channels and messaging discover in parallel (discover may be on msg service port)
        const baseURL = http.defaults.baseURL || '';
        const msgBaseUrl = baseURL.replace(':5000', ':5002');

        const corePromise = http.get('/channels').then(r => r.data?.data || []).catch(async (err) => {
          // fallback: try unauthenticated axios call to the same URL to fetch public channels
          try {
            const base = http.defaults.baseURL || '';
            const res = await axios.get(`${base}/channels`);
            return res.data?.data || [];
          } catch (e) {
            console.debug('[CommunityJoin] core channels unauth fallback failed', (e as any)?.message || e);
            return [];
          }
        });

        const discoverPromise = http.get(`${msgBaseUrl}/channels/discover`).then(r => r.data?.data || []).catch(async (err) => {
          try {
            const res = await axios.get(`${msgBaseUrl}/channels/discover`);
            return res.data?.data || [];
          } catch (e) {
            console.debug('[CommunityJoin] discover unauth fallback failed', (e as any)?.message || e);
            return [];
          }
        });

        const [coreChannels, discovered] = await Promise.all([corePromise, discoverPromise]);
        console.debug('[CommunityJoin] coreChannels count=', (coreChannels||[]).length, 'discovered count=', (discovered||[]).length);
        setFetchedCoreChannels(coreChannels || []);

        // Build maps for core and discovered so we can merge without losing helpful fields
        const coreMap = new Map<string, any>();
        const discMap = new Map<string, any>();
        (coreChannels || []).forEach((c: any) => coreMap.set(String(c._id || c.id || c.channelId || `c-${Math.random()}`), c));
        (discovered || []).forEach((d: any) => discMap.set(String(d._id || d.id || d.channelId || `d-${Math.random()}`), d));

        const allIds = new Set<string>([...coreMap.keys(), ...discMap.keys()]);
        const merged: any[] = [];
        allIds.forEach((id) => {
          const c = coreMap.get(id);
          const d = discMap.get(id);
          // merge: prefer core for most fields but keep discovered as fallback and record source flags
          const combined = {
            ...(d || {}),
            ...(c || {}),
            _fromCore: !!c,
            _fromDiscover: !!d,
            _coreType: c && c.type ? String(c.type).toLowerCase() : '',
            _discType: d && d.type ? String(d.type).toLowerCase() : '',
          };
          merged.push(combined);
        });

        // Filter: include non-DM channels and exclude explicit group types unless discover shows it's not a group.
        const filtered = merged.filter((ch: any) => {
          if (!ch) return false;
          const name = (ch.name || ch.title || '').toString().toLowerCase();

          const coreType = ch._coreType || '';
          const discType = ch._discType || '';

          // Treat as DM only when types don't explicitly mark it as a channel
          if (isDMChannel(ch) && coreType !== 'channel' && discType !== 'channel') return false;

          if (name.includes('general')) return true;

          // If discovered contains this channel, keep it (discovered is authoritative for app-created channels)
          if (ch._fromDiscover) return true;

          // if core marks as group, exclude
          if (coreType === 'group') return false;

          // otherwise allow (channels, broadcasts, etc.)
          return true;
        });

        setChannels(filtered);
        console.debug('[CommunityJoin] filtered channels ->', filtered.map((c:any)=> ({ id: c._id||c.id, name: c.name||c.title })));
      } catch (err) {
        console.error('[community] failed to fetch channels', err);
        setChannels([]);
      } finally {
        setLoadingChannels(false);
      }
    })();
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: T.bg },
    header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.divider, backgroundColor: T.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    title: { fontSize: 22, fontWeight: '800', color: T.text },
    skipBtn: { paddingHorizontal: 10, paddingVertical: 6 },
    skipText: { color: T.textMuted, fontSize: 14 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: T.textMuted, marginTop: 18, marginBottom: 8, paddingHorizontal: 16, textTransform: 'uppercase' },

    // Explore users carousel
    usersCarousel: { height: 150 },
    userCardWrap: { width: Math.min(140, Math.max(120, (screenW - 64) / 3)), marginHorizontal: 8 },
    userCard: { backgroundColor: T.surface, borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: T.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    avatarWrap: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', borderWidth: 2, borderColor: T.surface, justifyContent: 'center', alignItems: 'center', backgroundColor: T.surfaceAlt },
    avatarImage: { width: 60, height: 60, borderRadius: 30 },
    statusDot: { position: 'absolute', right: 4, bottom: 4, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: T.surface, backgroundColor: T.green },
    userName: { fontSize: 14, fontWeight: '700', color: T.text, marginTop: 8, textAlign: 'center' },
    userRole: { fontSize: 12, color: T.textMuted, marginTop: 4, textTransform: 'capitalize' },
    contactBtnSmall: { marginTop: 10, backgroundColor: T.greenLight, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
    contactBtnSmallText: { color: T.green, fontWeight: '700', fontSize: 13 },

    // Channels list
    channelsList: { paddingHorizontal: 16, paddingTop: 8 },
    channelCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 12, padding: 12, marginBottom: 10, shadowColor: T.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    channelAvatar: { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: T.surfaceAlt },
    channelContent: { flex: 1, marginLeft: 12, marginRight: 8 },
    channelTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    channelTitle: { fontSize: 16, fontWeight: '800', color: T.text },
    channelDesc: { fontSize: 13, color: T.textMuted, marginTop: 6 },
    channelMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    joinWrap: { alignItems: 'center', justifyContent: 'center' },
    joinBtn: { backgroundColor: T.greenLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, minWidth: 72, alignItems: 'center', justifyContent: 'center' },
    joinBtnText: { color: T.green, fontWeight: '800' },
    badge: { position: 'absolute', top: -6, right: -6, backgroundColor: T.green, minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  }), [T, isRTL, screenW]);

  async function contactUser(targetUserId: string) {
    setCreatingChannelFor(targetUserId);
    try {
      const res = await http.post('/channels/direct', { userId: targetUserId });
      const channel = res.data?.data;
      if (channel) {
        navigation.navigate('CommunityChat', { initialChannel: channel });
      }
    } catch (err) {
      console.error('[community] Failed to create direct channel', err);
    } finally {
      setCreatingChannelFor(null);
    }
  }

  function isMemberOfChannel(channel: any) {
    if (!channel || !user) return false;
    const parts = channel.participants || channel.members || channel.userIds || channel.participantIds || [];
    if (Array.isArray(parts) && parts.length > 0) {
      return parts.some((p: any) => {
        if (!p) return false;
        if (typeof p === 'string') return String(p) === String((user as any)._id) || String(p) === String((user as any).id);
        const pid = String(p._id || p.id || p.userId || p._userId);
        return pid && (pid === String((user as any)._id) || pid === String((user as any).id));
      });
    }
    return false;
  }

  const joinChannel = async (channel: any) => {
    if (!channel) return;
    const channelId = String(channel._id || channel.id || channel.channelId || '');
    if (!channelId) return;
    setJoiningChannelId(channelId);
    try {
      try {
        await http.post(`/channels/${channelId}/join`, {});
      } catch (e) {
        // ignore join errors and try members endpoint
        try {
          await http.post(`/channels/${channelId}/members`, { userId: user?._id });
        } catch (e2) {
          // swallow
        }
      }
      // navigate to chat
      navigation.navigate('CommunityChat', { initialChannel: channel, channelId });
    } catch (err) {
      console.error('[community] Failed to join channel', err);
    } finally {
      setJoiningChannelId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={channels}
        keyExtractor={(c) => c.id || c._id}
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
          <View>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>Community</Text>
              </View>
              <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.navigate('CommunityChat') }>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Explore Users</Text>
            {loadingUsers ? (
              <ActivityIndicator style={{ margin: 20 }} />
            ) : (
              <FlatList
                horizontal
                data={users}
                keyExtractor={(i) => i._id}
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={5}
                updateCellsBatchingPeriod={50}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}
                renderItem={({ item }) => (
                  <View style={styles.userCardWrap}>
                    <View style={styles.userCard}>
                      <View style={{ position: 'relative' }}>
                        <View style={styles.avatarWrap}>
                          <Image
                            source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName || 'U')}&background=8BC34A&color=fff&size=128` }}
                            style={styles.avatarImage}
                            fadeDuration={0}
                          />
                        </View>
                        {/* Live presence dot */}
                        <OnlineDot isOnline={isOnline(item._id)} size={14} />
                      </View>

                      <Text style={styles.userName} numberOfLines={1}>{item.fullName}</Text>
                      <Text style={styles.userRole} numberOfLines={1}>{item.profileType}</Text>

                      <TouchableOpacity style={styles.contactBtnSmall} onPress={() => contactUser(item._id)} disabled={creatingChannelFor === item._id}>
                        {creatingChannelFor === item._id ? (
                          <ActivityIndicator />
                        ) : (
                          <Text style={styles.contactBtnSmallText}>{t('Contact')}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}

            <Text style={styles.sectionTitle}>Channels</Text>
            
          </View>
        )}
        ListEmptyComponent={() => loadingChannels ? <ActivityIndicator style={{ margin: 20 }} /> : <Text style={{ padding: 16, color: T.textMuted }}>{t('No channels found')}</Text>}
        renderItem={({ item }) => {
          const isDM = item.name && item.name.startsWith('DM-');
          const displayName = item.name || item.description || 'Channel';
          const visual = getChannelVisual(item.name);
          const iconName = isDM ? 'person-outline' : visual.icon;
          const subtext = isDM ? 'Direct Message' : (item.description || 'Welcome to this space! Tap to read.');
          const unreadCount = isDM ? 0 : visual.unread;

          return (
            <View style={styles.channelCard}>
              <View style={styles.channelAvatar}>
                  {(item.avatarUrl || item.avatar || item.image) ? (
                    <Image source={{ uri: item.avatarUrl || item.avatar || item.image }} style={{ width: 52, height: 52, borderRadius: 12 }} />
                  ) : (
                    <Ionicons name={iconName as any} size={22} color={T.text} />
                  )}
                </View>

              <View style={styles.channelContent}>
                <View style={styles.channelTitleRow}>
                  <Text style={styles.channelTitle}>{displayName}</Text>
                </View>
                <Text style={styles.channelDesc} numberOfLines={2}>{subtext}</Text>
              </View>

              <View style={[styles.joinWrap, { position: 'relative' }]}> 
                {unreadCount > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
                )}
                {(() => {
                  const cid = String(item._id || item.id || item.channelId || '');
                  const member = isMemberOfChannel(item);
                  return (
                    <TouchableOpacity
                      style={styles.joinBtn}
                      onPress={async () => {
                        if (member) {
                          navigation.navigate('CommunityChat', { initialChannel: item, channelId: cid });
                          return;
                        }
                        await joinChannel(item);
                      }}
                      disabled={joiningChannelId === cid}
                    >
                      {joiningChannelId === cid ? <ActivityIndicator /> : <Text style={styles.joinBtnText}>{member ? (t('Consult') || 'Consult') : (t('Join') || 'Join')}</Text>}
                    </TouchableOpacity>
                  );
                })()}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
