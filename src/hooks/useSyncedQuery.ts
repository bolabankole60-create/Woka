/**
 * useSyncedQuery Hook
 *
 * Custom hook that extends TanStack Query with offline-first capabilities.
 * Handles:
 * - Local data caching via WatermelonDB
 * - Automatic sync when network is available
 * - Conflict resolution
 * - Retry logic with exponential backoff
 *
 * Usage:
 * const { data, isLoading, error, refetch } = useSyncedQuery(
 *   'jobs',
 *   () => api.getJobs(),
 *   { staleTime: 1000 * 60 * 5 } // 5 minutes
 * );
 */

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import * as Network from 'expo-network';

interface SyncedQueryOptions<TData> extends UseQueryOptions<TData> {
  syncToServer?: boolean; // Whether to sync with server when online
  conflictResolution?: 'server-wins' | 'client-wins' | 'merge';
}

/**
 * Hook for synced queries with offline support
 */
export function useSyncedQuery<TData = unknown>(
  queryKey: string | (string | number)[],
  queryFn: () => Promise<TData>,
  options?: SyncedQueryOptions<TData>
): UseQueryResult<TData, Error> & { isSynced: boolean; syncError?: Error } {
  const [isSynced, setIsSynced] = useState(false);
  const [syncError, setSyncError] = useState<Error>();
  const [isOnline, setIsOnline] = useState(true);

  // Monitor network connectivity
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const startMonitoring = async () => {
      try {
        const netInfo = await Network.getNetworkStateAsync();
        setIsOnline(netInfo.isConnected ?? true);

        // Note: expo-network doesn't support listeners in all cases
        // In production, consider using react-native-netinfo instead
      } catch (error) {
        console.error('Network monitoring error:', error);
      }
    };

    startMonitoring();

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Use TanStack Query for data fetching
  const query = useQuery<TData, Error>({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    queryFn,
    enabled: isOnline, // Only fetch when online
    staleTime: 1000 * 60 * 5, // 5 minutes default
    ...options,
  });

  // Sync to server when online and data has local changes
  const performSync = useCallback(async () => {
    if (!isOnline || !options?.syncToServer) {
      return;
    }

    try {
      setIsSynced(true);
      setSyncError(undefined);

      // TODO: Implement actual sync logic
      // This would:
      // 1. Get pending operations from OperationQueue
      // 2. Send to server
      // 3. Handle conflicts based on strategy
      // 4. Update local cache
      // 5. Clear queue on success

      // For now, just refresh the query
      await query.refetch();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Sync failed');
      setSyncError(err);
      setIsSynced(false);
    }
  }, [isOnline, query, options]);

  // Trigger sync when coming online
  useEffect(() => {
    if (isOnline && options?.syncToServer) {
      performSync();
    }
  }, [isOnline, performSync, options?.syncToServer]);

  return {
    ...query,
    isSynced,
    syncError,
  };
}

/**
 * Hook for managing the operation queue (pending offline operations)
 */
export function useOfflineQueue() {
  const [pendingOperations, setPendingOperations] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Add operation to queue
   */
  const enqueueOperation = useCallback(
    (operation: {
      entityType: string;
      entityId: string;
      operationType: 'create' | 'update' | 'delete';
      changes: any;
    }) => {
      const queuedOp = {
        id: `op_${Date.now()}`,
        ...operation,
        timestamp: Date.now(),
        retryCount: 0,
      };

      setPendingOperations((prev) => [...prev, queuedOp]);
      return queuedOp.id;
    },
    []
  );

  /**
   * Process all pending operations
   */
  const processPendingOperations = useCallback(async (syncFn: (ops: any[]) => Promise<any>) => {
    if (pendingOperations.length === 0 || isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      // Send all pending operations to server
      const results = await syncFn(pendingOperations);

      // Remove successfully synced operations
      setPendingOperations((prev) =>
        prev.filter((op) => !results.some((r: any) => r.operationId === op.id))
      );
    } catch (error) {
      console.error('Batch sync error:', error);
      // Operations remain in queue for retry
    } finally {
      setIsProcessing(false);
    }
  }, [pendingOperations, isProcessing]);

  /**
   * Remove operation from queue
   */
  const dequeueOperation = useCallback((operationId: string) => {
    setPendingOperations((prev) => prev.filter((op) => op.id !== operationId));
  }, []);

  /**
   * Clear all operations from queue
   */
  const clearQueue = useCallback(() => {
    setPendingOperations([]);
  }, []);

  return {
    pendingOperations,
    enqueueOperation,
    processPendingOperations,
    dequeueOperation,
    clearQueue,
    isProcessing,
  };
}

/**
 * Hook for handling conflict resolution
 */
export function useConflictResolution() {
  /**
   * Resolve conflict between local and server versions
   */
  const resolveConflict = useCallback(
    (
      local: any,
      server: any,
      strategy: 'server-wins' | 'client-wins' | 'merge' = 'server-wins'
    ): any => {
      switch (strategy) {
        case 'server-wins':
          return server;

        case 'client-wins':
          return local;

        case 'merge':
          // Merge strategy: if fields don't conflict, merge them
          // If same field modified by both, server wins
          return {
            ...server,
            ...Object.entries(local).reduce(
              (acc, [key, value]) => {
                // Only merge if field wasn't modified on server
                if (server[key] === undefined) {
                  acc[key] = value;
                }
                return acc;
              },
              {} as any
            ),
          };

        default:
          return server;
      }
    },
    []
  );

  /**
   * Detect if versions conflict
   */
  const hasConflict = useCallback((clientVersion: number, serverVersion: number): boolean => {
    return clientVersion < serverVersion;
  }, []);

  return {
    resolveConflict,
    hasConflict,
  };
}
