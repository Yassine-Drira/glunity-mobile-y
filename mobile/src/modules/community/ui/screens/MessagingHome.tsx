import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable, Image, ActivityIndicator, Animated, Alert, Platform, TextInput, Modal, KeyboardAvoidingView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import http from '../../../../core/network/http.client';
import messagingEvents from '../../../../shared/utils/messagingEvents';
import { getChannelDisplay as getDisplayForChannel } from '../../utils/channelDisplay';
import { useTheme } from '../../../../shared/context/theme.context';
import { BottomNavBar } from '../../../../shared/components/BottomNavBar';
import { useLanguage } from '../../../../shared/context/language.context';
import { useAuth } from '../../../../modules/auth/state/auth.context';
import { useSocket } from '../../../../shared/context/socket.context';
import { ChatCacheService } from '../../services/chat-cache.service';
import { usePresence } from '../../../../shared/hooks/usePresence';
import OnlineDot from '../../../../shared/components/OnlineDot';
import AnimatedReanimated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { UserProfileBottomSheet } from '../components/UserProfileBottomSheet';
import ActiveNowSection from '../components/ActiveNowSection';
import { resolveMessagingServiceUrl } from '../../../../core/network/messaging-service-url';

let BlurView: any = null;
try { BlurView = require('expo-blur').BlurView; } catch (e) { BlurView = null; }

function formatTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString();
}

