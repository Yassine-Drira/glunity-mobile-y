import http from '../../../core/network/http.client';
import messagingHttp from '../../../core/network/messaging-http.client';
import { PerformanceProfiler } from '../../../shared/utils/performance-profiler';

export interface ShareCacheData {
  users: any[];
  channels: any[];
}

export class ShareCacheService {
  private static cache: ShareCacheData | null = null;
  private static lastFetched = 0;
  private static TTL = 5 * 60 * 1000; // 5 minutes expiration
  private static prefetchPromise: Promise<ShareCacheData> | null = null;

  /**
   * Prefetch users and channels in parallel, caching the results.
   * If cache is valid, returns cached data immediately.
   */
  static async prefetch(): Promise<ShareCacheData> {
    if (this.cache && (Date.now() - this.lastFetched < this.TTL)) {
      return this.cache;
    }

    if (this.prefetchPromise) {
      return this.prefetchPromise;
    }

    this.prefetchPromise = (async () => {
      PerformanceProfiler.start('PrefetchShareTargets');
      const startTime = Date.now();
      try {
        // Fetch channels: try messagingHttp, fallback to http, fallback to empty array
        const channelsPromise = messagingHttp.get('/channels')
          .then(res => res.data?.data || res.data || [])
          .catch(() => 
            http.get('/channels')
              .then(res => res.data?.data || res.data || [])
              .catch(() => [])
          );

        // Fetch users page 0 (limit 20)
        const usersPromise = http.get('/users', { params: { limit: 20, skip: 0 } })
          .then(res => res.data?.data || res.data || [])
          .catch(() => []);

        const [channels, users] = await Promise.all([channelsPromise, usersPromise]);

        const duration = Date.now() - startTime;
        PerformanceProfiler.end('PrefetchShareTargets', 'Network');
        console.log(`[PerfProfiler] [API] Prefetched ${users.length} users and ${channels.length} channels in ${duration}ms`);

        this.cache = { users, channels };
        this.lastFetched = Date.now();
        return this.cache;
      } catch (error) {
        console.warn('[ShareCacheService] Prefetch failed:', error);
        return { users: [], channels: [] };
      } finally {
        this.prefetchPromise = null;
      }
    })();

    return this.prefetchPromise;
  }

  /**
   * Get currently cached data, if valid.
   */
  static getCachedData(): ShareCacheData | null {
    if (this.cache && (Date.now() - this.lastFetched < this.TTL)) {
      return this.cache;
    }
    return null;
  }

  /**
   * Manually invalidate cache.
   */
  static clearCache(): void {
    this.cache = null;
    this.lastFetched = 0;
  }
}
