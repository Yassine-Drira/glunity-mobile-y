import AsyncStorage from '@react-native-async-storage/async-storage';

export class ChatCacheService {
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

  private static buildCachePayload(messages: any[], limit: number): string {
    return JSON.stringify(messages.slice(-limit).map((message) => this.compactMessage(message)));
  }

  /**
   * Caches message history for a specific channel
   * Limits cached history to a compact payload and retries with smaller slices when storage is low
   */
  static async saveMessages(channelId: string, messages: any[]): Promise<void> {
    try {
      if (!channelId || !Array.isArray(messages) || messages.length === 0) {
        return;
      }

      const key = `CHAT_CACHE:messages:${channelId}`;
      const sliceSizes = [100, 60, 40, 20, 10];
      let lastError: any = null;

      for (const sliceSize of sliceSizes) {
        const payload = this.buildCachePayload(messages, sliceSize);

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
    } catch (err) {
      console.warn('[ChatCacheService] saveMessages failed', err);
    }
  }

  /**
   * Retrieves cached message history for a specific channel
   */
  static async getMessages(channelId: string): Promise<any[]> {
    try {
      const key = `CHAT_CACHE:messages:${channelId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
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
      const key = 'CHAT_CACHE:channels_list';
      try {
        await AsyncStorage.setItem(key, JSON.stringify(channels));
      } catch (err: any) {
        if (err.name === 'QuotaExceededError' || String(err.message).toLowerCase().includes('quota')) {
          const keys = await AsyncStorage.getAllKeys();
          const chatMsgKeys = keys.filter((k) => k.startsWith('CHAT_CACHE:messages:'));
          if (chatMsgKeys.length > 0) {
            await AsyncStorage.multiRemove(chatMsgKeys);
            await AsyncStorage.setItem(key, JSON.stringify(channels));
          }
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.warn('[ChatCacheService] saveChannels failed', err);
    }
  }

  /**
   * Retrieves the cached list of active channels
   */
  static async getChannels(): Promise<any[]> {
    try {
      const key = 'CHAT_CACHE:channels_list';
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
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
      const key = 'CHAT_CACHE:user_profiles';
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
      await AsyncStorage.setItem(key, JSON.stringify(Array.from(map.values())));
    } catch (err) {
      console.warn('[ChatCacheService] saveUserProfiles failed', err);
    }
  }

  /**
   * Retrieves cached user profiles
   */
  static async getUserProfiles(): Promise<any[]> {
    try {
      const key = 'CHAT_CACHE:user_profiles';
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
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
