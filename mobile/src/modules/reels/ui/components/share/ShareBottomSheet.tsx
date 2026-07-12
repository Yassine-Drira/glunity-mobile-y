import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context/theme.context';
import http from '@/core/network/http.client';
import messagingHttp from '@/core/network/messaging-http.client';
import { PerformanceProfiler } from '@/shared/utils/performance-profiler';
import { Reel } from '../../../services/reels.service';
import { ShareCacheService } from '../../../services/share-cache.service';
import { useAuth } from '@/modules/auth/state/auth.context';
import { getChannelDisplay } from '@/modules/community/utils/channelDisplay';
import { SearchBar } from './SearchBar';
import { GroupList } from './GroupList';
import { ChannelList } from './ChannelList';
import { UserList } from './UserList';
import { ShareItem } from './ShareItem';

interface ShareBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  reel: Reel | null;
  onShareSuccess?: (reelId: string) => void;
}

export const ShareBottomSheet = React.memo(({
  isVisible,
  onClose,
  reel,
  onShareSuccess,
}: ShareBottomSheetProps) => {
  const { theme: T } = useTheme();
  const { user } = useAuth();

  // Local Data State
  const [users, setUsers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination State for Users
  const [userPage, setUserPage] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);

  // Interaction State
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Reanimated Composer Animation
  const composerY = useSharedValue(200);

  useEffect(() => {
    composerY.value = withTiming(selectedRecipients.size > 0 ? 0 : 200, { duration: 240 });
  }, [selectedRecipients]);

  const composerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: composerY.value }],
  }));

  // Initial Data Load (Instant opening)
  useEffect(() => {
    if (isVisible) {
      const openTimeStart = Date.now();
      PerformanceProfiler.start('OpenShareBottomSheet');

      // Reset interaction states
      setSelectedRecipients(new Set());
      setShareSearchQuery('');
      setMessageText('');
      setUserPage(0);
      setHasMoreUsers(true);

      const cached = ShareCacheService.getCachedData();
      if (cached) {
        setUsers(cached.users);
        setChannels(cached.channels);
        setLoading(false);
        PerformanceProfiler.end('OpenShareBottomSheet', 'UI');
        console.log(`[PerfProfiler] [UI] OpenShareBottomSheet loaded instantly from cache in ${Date.now() - openTimeStart}ms`);
      } else {
        setLoading(true);
        // Load data in parallel
        loadInitialData().then(() => {
          PerformanceProfiler.end('OpenShareBottomSheet', 'UI');
        });
      }
    }
  }, [isVisible]);

  const loadInitialData = async () => {
    const apiStart = Date.now();
    try {
      const data = await ShareCacheService.prefetch();
      setUsers(data.users);
      setChannels(data.channels);
      const apiDuration = Date.now() - apiStart;
      console.log(`[PerfProfiler] [API] Share sheet initial API load took ${apiDuration}ms`);
    } catch (err) {
      console.warn('[ShareBottomSheet] Failed to load targets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load More Users (Infinite Pagination)
  const loadMoreUsers = useCallback(async () => {
    if (!hasMoreUsers || loadingMoreUsers || shareSearchQuery.trim() !== '') return;
    setLoadingMoreUsers(true);
    const apiStart = Date.now();
    try {
      const nextPage = userPage + 1;
      const res = await http.get('/users', { params: { limit: 20, skip: nextPage * 20 } });
      const usersList = res.data?.data || res.data || [];
      
      const apiDuration = Date.now() - apiStart;
      console.log(`[PerfProfiler] [API] Load more users page ${nextPage} took ${apiDuration}ms`);

      if (usersList.length > 0) {
        setUsers((prev) => [...prev, ...usersList]);
        setUserPage(nextPage);
      }
      if (usersList.length < 20) {
        setHasMoreUsers(false);
      }
    } catch (err) {
      console.warn('[ShareBottomSheet] Failed to load more users:', err);
      setHasMoreUsers(false);
    } finally {
      setLoadingMoreUsers(false);
    }
  }, [hasMoreUsers, loadingMoreUsers, userPage, shareSearchQuery]);

  // Toggle selection
  const toggleSelection = useCallback((id: string) => {
    setSelectedRecipients(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Format DMs, Groups, and Users for rendering
  const formattedGroups = useMemo(() => {
    return channels
      .filter(c => {
        const info = getChannelDisplay(c, user);
        return !info.isDM;
      })
      .map(c => {
        const info = getChannelDisplay(c, user);
        return {
          id: c._id || c.id,
          name: info.name,
          avatarUrl: info.avatar,
          isChannel: true,
          subtitle: 'Group Chat',
        };
      });
  }, [channels, user]);

  const formattedDMs = useMemo(() => {
    return channels
      .filter(c => {
        const info = getChannelDisplay(c, user);
        return info.isDM;
      })
      .map(c => {
        const info = getChannelDisplay(c, user);
        return {
          id: c._id || c.id,
          name: info.name,
          avatarUrl: info.avatar,
          isChannel: true,
          subtitle: 'Direct Message',
        };
      });
  }, [channels, user]);

  const formattedUsers = useMemo(() => {
    return users.map(u => ({
      id: u._id || u.id,
      name: u.fullName || u.name || 'User',
      avatarUrl: u.avatarUrl || u.avatar?.url || null,
      isChannel: false,
      subtitle: `@${(u.fullName || '').replace(/\s+/g, '').toLowerCase()}`,
    }));
  }, [users]);

  // Combined targets for search results lookup
  const combinedTargets = useMemo(() => {
    return [
      ...formattedGroups,
      ...formattedDMs,
      ...formattedUsers,
    ];
  }, [formattedGroups, formattedDMs, formattedUsers]);

  // Debounced Local Search Filtering
  const filteredTargets = useMemo(() => {
    const query = shareSearchQuery.toLowerCase().trim();
    if (!query) return [];

    return combinedTargets.filter(item =>
      item.name.toLowerCase().includes(query) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(query))
    );
  }, [combinedTargets, shareSearchQuery]);

  // Send reel to selected targets
  const sendToSelected = async () => {
    if (!reel || selectedRecipients.size === 0) return;
    const apiStart = Date.now();
    const ids = Array.from(selectedRecipients);
    setIsSending(true);

    try {
      // Send message to all selected targets in sequence or parallel.
      // Parallel is faster, but sequential is safer for DMs creation flow.
      // We will parallelize the operations to keep it extremely fast
      const sendPromises = ids.map(async (id) => {
        const target = combinedTargets.find(t => t.id === id);
        if (!target) return;

        let destChannelId = target.id;
        
        // If target is a User, create/get a DM channel first
        if (!target.isChannel) {
          let dmRes;
          try {
            dmRes = await messagingHttp.post('/channels/dm', { targetUserId: target.id });
          } catch (e) {
            dmRes = await http.post('/channels/direct', { userId: target.id });
          }
          const dmChannel = dmRes.data?.data || dmRes.data;
          destChannelId = dmChannel._id || dmChannel.id;
        }

        const trimmedMessage = messageText && messageText.trim() ? messageText.trim() : '';
        const reelId = reel.id || (reel as any)._id;
        const thumbUrl = reel.thumbnailUrl || (reel as any).thumbnail || (reel.videoUrl ? reel.videoUrl.replace(/\.[a-z0-9]+$/i, '.jpg') : '');

        try {
          await messagingHttp.post(`/channels/${destChannelId}/reels`, {
            reelId,
            caption: trimmedMessage || undefined,
          });
        } catch (e) {
          await http.post(`/channels/${destChannelId}/messages`, {
            content: trimmedMessage || undefined,
            text: trimmedMessage || undefined,
            type: 'reel',
            reelRef: {
              reelId,
              thumbnailUrl: thumbUrl,
              title: reel.caption || 'Shared Reel',
            },
          });
        }

        if (onShareSuccess) {
          onShareSuccess(reel.id);
        }
      });

      await Promise.all(sendPromises);

      const apiDuration = Date.now() - apiStart;
      console.log(`[PerfProfiler] [API] Sent reel to ${ids.length} recipients in ${apiDuration}ms`);

      setSelectedRecipients(new Set());
      setMessageText('');
      onClose();
    } catch (err) {
      console.warn('Failed to share reel:', err);
      Alert.alert('Error', 'Failed to share reel to one or more recipients.');
    } finally {
      setIsSending(false);
    }
  };

  // Render horizontal lists inside header to prevent VirtalizedList conflict
  const listHeader = useCallback(() => {
    if (shareSearchQuery.trim() !== '') return null;
    return (
      <View>
        <GroupList
          groups={formattedGroups}
          selectedRecipients={selectedRecipients}
          onToggle={toggleSelection}
        />
        <ChannelList
          channels={formattedDMs}
          selectedRecipients={selectedRecipients}
          onToggle={toggleSelection}
        />
      </View>
    );
  }, [formattedGroups, formattedDMs, selectedRecipients, toggleSelection, shareSearchQuery]);

  const renderSearchItem = useCallback(({ item }: { item: any }) => (
    <ShareItem
      item={item}
      selected={selectedRecipients.has(item.id)}
      onToggle={toggleSelection}
      layout="list"
    />
  ), [selectedRecipients, toggleSelection]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.shareOverlay}>
        <View style={[styles.shareContainer, { backgroundColor: T.surface, borderColor: T.border }]}>
          {/* Header */}
          <View style={[styles.shareHeader, { borderBottomColor: T.divider }]}>
            <Text style={[styles.shareTitle, { color: T.text }]}>Share Reel</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={T.text} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <SearchBar
            value={shareSearchQuery}
            onChangeQuery={setShareSearchQuery}
          />

          {/* Content Lists */}
          {loading ? (
            <ActivityIndicator size="large" color="#6DAE3F" style={styles.mainLoader} />
          ) : shareSearchQuery.trim() !== '' ? (
            // Search Results List
            filteredTargets.length === 0 ? (
              <Text style={[styles.emptyShareText, { color: T.textMuted }]}>No recipients found</Text>
            ) : (
              <FlatList
                data={filteredTargets}
                keyExtractor={(item) => item.id}
                renderItem={renderSearchItem}
                removeClippedSubviews={true}
                initialNumToRender={10}
                windowSize={5}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.searchListContent}
              />
            )
          ) : (
            // Standard Categorized Suggested List
            <UserList
              users={formattedUsers}
              selectedRecipients={selectedRecipients}
              onToggle={toggleSelection}
              loadMore={loadMoreUsers}
              loadingMore={loadingMoreUsers}
              hasMore={hasMoreUsers}
              ListHeaderComponent={listHeader}
            />
          )}

          {/* Composer Send Bar */}
          <Animated.View style={[styles.composerContainer, composerAnimatedStyle, { backgroundColor: T.surface, shadowColor: T.shadow }]}>
            <TextInput
              style={[styles.composerInput, { backgroundColor: T.inputBg, color: T.text }]}
              placeholder="Add a message (optional)"
              placeholderTextColor={T.textMuted}
              value={messageText}
              onChangeText={setMessageText}
            />
            <TouchableOpacity
              style={[styles.sendButton, selectedRecipients.size === 0 && styles.sendButtonDisabled]}
              disabled={selectedRecipients.size === 0 || isSending}
              onPress={sendToSelected}
            >
              <Text style={styles.sendButtonText}>{isSending ? 'Sending...' : 'Send'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  shareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  shareContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -6 },
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  shareTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  mainLoader: {
    marginTop: 40,
  },
  emptyShareText: {
    textAlign: 'center',
    marginVertical: 40,
    fontSize: 14,
  },
  searchListContent: {
    paddingBottom: 120, // space for composer
  },
  composerContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 100,
  },
  composerInput: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  sendButton: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2E74FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#A3C1FF',
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
