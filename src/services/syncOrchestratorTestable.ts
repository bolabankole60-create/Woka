/**
 * Testable Sync Orchestrator
 * Same production logic, but with injectable external dependencies for testing.
 * Production uses real WatermelonDB, SecureStore, and apiClient.
 * Tests use mock implementations of these boundaries.
 */

import type { Database } from '@nozbe/watermelondb';

export interface SyncResult {
  success: boolean;
  pushedCount: number;
  pulledCount: number;
  conflicts: number;
  errors: string[];
}

export interface SyncBoundaries {
  database: Database;
  apiClient: any;
  secureStore: any;
}

let syncInProgress = false;
let syncPromise: Promise<SyncResult> | null = null;

/**
 * Execute complete bi-directional sync with injectable boundaries
 * Tests pass mock implementations; production passes real ones
 */
export async function performSyncWithBoundaries(
  boundaries: SyncBoundaries,
  reconcilePullChanges: (db: Database, response: any) => Promise<void>,
  reconcilePushResult: (db: Database, entityId: string, result: any) => Promise<void>
): Promise<SyncResult> {
  // Prevent concurrent syncs
  if (syncInProgress) {
    return syncPromise || Promise.reject(new Error('Sync already in progress'));
  }

  syncInProgress = true;
  syncPromise = executeSyncCycleWithBoundaries(boundaries, reconcilePullChanges, reconcilePushResult);

  try {
    const result = await syncPromise;
    return result;
  } finally {
    syncInProgress = false;
    syncPromise = null;
  }
}

/**
 * Execute one complete sync cycle
 */
async function executeSyncCycleWithBoundaries(
  boundaries: SyncBoundaries,
  reconcilePullChanges: (db: Database, response: any) => Promise<void>,
  reconcilePushResult: (db: Database, entityId: string, result: any) => Promise<void>
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    pushedCount: 0,
    pulledCount: 0,
    conflicts: 0,
    errors: [],
  };

  try {
    const { database, apiClient, secureStore } = boundaries;

    // Get last successful sync cursor
    const lastSyncCursorStr = await secureStore.getItemAsync('lastSyncCursor');
    let lastSyncCursor = parseInt(lastSyncCursorStr || '0');

    // Step 1: PUSH - Process pending operation queue
    result.pushedCount = await pushPendingOperationsWithBoundaries(database, apiClient, reconcilePushResult);

    // Step 2: PULL - Fetch delta changes
    const pullResponse = await apiClient.deltaSync(lastSyncCursor);

    // Step 3: RECONCILE PULL - Merge customers and jobs into WatermelonDB
    try {
      await reconcilePullChanges(database, pullResponse);
      result.pulledCount = (pullResponse.customers?.length || 0) + (pullResponse.jobs?.length || 0);

      // Step 4: SAVE CURSOR - Only after successful reconciliation
      await secureStore.setItemAsync('lastSyncCursor', pullResponse.serverTimestamp.toString());
    } catch (error) {
      result.errors.push(`Pull reconciliation failed: ${String(error)}`);
      result.success = false;
      // Do NOT advance cursor on failure - next sync will retry
      return result;
    }

    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(`Sync failed: ${String(error)}`);
    return result;
  }
}

/**
 * Process pending operation queue
 * Returns count of successfully pushed operations
 */
async function pushPendingOperationsWithBoundaries(
  database: Database,
  apiClient: any,
  reconcilePushResult: (db: Database, entityId: string, result: any) => Promise<void>
): Promise<number> {
  const queueCollection = database.get('operation_queue');
  const pending = await queueCollection.query().fetch();

  if (pending.length === 0) {
    return 0;
  }

  // Build operations array with required fields
  const operations = pending.map((op: any) => {
    const raw = op._raw as Record<string, any>;
    return {
      id: raw.id,
      operationId: raw.id,
      entityType: raw.entity_type,
      entityId: raw.entity_id,
      operation: raw.operation,
      clientVersion: raw.client_version,
      changes: JSON.parse(raw.changes),
      retryCount: raw.retry_count,
    };
  });

  let pushedCount = 0;

  try {
    // Push all operations to backend
    const results = await apiClient.syncOperations(operations);

    // Process each result and reconcile
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const op = pending[i];

      if (!result.success) {
        // Increment retry count and save error
        await database.write(async () => {
          await op.update((o: any) => {
            o.retry_count = (o.retry_count || 0) + 1;
            o.last_error = result.error || 'Unknown error';
            if (o.retry_count >= 3) {
              o.status = 'failed';
            }
          });
        });
        continue;
      }

      // Successful push - reconcile locally
      try {
        const raw = op._raw as Record<string, any>;
        await reconcilePushResult(database, raw.entity_id, {
          success: true,
          serverVersion: result.serverVersion,
          serverData: result.data,
          conflict: result.conflict,
        });

        // Remove from queue only after successful local reconciliation
        await database.write(async () => {
          await op.destroyPermanently();
        });

        pushedCount++;
      } catch (error) {
        // Keep in queue on reconciliation failure
        await database.write(async () => {
          await op.update((o: any) => {
            o.last_error = String(error);
          });
        });
      }
    }
  } catch (error) {
    console.error('Push batch failed:', error);
  }

  return pushedCount;
}

/**
 * Check if sync is currently in progress
 */
export function isSyncInProgress(): boolean {
  return syncInProgress;
}

/**
 * Reset sync state (for testing only)
 */
export function resetSyncState(): void {
  syncInProgress = false;
  syncPromise = null;
}
