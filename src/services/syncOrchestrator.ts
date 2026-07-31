/**
 * Sync Orchestrator
 *
 * Coordinates bi-directional sync between mobile and server:
 * 1. Push pending operations → backend
 * 2. Reconcile push results → update local state
 * 3. Fetch pull delta → pull changed data
 * 4. Reconcile pull changes → merge into WatermelonDB
 * 5. Advance cursor → only after successful reconciliation
 *
 * Supports dependency injection for testing while maintaining single production implementation.
 */

import { Database } from '@nozbe/watermelondb';

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
  reconcilePullChanges?: (db: Database, response: any) => Promise<void>;
  reconcilePushResult?: (db: Database, entityId: string, result: any) => Promise<void>;
}

let syncInProgress = false;
let syncPromise: Promise<SyncResult> | null = null;

// Production defaults (lazy-loaded to avoid React Native import issues in tests)
let productionApiClient: any = null;
let productionSecureStore: any = null;

function getProductionApiClient() {
  if (!productionApiClient) {
    productionApiClient = require('./api').apiClient;
  }
  return productionApiClient;
}

function getProductionSecureStore() {
  if (!productionSecureStore) {
    productionSecureStore = require('expo-secure-store');
  }
  return productionSecureStore;
}

function getProductionReconcileFunctions() {
  return require('./syncService');
}

/**
 * Execute complete bi-directional sync
 * Prevents concurrent syncs with in-flight promise caching
 * Supports optional dependency injection for testing
 */
export async function performSync(
  database: Database,
  boundaries?: Partial<SyncBoundaries>
): Promise<SyncResult> {
  // Prevent concurrent syncs
  if (syncInProgress) {
    return syncPromise || Promise.reject(new Error('Sync already in progress'));
  }

  syncInProgress = true;
  syncPromise = executeSyncCycle(database, boundaries);

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
 * Accepts optional boundary overrides for testing
 */
async function executeSyncCycle(
  database: Database,
  boundaries?: Partial<SyncBoundaries>
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    pushedCount: 0,
    pulledCount: 0,
    conflicts: 0,
    errors: [],
  };

  try {
    // Resolve boundaries: use provided overrides or production defaults
    const productionFuncs = getProductionReconcileFunctions();
    const resolvedBoundaries: SyncBoundaries = {
      database,
      apiClient: boundaries?.apiClient || getProductionApiClient(),
      secureStore: boundaries?.secureStore || getProductionSecureStore(),
      reconcilePullChanges: boundaries?.reconcilePullChanges || productionFuncs.reconcilePullChanges,
      reconcilePushResult: boundaries?.reconcilePushResult || productionFuncs.reconcilePushResult,
    };

    // Get last successful sync cursor
    const lastSyncCursorStr = await resolvedBoundaries.secureStore.getItemAsync('lastSyncCursor');
    let lastSyncCursor = parseInt(lastSyncCursorStr || '0');

    // Step 1: PUSH - Process pending operation queue
    result.pushedCount = await pushPendingOperations(resolvedBoundaries);

    // Step 2: PULL - Fetch delta changes
    const pullResponse = await resolvedBoundaries.apiClient.deltaSync(lastSyncCursor);

    // Step 3: RECONCILE PULL - Merge customers and jobs into WatermelonDB
    try {
      await resolvedBoundaries.reconcilePullChanges!(resolvedBoundaries.database, pullResponse);
      result.pulledCount = (pullResponse.customers?.length || 0) + (pullResponse.jobs?.length || 0);

      // Step 4: SAVE CURSOR - Only after successful reconciliation
      await resolvedBoundaries.secureStore.setItemAsync(
        'lastSyncCursor',
        pullResponse.serverTimestamp.toString()
      );
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
 * Accepts boundary for dependency injection in tests
 */
async function pushPendingOperations(boundaries: SyncBoundaries): Promise<number> {
  const queueCollection = boundaries.database.get('operation_queue');
  const pending = await queueCollection.query().fetch();

  if (pending.length === 0) {
    return 0;
  }

  // Build operations array with required fields
  // Supports: customers, jobs, invoices, payments
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
    const results = await boundaries.apiClient.syncOperations(operations);

    // Process each result and reconcile
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const op = pending[i];

      if (!result.success) {
        // Increment retry count and save error
        await boundaries.database.write(async () => {
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
        if (boundaries.reconcilePushResult) {
          await boundaries.reconcilePushResult(boundaries.database, raw.entity_id, {
            success: true,
            serverVersion: result.serverVersion,
            serverData: result.data,
            conflict: result.conflict,
          });
        }

        // Remove from queue only after successful local reconciliation
        await boundaries.database.write(async () => {
          await op.destroyPermanently();
        });

        pushedCount++;
      } catch (error) {
        // Keep in queue on reconciliation failure
        await boundaries.database.write(async () => {
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