const ChannelRowItem = React.memo(({
  item,
  index,
  user,
  isOnline,
  getChannelDisplay,
  findOtherParticipant,
  handleLongPressChannel,
  formatTime,
  setChannels,
  navigation,
  T,
  reducedMotion,
  isRTL,
  styles
}: any) => {
  const disp = getChannelDisplay(item);
  const avatarUri = disp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(disp.name || 'C')}&background=8BC34A&color=fff`;
  const unread: number = item.unreadCount || 0;
  const rawSubtitle = item.lastMessage?.content || item.description || '';
  const subtitle = unread > 0 && !disp.isDM
    ? `${unread > 4 ? '4+' : unread} unread · ${rawSubtitle}`.slice(0, 80)
    : disp.isDM
      ? (rawSubtitle || `Direct message`)
      : rawSubtitle;

  let showOnlineDot = false;
  if (disp.isDM) {
    const other = findOtherParticipant(item);
    if (other) showOnlineDot = isOnline(other._id || other.id);
  }

  const enteringAnimation = reducedMotion
    ? undefined
    : FadeInDown.duration(250).delay(index * 40);

  return (
    <AnimatedReanimated.View entering={enteringAnimation}>
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          setChannels((prev: any) => prev.map((c: any) => (String(c._id || c.id) === String(item._id || item.id) ? { ...c, unreadCount: 0 } : c)));
          navigation.navigate('CommunityChat', {
            initialChannel: item,
            channelId: String(item._id || item.id || ''),
          });
        }}
        onLongPress={() => handleLongPressChannel(item)}
      >
        <View style={{ position: 'relative' }}>
          <ExpoImage source={{ uri: avatarUri }} style={styles.avatar} cachePolicy="memory-disk" />
          <OnlineDot isOnline={showOnlineDot} size={13} />
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
        {item.myMuted ? (
          <View style={{ marginLeft: 8, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="notifications-off" size={16} color={T.textMuted} />
          </View>
        ) : null}
      </TouchableOpacity>
    </AnimatedReanimated.View>
  );
}, (prevProps, nextProps) => {
  const pItem = prevProps.item;
  const nItem = nextProps.item;
  
  if (pItem._id !== nItem._id || pItem.id !== nItem.id) return false;
  if (pItem.name !== nItem.name) return false;
  if (pItem.unreadCount !== nItem.unreadCount) return false;
  if (pItem.isPinned !== nItem.isPinned) return false;
  if (pItem.myMuted !== nItem.myMuted) return false;
  if (pItem.lastMessage?.content !== nItem.lastMessage?.content) return false;
  if (pItem.lastMessage?.createdAt !== nItem.lastMessage?.createdAt) return false;
  if (pItem.description !== nItem.description) return false;
  if (pItem.updatedAt !== nItem.updatedAt) return false;

  const pOther = prevProps.findOtherParticipant(pItem);
  const nOther = nextProps.findOtherParticipant(nItem);
  if (String(pOther?._id || pOther?.id) !== String(nOther?._id || nOther?.id)) return false;
  if (pOther && nOther) {
    const pOnline = prevProps.isOnline(pOther._id || pOther.id);
    const nOnline = nextProps.isOnline(nOther._id || nOther.id);
    if (pOnline !== nOnline) return false;

    if (pOther.fullName !== nOther.fullName) return false;
    if (pOther.avatarUrl !== nOther.avatarUrl) return false;
  }

  if (prevProps.T !== nextProps.T) return false;

  return true;
});

function isDMChannel(c: any) {
  if (!c) return false;
  if (c.name && c.name.startsWith && c.name.startsWith('DM-')) return true;
  if (c.type && (c.type === 'direct' || c.type === 'dm' || String(c.type).toUpperCase() === 'DM')) return true;
  if (c.participants && Array.isArray(c.participants) && c.participants.length === 2) return true;
  return false;
}

function isGroupChannel(c: any) {
  if (!c) return false;
  if (c.type && c.type === 'group') return true;
  if (c.participants && Array.isArray(c.participants) && c.participants.length > 2) return true;
  return false;
}

export default function MessagingHome({ navigation }: any) {
  const { theme: T, isDark } = useTheme();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { isOnline, getLastSeen, fetchStatuses } = usePresence();

  const seenIds = useRef<Set<string>>(new Set());
  const activeFetchesRef = useRef<Set<string>>(new Set());
  const perfStats = useRef({
    startTime: Date.now(),
    conversationsCount: 0,
    profilesFromCache: 0,
    profilesFromApi: 0,
    failedRequests: 0,
    apiResponseTimes: [] as number[],
    batchRequestsExecuted: 0,
    duplicateRequestsPrevented: 0,
  });
  const hasPopulatedChannels = useRef(false);
  const hasPopulatedContacts = useRef(false);
  const reducedMotion = useReducedMotion();

  // User Profile Bottom Sheet states
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileSheetVisible, setProfileSheetVisible] = useState(false);

  const openUserProfile = useCallback((userId: string) => {
    setProfileUserId(userId);
    setProfileSheetVisible(true);
  }, []);

  // Listen for local channel updates (from chat screen) and apply to list + cache
  useEffect(() => {
    const handler = (updated: any) => {
      if (!updated) return;
      const id = String(updated._id || updated.id);
      setChannels((prev) => {
        const foundIdx = prev.findIndex(c => String(c._id || c.id) === id);
        if (foundIdx === -1) {
          const next = [updated, ...prev];
          ChatCacheService.saveChannels(next).catch(() => {});
          return next;
        }
        const next = [...prev];
        next[foundIdx] = { ...next[foundIdx], ...updated, updatedAt: updated.updatedAt || new Date().toISOString() };
        ChatCacheService.saveChannels(next).catch(() => {});
        return next;
      });
    };

    // require here to avoid circular import at module load
    const messagingEvents = require('../../../../shared/utils/messagingEvents').default || require('../../../../shared/utils/messagingEvents');
    messagingEvents.on('channel:updated', handler);
    return () => { messagingEvents.off('channel:updated', handler); };
  }, []);

  // Listen to global socket events for real-time new messages
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessageGlobal = ({ message }: any) => {
      if (!message) return;
      const msgChannelId = String(message.channelId || message.channel || '');
      if (!msgChannelId) return;

      setChannels((prev) => {
        const foundIdx = prev.findIndex(c => String(c._id || c.id) === msgChannelId);
        if (foundIdx === -1) {
          // If we don't have this channel in memory, a refresh might be needed later
          return prev;
        }
        const next = [...prev];
        const channel = next[foundIdx];
        
        // Skip if this message is already the last message
        if (channel.lastMessage && String(channel.lastMessage.id || channel.lastMessage._id) === String(message.id || message._id)) {
          return prev;
        }

        const isMe = String(message.senderId) === String(user?._id);
        
        next[foundIdx] = {
          ...channel,
          lastMessage: message,
          updatedAt: message.createdAt || new Date().toISOString(),
          unreadCount: !isMe ? (channel.unreadCount || 0) + 1 : (channel.unreadCount || 0)
        };
        
        ChatCacheService.saveChannels(next).catch(() => {});
        return next;
      });
    };

    socket.on('message:new', handleNewMessageGlobal);
    return () => {
      socket.off('message:new', handleNewMessageGlobal);
    };
  }, [socket, user]);


  const closeUserProfile = useCallback(() => {
    setProfileSheetVisible(false);
    setProfileUserId(null);
  }, []);

  const [channels, setChannels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [publicChannels, setPublicChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<'all'|'groups'|'contacts'>('all');
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [tabsWidth, setTabsWidth] = useState(0);
  const anim = useRef(new Animated.Value(0)).current; // 0,1,2

  const abortControllerRef = useRef<AbortController | null>(null);

  const printPerformanceReport = useCallback(() => {
    const duration = Date.now() - perfStats.current.startTime;
    const avgResponse = perfStats.current.apiResponseTimes.length > 0
      ? Math.round(perfStats.current.apiResponseTimes.reduce((a, b) => a + b, 0) / perfStats.current.apiResponseTimes.length)
      : 0;

    console.log(`[MessagingHome Performance Report]
--------------------------------------------------
MessagingHome loaded in: ${duration} ms
Conversations loaded: ${perfStats.current.conversationsCount}
Profiles loaded from cache: ${perfStats.current.profilesFromCache}
Profiles fetched from API: ${perfStats.current.profilesFromApi}
Failed requests: ${perfStats.current.failedRequests}
Average API response time: ${avgResponse} ms
Batch requests executed: ${perfStats.current.batchRequestsExecuted}
Duplicate requests prevented: ${perfStats.current.duplicateRequestsPrevented}
--------------------------------------------------`);
  }, []);

  const mergeUserProfiles = useCallback((profilesList: any[]) => {
    // 1. Merge profiles into users cache
    setUsers(prev => {
      const map = new Map(prev.map((u: any) => [String(u._id || u.id), u]));
      profilesList.forEach((fu: any) => {
        if (fu) map.set(String(fu._id || fu.id), fu);
      });
      return Array.from(map.values());
    });

    // 2. Dynamically enrich channel participants without causing full conversation list flashes
    setChannels(prev => prev.map((c: any) => {
      const parts = c.participants || c.members || c.userIds || c.participantIds || [];
      if (Array.isArray(parts) && parts.length > 0) {
        const enriched = parts.map((p: any) => {
          const pid = typeof p === 'string' ? p : (p._id || p.id || p.userId || p._userId);
          const found = profilesList.find((fu: any) => String(fu._id || fu.id) === String(pid));
          return found ? { ...p, ...found } : p;
        });
        return { ...c, participants: enriched };
      }
      return c;
    }));
  }, []);

  const fetchMissingUserProfiles = useCallback(async (channelsList: any[], abortSignal: AbortSignal) => {
    try {
      // 1. Gather all unique other DM participant user IDs
      const dmOtherIds: string[] = [];
      channelsList.forEach((c: any) => {
        const parts = c.participants || c.members || c.userIds || c.participantIds || [];
        if (Array.isArray(parts) && parts.length === 2) {
          const ids = parts.map((p: any) => (typeof p === 'string' ? p : (p._id || p.id || p.userId || p._userId)));
          const other = ids.find((id: any) => id && String(id) !== String(user?._id));
          if (other) {
            dmOtherIds.push(String(other));
          }
        }
      });

      const uniqueIds = Array.from(new Set(dmOtherIds));
      if (uniqueIds.length === 0) return;

      perfStats.current.conversationsCount = channelsList.length;

      // 2. Load cached profiles to check what is missing or expired (e.g. older than 12 hours)
      const cachedProfiles = await ChatCacheService.getUserProfiles();
      perfStats.current.profilesFromCache = cachedProfiles.length;
      
      const cachedMap = new Map(cachedProfiles.map((u: any) => [String(u._id || u.id), u]));
      
      const EXPIRE_TIME = 12 * 60 * 60 * 1000; // 12 hours
      const now = Date.now();
      
      // Determine what is missing or expired
      const missingIds = uniqueIds.filter(id => {
        const cached = cachedMap.get(id);
        if (!cached) return true;
        if (!cached.cachedAt || now - cached.cachedAt > EXPIRE_TIME) return true;
        return false;
      });

      // Filter out what is already being fetched actively to prevent duplicates
      const idsToFetch = missingIds.filter(id => {
        if (activeFetchesRef.current.has(id)) {
          perfStats.current.duplicateRequestsPrevented += 1;
          return false;
        }
        return true;
      });

      if (idsToFetch.length === 0) {
        // Enforce progressive update from cached profiles if we found some
        const foundFromCache = uniqueIds.map(id => cachedMap.get(id)).filter(Boolean);
        if (foundFromCache.length > 0) {
          mergeUserProfiles(foundFromCache);
        }
        printPerformanceReport();
        return;
      }

      // Add to active fetches
      idsToFetch.forEach(id => activeFetchesRef.current.add(id));

      // 3. Batch the requests in chunks of 25
      const batchSize = 25;
      const chunks: string[][] = [];
      for (let i = 0; i < idsToFetch.length; i += batchSize) {
        chunks.push(idsToFetch.slice(i, i + batchSize));
      }

      const fetchedAll: any[] = [];

      for (const chunk of chunks) {
        if (abortSignal.aborted) break;
        let attempt = 0;
        let success = false;
        while (attempt < 3 && !success) {
          if (abortSignal.aborted) break;
          const apiStart = Date.now();
          perfStats.current.batchRequestsExecuted += 1;
          try {
            // Prefer the optimized POST /users/batch endpoint
            const res = await http.post('/users/batch', { ids: chunk }, { 
              timeout: 6000,
              signal: abortSignal 
            });
            const duration = Date.now() - apiStart;
            perfStats.current.apiResponseTimes.push(duration);

            const fetched = res.data?.data || res.data || [];
            if (Array.isArray(fetched)) {
              fetchedAll.push(...fetched);
              perfStats.current.profilesFromApi += fetched.length;
            }
            success = true;
          } catch (err: any) {
            // Fallback to GET /users?ids=... if POST /batch is not supported
            try {
              const idsParam = encodeURIComponent(chunk.join(','));
              const res = await http.get(`/users?ids=${idsParam}`, { 
                timeout: 6000,
                signal: abortSignal 
              });
              const duration = Date.now() - apiStart;
              perfStats.current.apiResponseTimes.push(duration);

              const fetched = res.data?.data || res.data || [];
              if (Array.isArray(fetched)) {
                fetchedAll.push(...fetched);
                perfStats.current.profilesFromApi += fetched.length;
              }
              success = true;
            } catch (err2: any) {
              attempt += 1;
              perfStats.current.failedRequests += 1;
              const waitMs = 300 * Math.pow(2, attempt);
              console.warn(`[MessagingHome] fetch user batch attempt ${attempt} failed, retrying in ${waitMs}ms`, err2);
              await new Promise((r) => setTimeout(r, waitMs));
            }
          }
        }
      }

      // Remove from active fetches registry
      idsToFetch.forEach(id => activeFetchesRef.current.delete(id));

      if (fetchedAll.length > 0) {
        // Save to cache
        await ChatCacheService.saveUserProfiles(fetchedAll);

        // Merge into local states
        mergeUserProfiles(fetchedAll);
      }

      printPerformanceReport();
    } catch (e) {
      console.warn('[MessagingHome] fetchMissingUserProfiles background fetch failed', e);
    }
  }, [user?._id, mergeUserProfiles, printPerformanceReport]);

  const fetchChannels = useCallback(async (isBackground = false) => {
    // Initialize/Preload memory cache if not initialized yet
    await ChatCacheService.initialize();

    // Cancel any previous pending requests before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Reset perf timer if not loading in background
    if (!isBackground) {
      perfStats.current.startTime = Date.now();
      perfStats.current.profilesFromApi = 0;
      perfStats.current.duplicateRequestsPrevented = 0;
      perfStats.current.failedRequests = 0;
      perfStats.current.batchRequestsExecuted = 0;
      perfStats.current.apiResponseTimes = [];
    }

    // 1. Immediately load cache to render conversations optimistically
    try {
      const cached = await ChatCacheService.getChannels();
      const cachedProfiles = await ChatCacheService.getUserProfiles();
      
      if (cachedProfiles.length > 0) {
        setUsers(cachedProfiles);
      }
      
      if (cached && cached.length > 0) {
        // Map cached profiles to cached channels
        const enriched = cached.map((c: any) => {
          const parts = c.participants || c.members || c.userIds || c.participantIds || [];
          if (Array.isArray(parts) && parts.length > 0) {
            const mappedParts = parts.map((p: any) => {
              const pid = typeof p === 'string' ? p : (p._id || p.id || p.userId || p._userId);
              const found = cachedProfiles.find((fu: any) => String(fu._id || fu.id) === String(pid));
              return found ? { ...p, ...found } : p;
            });
            return { ...c, participants: mappedParts };
          }
          return c;
        });

        setChannels(enriched);
        setLoading(false);

        // Fetch presence statuses for participants
        const userIds = enriched
          .filter(isDMChannel)
          .map((c: any) => findOtherParticipant(c))
          .filter(Boolean)
          .map((other: any) => String(other._id || other.id));
        if (userIds.length > 0) {
          fetchStatuses(userIds);
        }

        // Kick off background user fetching immediately
        fetchMissingUserProfiles(enriched, signal);
      }
    } catch (err) {
      console.warn('Failed to load cached channels list', err);
    }

    // 2. Fetch fresh channels from network in the background (timeout 8 seconds)
    try {
      const res = await http.get('/channels', { 
        timeout: 8000, 
        signal 
      });
      const fresh = res.data?.data || [];

      // Save channels to cache
      await ChatCacheService.saveChannels(fresh);

      // Merge cached profiles into fresh channels to prevent name/avatar flashing
      const cachedProfiles = await ChatCacheService.getUserProfiles();
      const enrichedFresh = fresh.map((c: any) => {
        const parts = c.participants || c.members || c.userIds || c.participantIds || [];
        if (Array.isArray(parts) && parts.length > 0) {
          const mappedParts = parts.map((p: any) => {
            const pid = typeof p === 'string' ? p : (p._id || p.id || p.userId || p._userId);
            const found = cachedProfiles.find((fu: any) => String(fu._id || fu.id) === String(pid));
            return found ? { ...p, ...found } : p;
          });
          return { ...c, participants: mappedParts };
        }
        return c;
      });

      setChannels(enrichedFresh);

      // Fetch statuses
      const userIds = enrichedFresh
        .filter(isDMChannel)
        .map((c: any) => findOtherParticipant(c))
        .filter(Boolean)
        .map((other: any) => String(other._id || other.id));
      if (userIds.length > 0) {
        fetchStatuses(userIds);
      }

      // Fetch missing user profiles in background
      fetchMissingUserProfiles(enrichedFresh, signal);
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.message === 'canceled') return;
      console.warn('Failed to fetch fresh channels, using cached data if available', err);
    } finally {
      setLoading(false);
    }
  }, [fetchStatuses, fetchMissingUserProfiles]);

  useEffect(() => {
    fetchChannels();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
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
        const allUsers = res.data?.data || [];
        setUsers(allUsers);
        // Fetch presence statuses for all users so the Active Now section works
        const allUserIds = allUsers
          .map((u: any) => String(u._id || u.id))
          .filter((id: string) => id && id !== String(user?._id));
        if (allUserIds.length > 0) {
          fetchStatuses(allUserIds);
        }
      } catch (err) {
        setUsers([]);
      }
      try {
        const baseURL = http.defaults.baseURL || '';
        const msgBaseUrl = resolveMessagingServiceUrl(baseURL);
        const res = await http.get(`${msgBaseUrl}/channels/discover`);
        setPublicChannels(res.data?.data || []);
      } catch (err) {
        setPublicChannels([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, []);

  // Refresh channels when screen is focused so recently-active chats jump to top
  useFocusEffect(
    useCallback(() => {
      fetchChannels(true);
      return () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }, [fetchChannels])
  );

  const [creatingContactFor, setCreatingContactFor] = useState<string | null>(null);
  const [joiningChannelId, setJoiningChannelId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const findOtherParticipant = useCallback((channel: any) => {
    if (!channel || !user) return null;
    const myId = String((user as any)._id || (user as any).id || '');
    const parts = channel.participants || channel.members || channel.participantIds || channel.userIds;

    let otherEntry: any = null;
    if (parts && Array.isArray(parts)) {
      otherEntry = parts.find((p: any) => {
        const pid = typeof p === 'string' ? p : String(p.userId || p._id || p.id || '');
        return pid && pid !== myId;
      });
    }

    if (!otherEntry) {
      // fallback: try parse ids from channel.name (some DM names contain both ids)
      if (channel.name && typeof channel.name === 'string') {
        const matches = channel.name.match(/[0-9a-fA-F]{24}/g);
        if (matches) {
          const otherId = matches.find((mId: string) => mId !== myId);
          if (otherId) {
            const found = users.find(u => String(u._id) === otherId || String(u.id) === otherId);
            return found || { _id: otherId, fullName: null, avatarUrl: null };
          }
        }
      }
      return null;
    }

    if (typeof otherEntry === 'string') {
      const found = users.find(u => String(u._id) === otherEntry || String(u.id) === otherEntry);
      return found || { _id: otherEntry, fullName: null, avatarUrl: null };
    }

    // Participant is an enriched object — use it directly
    const pid = String(otherEntry.userId || otherEntry._id || otherEntry.id || '');
    // Check local users cache for the freshest profile
    const cached = users.find(u => String(u._id) === pid || String(u.id) === pid);
    return cached || {
      _id: pid,
      id: pid,
      fullName: otherEntry.fullName || otherEntry.name || otherEntry.displayName || null,
      avatarUrl: otherEntry.avatarUrl || otherEntry.avatar || null,
    };
  }, [user, users]);

  const getChannelDisplay = useCallback((channel: any) => {
    const d = getDisplayForChannel(channel, user);
    let name = d.name;
    let avatarUrl = d.avatar;

    // If this is a DM and the helper returned an id-like name (hex), try to resolve using participant/user cache
    const looksLikeId = typeof name === 'string' && /^[0-9a-fA-F]{6,}$/.test(name);
    if (d.isDM && looksLikeId) {
      const other = findOtherParticipant(channel);
      if (other) {
        name = other.fullName || other.name || other.displayName || name;
        avatarUrl = other.avatarUrl || other.avatar || avatarUrl;
      }
    }

    return { name, avatarUrl, isDM: d.isDM };
  }, [user, findOtherParticipant]);

  const isMemberOfChannel = useCallback((channel: any) => {
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
  }, [user]);

  const filteredChannels = useMemo(() => {
    if (activeTab === 'contacts') return [];
    if (activeTab === 'groups') return channels.filter(isGroupChannel);
    // all: include groups and DMs; for public 'channel' types show only if user is a member (or it's general)
    return channels.filter(c => {
      if (isGroupChannel(c)) return true;
      if (isDMChannel(c)) return true;
      const name = (c.name || '').toString().toLowerCase();
      if (name.includes('general')) return true;
      return isMemberOfChannel(c);
    });
  }, [channels, activeTab]);

  // Unified sort: ALL conversations ordered by lastMessageDate descending (newest → top).
  // This matches WhatsApp / Instagram / Messenger / Telegram behavior.
  const sortedChannels = useMemo(() => {
    const list = filteredChannels ? [...filteredChannels] : [];
    list.sort((a: any, b: any) => {
      const ta = a?.lastMessage?.createdAt || a?.updatedAt || a?.createdAt || 0;
      const tb = b?.lastMessage?.createdAt || b?.updatedAt || b?.createdAt || 0;
      const timeA = ta ? new Date(ta).getTime() : 0;
      const timeB = tb ? new Date(tb).getTime() : 0;
      return timeB - timeA;
    });
    return list;
  }, [filteredChannels]);

  const searchResults = useMemo(() => {
    const query = (searchQuery || '').toLowerCase();
    if (!query) return [];
    const filteredUsers = users
      .filter(u => (u.fullName || u.name || u.displayName || '').toLowerCase().includes(query))
      .map(u => ({ ...u, isUser: true }));
    const filteredChannels = publicChannels
      .filter(c => (c.name || c.description || '').toLowerCase().includes(query))
      .map(c => ({ ...c, isChannel: true }));
    return [...filteredChannels, ...filteredUsers];
  }, [users, publicChannels, searchQuery]);

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

  const contactUser = useCallback(async (targetId: string) => {
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
  }, [navigation]);

  const joinChannel = useCallback(async (channel: any) => {
    if (!channel) return;
    const channelId = String(channel._id || channel.id || channel.channelId || '');
    if (!channelId) return;
    setJoiningChannelId(channelId);
    try {
      // try join endpoint; backend may accept POST /channels/:id/join
      const res = await http.post(`/channels/${channelId}/join`);
      const joined = res.data?.data || channel;
      // add to local channels list if not present
      setChannels(prev => {
        const exists = prev.find(c => String(c._id || c.id) === String(channelId));
        if (exists) {
          return prev.map(c => String(c._id || c.id) === String(channelId) ? { ...c, ...(joined || {}) } : c);
        }
        return [joined, ...prev];
      });
      // navigate to discussion
      navigation.navigate('CommunityChat', { initialChannel: joined, channelId: channelId });
    } catch (err) {
      try {
        // fallback: attempt to add member via members endpoint
        await http.post(`/channels/${channelId}/members`, { userId: user?._id });
        navigation.navigate('CommunityChat', { initialChannel: channel, channelId });
      } catch (err2) {
        console.error('Failed to join channel', err, err2);
        Alert.alert(t('Error'), t('Failed to join channel'));
      }
    } finally {
      setJoiningChannelId(null);
    }
  }, [user?._id, setChannels, navigation, t]);

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

  const togglePinChannel = useCallback(async (channel: any) => {
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
  }, [setChannels, t]);

  const handleLongPressChannel = useCallback((channel: any) => {
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
  }, [getChannelDisplay, togglePinChannel, t]);

  // Attach event listeners to the global socket for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ message }: any) => {
      const cid = String(message.channelId || message.channel || '');
      setChannels((prev) => {
        let found = false;
        const next = prev.map((c) => {
          const cId = String(c._id || c.id || c.channelId || '');
          if (cId === cid) {
            found = true;
            return {
              ...c,
              lastMessage: { content: message.content, createdAt: message.createdAt || new Date().toISOString(), messageId: message.id || message._id },
              updatedAt: new Date().toISOString(),
            };
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
      setChannels((prev) => {
        const idx = prev.findIndex(c => String(c._id || c.id) === cid);
        if (idx === -1) return prev;
        const updated = {
          ...prev[idx],
          ...(lastMessage ? { lastMessage } : {}),
          ...(unreadCount !== undefined ? { unreadCount } : {}),
          updatedAt: new Date().toISOString(),
        };
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    };

    const handleChannelDeleted = ({ channelId }: any) => {
      setChannels(prev => prev.filter(c => String(c._id || c.id) !== String(channelId)));
    };

    const handleChannelCleared = ({ channelId }: any) => {
      setChannels((prev) => prev.map((c) => {
        if (String(c._id || c.id) === String(channelId)) {
          return { ...c, lastMessage: null, pinnedMessages: [] };
        }
        return c;
      }));
    };

    const handleChannelUpdated = (updated: any) => {
      if (!updated) return;
      const id = String(updated._id || updated.id || updated.channelId || '');
      if (!id) return;
      setChannels((prev) => {
        const idx = prev.findIndex(c => String(c._id || c.id) === id);
        if (idx === -1) {
          const next = [updated, ...prev];
          ChatCacheService.saveChannels(next).catch(() => {});
          return next;
        }
        const next = [...prev];
        next[idx] = { ...next[idx], ...(updated || {}) };
        ChatCacheService.saveChannels(next).catch(() => {});
        return next;
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:edited', handleMessageEdited);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('conversation:updated', handleConversationUpdated);
    socket.on('channel:updated', handleChannelUpdated);
    socket.on('channel:deleted', handleChannelDeleted);
    socket.on('channel:cleared', handleChannelCleared);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('conversation:updated', handleConversationUpdated);
      socket.off('channel:updated', handleChannelUpdated);
      socket.off('channel:deleted', handleChannelDeleted);
      socket.off('channel:cleared', handleChannelCleared);
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

  // Handle local channel deletion (e.g. from CommunityChat screen) to update list instantly
  useEffect(() => {
    const onDeleted = (channelId: any) => {
      setChannels(prev => prev.filter(c => String(c._id || c.id) !== String(channelId)));
    };
    messagingEvents.on('channel:deleted', onDeleted);
    return () => { messagingEvents.off('channel:deleted', onDeleted); };
  }, []);

  // Also listen to local message events emitted by the chat screen to update list instantly
  useEffect(() => {
    const onLocalMessage = (message: any) => {
      if (!message) return;
      const cid = String(message.channelId || message.channel || '');
      setChannels((prev) => {
        let found = false;
        const next = prev.map((c) => {
          const cId = String(c._id || c.id || c.channelId || '');
          if (cId === cid) {
            found = true;
            return {
              ...c,
              lastMessage: { content: message.content, createdAt: message.createdAt || new Date().toISOString(), messageId: message.id || message._id },
              updatedAt: new Date().toISOString(),
            };
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
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.divider, paddingHorizontal: 6, paddingRight: 12, minHeight: 68 },
    avatar: { width: 52, height: 52, borderRadius: 26 },
    rowContent: { flex: 1, marginLeft: 12, marginRight: 0 },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowName: { fontSize: 16, fontWeight: '700', color: T.text },
    rowTime: { color: T.textMuted, fontSize: 12 },
    rowSnippet: { color: T.textMuted, fontSize: 13, marginTop: 4 },
    unreadBadge: { backgroundColor: '#8BC34A', minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    unreadWrap: { justifyContent: 'center', alignItems: 'center', marginLeft: 8, paddingRight: 8 },
    contactBtn: { backgroundColor: '#8BC34A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 10, minWidth: 78, elevation: 4 },
    unreadText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    fab: { position: 'absolute', right: 18, bottom: 96, width: 64, height: 64, borderRadius: 32, backgroundColor: '#8BC34A', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 },
    bottomHandleWrap: { position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center' },
    bottomHandle: { width: 64, height: 6, borderRadius: 6, backgroundColor: T.surface, opacity: 0.95, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    optionsCard: { backgroundColor: T.surface, borderRadius: 16, padding: 20, width: '100%', maxWidth: 340, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
    optionsTitle: { fontSize: 18, fontWeight: '800', color: T.text, marginBottom: 16, textAlign: 'center' },
    optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.divider },
    optionIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginLeft: 0 },
    optionText: { fontSize: 15, fontWeight: '700', color: T.text },
    optionSubtext: { fontSize: 12, color: T.textMuted, marginTop: 2 },
    cancelBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surfaceAlt, borderRadius: 12 },
    cancelBtnText: { fontSize: 15, fontWeight: '700', color: T.textMuted }
  }), [T, isRTL]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.greetingWrap}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={20} color={T.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.searchIconWrap} onPress={() => { setSearchOpen(true); }}>
            <Ionicons name="search" size={18} color={T.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuIconWrap} onPress={() => { /* menu */ }}>
            <Ionicons name="ellipsis-vertical" size={18} color={T.text} />
          </TouchableOpacity>
        </View>
      </View>
      {/* Search modal/overlay */}
      <Modal visible={searchOpen} animationType="slide" transparent onRequestClose={() => setSearchOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', padding: 20 }}>
            <View style={{ backgroundColor: T.bg, borderRadius: 12, padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  placeholder={t('Search users') || 'Search users'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{ flex: 1, padding: 8, backgroundColor: T.surface, borderRadius: 8 }}
                  autoFocus
                />
                <TouchableOpacity style={{ marginLeft: 8 }} onPress={() => { setSearchOpen(false); setSearchQuery(''); }}>
                  <Ionicons name="close" size={22} color={T.text} />
                </TouchableOpacity>
              </View>
              <View style={{ maxHeight: 300, marginTop: 8 }}>
                {loadingUsers ? (
                  <ActivityIndicator style={{ marginTop: 20 }} />
                ) : (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(u, idx) => String(u._id || u.id || idx)}
                    renderItem={({ item }) => {
                      if (item.isChannel) {
                        return (
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}
                            onPress={() => {
                              setSearchOpen(false);
                              setSearchQuery('');
                              navigation.navigate('CommunityChat', {
                                initialChannel: item,
                                channelId: String(item._id || item.id || ''),
                              });
                            }}
                          >
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#1E4A3A' : '#D5F5E3', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                              {item.avatarUrl ? (
                                <ExpoImage source={{ uri: item.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} cachePolicy="memory-disk" />
                              ) : (
                                <Ionicons name="megaphone-outline" size={20} color={T.green || '#8BC34A'} />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: '700', color: T.text }}>{item.name}</Text>
                              <Text style={{ color: T.textMuted, fontSize: 12 }}>{item.description || t('Announcement Channel')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
                          </TouchableOpacity>
                        );
                      }

                      return (
                        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }} onPress={() => { setSearchOpen(false); setSearchQuery(''); contactUser(item._id || item.id); }}>
                          <TouchableOpacity onPress={() => { setSearchOpen(false); openUserProfile(item._id || item.id); }} activeOpacity={0.8}>
                            <ExpoImage source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName || item.name || 'U')}&background=8BC34A&color=fff` }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} cachePolicy="memory-disk" />
                          </TouchableOpacity>
                          <View>
                            <Text style={{ fontWeight: '700', color: T.text }}>{item.fullName || item.name || item.displayName}</Text>
                            <Text style={{ color: T.textMuted }}>{item.profileType || ''}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

      {/* ── Active Now Section (between tabs and chat list) ── */}
      {activeTab !== 'contacts' && (
        <ActiveNowSection
          users={users}
          currentUserId={user?._id || ''}
          isOnline={isOnline}
          getLastSeen={getLastSeen}
          onUserPress={(u: any) => {
            const uid = String(u._id || u.id);
            contactUser(uid);
          }}
          onUserLongPress={(u: any) => {
            const uid = String(u._id || u.id);
            const name = u.fullName || u.name || u.displayName || 'User';
            Alert.alert(
              name,
              '',
              [
                { text: t('View Profile'), onPress: () => openUserProfile(uid) },
                { text: t('Start Chat'), onPress: () => contactUser(uid) },
                { text: t('Cancel'), style: 'cancel' },
              ],
              { cancelable: true }
            );
          }}
          loading={loadingUsers}
          theme={T}
          isDark={isDark}
        />
      )}

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
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => openUserProfile(item._id || item.id)} activeOpacity={0.8}>
                      <ExpoImage source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName || 'U')}&background=8BC34A&color=fff` }} style={styles.avatar} cachePolicy="memory-disk" />
                    </TouchableOpacity>
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
      ) : (() => {
        // Memoize list keyExtractor and renderItem for high performance virtualization
        const mainListKeyExtractor = (i: any, idx: number) => {
          return i.isHeader ? `header-${i.title}-${idx}` : String(i._id || i.id || i.name || idx);
        };

        const mainListRenderItem = ({ item, index }: any) => {
          if (item.isHeader) {
            return (
              <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: T.green || '#8BC34A', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  {item.title}
                </Text>
              </View>
            );
          }

          return (
            <ChannelRowItem
              item={item}
              index={index}
              user={user}
              isOnline={isOnline}
              getChannelDisplay={getChannelDisplay}
              findOtherParticipant={findOtherParticipant}
              handleLongPressChannel={handleLongPressChannel}
              formatTime={formatTime}
              setChannels={setChannels}
              navigation={navigation}
              T={T}
              reducedMotion={reducedMotion}
              isRTL={isRTL}
              styles={styles}
            />
          );
        };

        return (
          <FlatList
            data={flattenedList}
            extraData={channels}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyExtractor={mainListKeyExtractor}
            renderItem={mainListRenderItem}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        );
      })()}

      

      <View style={styles.bottomHandleWrap} pointerEvents="none">
        <View style={styles.bottomHandle} />
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateOptions(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="create-outline" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Custom dropdown/options modal for web and mobile */}
      <Modal
        visible={showCreateOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateOptions(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowCreateOptions(false)}
        >
          <View style={styles.optionsCard}>
            <Text style={styles.optionsTitle}>{t('New Conversation')}</Text>
            
            <TouchableOpacity 
              style={styles.optionItem} 
              onPress={() => {
                setShowCreateOptions(false);
                navigation.navigate('CreateGroup');
              }}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: isDark ? '#1F3A4B' : '#E8F4FC' }]}>
                <Ionicons name="people" size={22} color="#3498DB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionText}>{t('New Group')}</Text>
                <Text style={styles.optionSubtext}>{t('Collaborative space for discussions')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionItem} 
              onPress={() => {
                setShowCreateOptions(false);
                navigation.navigate('CreateChannel');
              }}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: isDark ? '#1E4A3A' : '#EAF7EA' }]}>
                <Ionicons name="megaphone" size={22} color="#8BC34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionText}>{t('New Channel')}</Text>
                <Text style={styles.optionSubtext}>{t('Broadcast updates and announcements')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => setShowCreateOptions(false)}
            >
              <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <BottomNavBar
        activeTab="community"
        onPressHome={() => navigation.navigate('Home')}
        onPressEvents={() => navigation.navigate('Events')}
        onPressCenter={() => navigation.navigate('Map')}
        onPressReels={() => navigation.navigate('ReelsFeed')}
        onPressProfile={() => navigation.navigate('Profile')}
      />

      {/* User Profile Bottom Sheet */}
      <UserProfileBottomSheet
        visible={profileSheetVisible}
        onClose={closeUserProfile}
        userId={profileUserId}
        theme={T}
        isDark={isDark}
        BlurView={BlurView}
        t={t}
        onStartChat={contactUser}
      />
    </SafeAreaView>
  );
}
