import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminApi } from '../api/admin.api';
import { AdminDashboardStats } from '../api/admin.types';
import { useAutoRefresh } from './useAutoRefresh';

export type DashboardPeriod = 'today' | '7d' | '30d' | '3m' | '1y';

interface DashboardState {
  stats: AdminDashboardStats | null;
  loading: boolean;
  isRevalidating: boolean;
  error: any | null;
  lastSyncAt: Date | null;
}

const PERIOD_STORAGE_KEY = 'admin_dashboard_period';
const ALL_PERIODS: DashboardPeriod[] = ['today', '7d', '30d', '3m', '1y'];

// In-memory cache across tab switches
const periodCacheRef: Record<string, { stats: AdminDashboardStats; timestamp: number }> = {};

export function useAdminDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('7d');
  const [state, setState] = useState<DashboardState>({
    stats: null,
    loading: true,
    isRevalidating: false,
    error: null,
    lastSyncAt: null,
  });

  const activePeriodRef = useRef(period);
  activePeriodRef.current = period;

  // Load initial period preference from storage
  useEffect(() => {
    AsyncStorage.getItem(PERIOD_STORAGE_KEY)
      .then((stored) => {
        if (stored && ALL_PERIODS.includes(stored as DashboardPeriod)) {
          setPeriod(stored as DashboardPeriod);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch stats for a specific period
  const fetchPeriodStats = useCallback(async (targetPeriod: DashboardPeriod, isSilent = false) => {
    const cached = periodCacheRef[targetPeriod];
    const isStale = !cached || Date.now() - cached.timestamp > 120_000; // 2 min TTL

    if (!isSilent) {
      if (cached) {
        // Instant UI update from SWR cache (0ms waiting time!)
        setState({
          stats: cached.stats,
          loading: false,
          isRevalidating: isStale,
          error: null,
          lastSyncAt: new Date(cached.timestamp),
        });

        // If cache is fresh, no need to immediately revalidate
        if (!isStale) return;
      } else {
        // First time load for this period: show skeleton
        setState((s) => ({ ...s, loading: true, isRevalidating: true, error: null }));
      }
    } else {
      setState((s) => ({ ...s, isRevalidating: true }));
    }

    try {
      const data = await adminApi.getDashboardStats(targetPeriod);
      const now = Date.now();
      periodCacheRef[targetPeriod] = { stats: data, timestamp: now };

      // Only update active screen state if current target matches user selection
      if (activePeriodRef.current === targetPeriod) {
        setState({
          stats: data,
          loading: false,
          isRevalidating: false,
          error: null,
          lastSyncAt: new Date(now),
        });
      }
    } catch (err) {
      if (activePeriodRef.current === targetPeriod) {
        setState((s) => ({
          ...s,
          loading: s.stats ? false : false,
          isRevalidating: false,
          error: s.stats ? null : err,
        }));
      }
    }
  }, []);

  // Instant period switcher
  const changePeriod = useCallback(
    (newPeriod: DashboardPeriod) => {
      if (newPeriod === period) return;
      setPeriod(newPeriod);
      AsyncStorage.setItem(PERIOD_STORAGE_KEY, newPeriod).catch(() => {});

      const cached = periodCacheRef[newPeriod];
      if (cached) {
        // INSTANT SWR UI Switch (< 1ms latency)
        setState({
          stats: cached.stats,
          loading: false,
          isRevalidating: true, // silent revalidation in background
          error: null,
          lastSyncAt: new Date(cached.timestamp),
        });
        // Silent background sync
        fetchPeriodStats(newPeriod, true);
      } else {
        fetchPeriodStats(newPeriod, false);
      }
    },
    [period, fetchPeriodStats]
  );

  // Background Prefetching of adjacent periods for instantaneous switching
  const prefetchOtherPeriods = useCallback(() => {
    const unvisited = ALL_PERIODS.filter((p) => p !== activePeriodRef.current && !periodCacheRef[p]);
    unvisited.forEach((p, idx) => {
      setTimeout(() => {
        if (!periodCacheRef[p]) {
          adminApi
            .getDashboardStats(p)
            .then((data) => {
              periodCacheRef[p] = { stats: data, timestamp: Date.now() };
            })
            .catch(() => {});
        }
      }, (idx + 1) * 600);
    });
  }, []);

  // Initial load & period effect
  useEffect(() => {
    fetchPeriodStats(period, false);

    // Trigger idle prefetching after 1 second
    const prefetchTimer = setTimeout(prefetchOtherPeriods, 1000);
    return () => clearTimeout(prefetchTimer);
  }, [period, fetchPeriodStats, prefetchOtherPeriods]);

  // 60-second background auto-refresh
  useAutoRefresh(() => fetchPeriodStats(period, true), 60_000);

  return {
    ...state,
    period,
    changePeriod,
    refresh: () => fetchPeriodStats(period, false),
  };
}
