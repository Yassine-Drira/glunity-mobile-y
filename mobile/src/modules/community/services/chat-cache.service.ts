import AsyncStorage from '@react-native-async-storage/async-storage';
import { PerformanceProfiler } from '../../../shared/utils/performance-profiler';

export class ChatCacheService {
  // Synchronous JavaScript memory cache
  private static messagesCache = new Map<string, any[]>();
  private static channelsCache: any[] | null = null;
  private static userProfilesCache: any[] | null = null;
  private static isInitialized = false;

  /**
   * Preload critical data (channels list, user profiles) from AsyncStorage into memory cache.
   * Can be called during app boot.
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    PerformanceProfiler.start('CachePreload');
    try {
      const keys = ['CHAT_CACHE:channels_list', 'CHAT_CACHE:user_profiles'];
      const pairs = await AsyncStorage.multiGet(keys);
      
      for (const [key, value] of pairs) {
        if (value) {
          const parsed = JSON.parse(value);
          if (key === 'CHAT_CACHE:channels_list') {
            this.channelsCache = parsed;
          } else if (key === 'CHAT_CACHE:user_profiles') {
            this.userProfilesCache = parsed;
          }
        }
      }
      this.isInitialized = true;
      PerformanceProfiler.end('CachePreload', 'Cache');
      console.log('[ChatCacheService] Memory cache preloaded successfully.');
    } catch (err) {
      console.warn('[ChatCacheService] Memory cache preload failed:', err);
    }
  }

  private static compactAttachment(attachment: any): any {
    if (!attachment || typeof attachment !== 'object') return attachment;
    const { type, url, thumbnailUrl, filename, duration, mimeType, width, height } = attachment;
    const compact: any = { type, url };
    if (thumbnailUrl) compact.thumbnailUrl = thumbnailUrl;
    if (filename) compact.filename = filename;
    if (duration != null) compact.duration = duration;
    if (mimeType) compact.mimeType = mimeType;
    if (width != null) compact.width = width;
    if (height != null) compact.height = height;
    return compact;
  }

  private static compactMessage(message: any): any {
    if (!message || typeof message !== 'object') return message;

    const senderId = typeof message.senderId === 'object' && message.senderId
      ? (message.senderId._id || message.senderId.id || message.senderId)
      : message.senderId;

    const compact: any = {
      id: message.id || message._id,
      _id: message._id || message.id,
      channelId: message.channelId || message.channel,
      type: message.type,
      content: message.content,
      senderId,
      senderName: message.senderName || (message.senderId && typeof message.senderId === 'object'
        ? message.senderId.fullName || message.senderId.name || message.senderId.username
        : undefined),
      senderAvatarUrl: message.senderAvatarUrl || (message.senderId && typeof message.senderId === 'object'
        ? message.senderId.avatar?.url || message.senderId.avatarUrl
        : undefined),
      createdAt: message.createdAt || message.created_at,
      editedAt: message.editedAt,
      deletedAt: message.deletedAt,
      status: message.status,
      reactionCounts: message.reactionCounts,
      pinned: message.pinned,
    };

    if (message.replyTo) {
      compact.replyTo = {
        messageId: message.replyTo.messageId,
        senderName: message.replyTo.senderName,
        preview: message.replyTo.preview,
      };
    }

    if (Array.isArray(message.attachments)) {
      compact.attachments = message.attachments.map((attachment: any) => this.compactAttachment(attachment));
    }

    if (message.reelRef) {
      compact.reelRef = {
        reelId: message.reelRef.reelId,
        thumbnailUrl: message.reelRef.thumbnailUrl || message.reelRef.thumbnail,
        title: message.reelRef.title,
        duration: message.reelRef.duration,
        ownerName: message.reelRef.ownerName,
        ownerAvatar: message.reelRef.ownerAvatar,
        isDeleted: message.reelRef.isDeleted,
      };
    }

    return compact;
  }

  private static buildCachePayload(messages: any[], limit: number): any[] {
    return messages.slice(-limit).map((message) => this.compactMessage(message));
  }

  /**
   * Caches message history for a specific channel
   * Synchronously updates memory cache and handles write-through to AsyncStorage asynchronously.
   */
  static async saveMessages(channelId: string, messages: any[]): Promise<void> {
    try {
      if (!channelId || !Array.isArray(messages) || messages.length === 0) {
        return;
      }

      // Compact messages & update memory cache synchronously
      const compacted = this.buildCachePayload(messages, 100);
      this.messagesCache.set(channelId, compacted);

      // Async write-through to AsyncStorage
      const key = `CHAT_CACHE:messages:${channelId}`;
      const payload = JSON.stringify(compacted);

      // Fire and forget storage write
      this.asyncSaveToStorage(key, payload).catch((err) => {
        console.warn(`[ChatCacheService] Background save failed for key ${key}:`, err);
      });
    } catch (err) {
      console.warn('[ChatCacheService] saveMessages failed', err);
    }
  }

