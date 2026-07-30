/**
 * Sync Hook
 * Provides sync functionality to React components
 */

import { useEffect, useState, useCallback } from 'react';
import { Database } from '@nozbe/watermelondb';
import * as Network from 'expo-network';
import { performSync, isSyncInProgress } from '../services/syncOrchestrator';

interface UseSyncResult {
  isLoading: boolean;
  error: string | null;
  syncNow: () => Promise<void>;
  lastSyncTime: number | null;
  isOnline: boolean;
}

/**
 * Manual sync hook - allows components to trigger sync
 */
export function useManualSync(database: Database | null): UseSyncResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkNetwork = async () => {
      const state = await Network.getNetworkStateAsync();
      setIsOnline(state.isConnected ?? true);
    };

    checkNetwork();
  }, []);

  const syncNow = useCallback(async () => {
    if (!database || isSyncInProgress()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await performSync(database as Database);
      if (!result.success) {
        setError(result.errors[0] || 'Sync failed');
      } else {
        setLastSyncTime(Date.now());
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [database]);

  return { isLoading, error, syncNow, lastSyncTime, isOnline };
}

/**
 * Automatic sync hook - syncs when app becomes active and online
 */
export function useAutomaticSync(database: Database | null): void {
  useEffect(() => {
    if (!database) return;

    const subscribe = require('react-native').AppState.addEventListener('change', handleAppStateChange);

    async function handleAppStateChange(state: string) {
      if (state === 'active' && database) {
        // App became active - check connectivity
        const netInfo = await Network.getNetworkStateAsync();
        if (netInfo.isConnected) {
          // Sync in background, don't block UI
          performSync(database as Database).catch((err) => {
            console.error('Background sync failed:', err);
          });
        }
      }
    }

    return () => {
      if (subscribe?.remove) {
        subscribe.remove();
      }
    };
  }, [database]);
}

/**
 * Post-mutation sync hook - syncs after a local operation when online
 */
export function useSyncAfterMutation(database: Database | null): (entityId?: string) => Promise<void> {
  return useCallback(
    async () => {
      if (!database) return;

      // Check if online
      const netInfo = await Network.getNetworkStateAsync();
      if (!netInfo.isConnected) {
        // Offline - operation is queued, will sync later
        return;
      }

      // Online - sync immediately in background
      performSync(database).catch((err) => {
        console.warn('Post-mutation sync failed:', err);
      });
    },
    [database]
  );
}