  private static async asyncSaveToStorage(key: string, payload: string): Promise<void> {
    const sliceSizes = [100, 60, 40, 20, 10];
    let lastError: any = null;

    for (const sliceSize of sliceSizes) {
      try {
        await AsyncStorage.setItem(key, payload);
        return;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '').toLowerCase();
        const isQuotaError = err?.name === 'QuotaExceededError' || msg.includes('quota');

        if (!isQuotaError) {
          throw err;
        }

        // Handle QuotaExceededError by clearing other caches
        const keys = await AsyncStorage.getAllKeys();
        const otherChatKeys = keys.filter((k) => k.startsWith('CHAT_CACHE:messages:') && k !== key);

        if (otherChatKeys.length > 0) {
          await AsyncStorage.multiRemove(otherChatKeys);
        } else {
          const allChatKeys = keys.filter((k) => k.startsWith('CHAT_CACHE:'));
          if (allChatKeys.length > 0) {
            await AsyncStorage.multiRemove(allChatKeys);
          }
        }
      }
    }

    if (lastError) {
      console.warn('[ChatCacheService] saveMessages still failed after retries', lastError);
    }
  }

  /**
   * Retrieves cached message history for a specific channel.
   * Resolves instantly from memory cache if available, falling back to AsyncStorage.
   */
  static async getMessages(channelId: string): Promise<any[]> {
    PerformanceProfiler.start(`getMessages:${channelId}`);
    // Check memory cache first (instant lookup)
    if (this.messagesCache.has(channelId)) {
      const memCached = this.messagesCache.get(channelId) || [];
      PerformanceProfiler.end(`getMessages:${channelId}`, 'CacheMemoryHit');
      return memCached;
    }

    try {
      const key = `CHAT_CACHE:messages:${channelId}`;
      const data = await AsyncStorage.getItem(key);
      const parsed = data ? JSON.parse(data) : [];
      
      // Store in memory cache for future instant reads
      this.messagesCache.set(channelId, parsed);
      
      PerformanceProfiler.end(`getMessages:${channelId}`, 'CacheDiskHit');
      return parsed;
    } catch (err) {
      console.warn('[ChatCacheService] getMessages failed', err);
      return [];
    }
  }

  /**
   * Caches the list of active channels/conversations
   */
  static async saveChannels(channels: any[]): Promise<void> {
    try {
      // Update memory cache synchronously
      this.channelsCache = channels;

      // Async write-through
      const key = 'CHAT_CACHE:channels_list';
      const payload = JSON.stringify(channels);
      
      AsyncStorage.setItem(key, payload).catch(async (err: any) => {
        if (err.name === 'QuotaExceededError' || String(err.message).toLowerCase().includes('quota')) {
          const keys = await AsyncStorage.getAllKeys();
          const chatMsgKeys = keys.filter((k) => k.startsWith('CHAT_CACHE:messages:'));
          if (chatMsgKeys.length > 0) {
            await AsyncStorage.multiRemove(chatMsgKeys);
            await AsyncStorage.setItem(key, payload);
          }
        }
      });
    } catch (err) {
      console.warn('[ChatCacheService] saveChannels failed', err);
    }
  }

  /**
   * Retrieves the cached list of active channels
   */
  static async getChannels(): Promise<any[]> {
    if (this.channelsCache !== null) {
      return this.channelsCache;
    }

    try {
      const key = 'CHAT_CACHE:channels_list';
      const data = await AsyncStorage.getItem(key);
      const parsed = data ? JSON.parse(data) : [];
      this.channelsCache = parsed;
      return parsed;
    } catch (err) {
      console.warn('[ChatCacheService] getChannels failed', err);
      return [];
    }
  }

  /**
   * Caches user profiles
   */
  static async saveUserProfiles(users: any[]): Promise<void> {
    try {
      const existing = await this.getUserProfiles();
      const map = new Map(existing.map((u: any) => [String(u._id || u.id), u]));
      
      users.forEach((u) => {
        if (u) {
          map.set(String(u._id || u.id), {
            _id: u._id || u.id,
            id: u.id || u._id,
            fullName: u.fullName || u.name,
            avatarUrl: u.avatarUrl || u.avatar?.url || null,
            profileType: u.profileType,
            cachedAt: Date.now()
          });
        }
      });

      const updatedList = Array.from(map.values());
      this.userProfilesCache = updatedList;

      const key = 'CHAT_CACHE:user_profiles';
      AsyncStorage.setItem(key, JSON.stringify(updatedList)).catch((err) => {
        console.warn('[ChatCacheService] Background saveUserProfiles failed:', err);
      });
    } catch (err) {
      console.warn('[ChatCacheService] saveUserProfiles failed', err);
    }
  }

  /**
   * Retrieves cached user profiles
   */
  static async getUserProfiles(): Promise<any[]> {
    if (this.userProfilesCache !== null) {
      return this.userProfilesCache;
    }

    try {
      const key = 'CHAT_CACHE:user_profiles';
      const data = await AsyncStorage.getItem(key);
      const parsed = data ? JSON.parse(data) : [];
      this.userProfilesCache = parsed;
      return parsed;
    } catch (err) {
      console.warn('[ChatCacheService] getUserProfiles failed', err);
      return [];
    }
  }

  /**
   * Clears all cached chat keys on user logout
   */
  static async clearCache(): Promise<void> {
    try {
      // Clear memory cache synchronously
      this.messagesCache.clear();
      this.channelsCache = null;
      this.userProfilesCache = null;
      this.isInitialized = false;

      // Clear disk cache
      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter((k) => k.startsWith('CHAT_CACHE:'));
      if (chatKeys.length > 0) {
        await AsyncStorage.multiRemove(chatKeys);
      }
    } catch (err) {
      console.warn('[ChatCacheService] clearCache failed', err);
    }
  }
}
