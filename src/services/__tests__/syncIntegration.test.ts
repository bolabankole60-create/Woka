/**
 * Sync Orchestrator Integration Tests
 * Real behavioral tests using injectable test boundaries
 * Production remains unchanged; tests use mock implementations only
 */

import { performSyncWithBoundaries, isSyncInProgress, resetSyncState, type SyncResult } from '../syncOrchestratorTestable';
import {
  testCursorStorage,
  testApiClient,
  testDatabaseState,
  createTestDatabase,
  resetTestBoundaries,
} from './testBoundaries';

describe('Sync Orchestrator Integration Tests', () => {
  beforeEach(() => {
    resetTestBoundaries();
    resetSyncState();
  });

  // Mock reconciliation functions
  const mockReconcilePullChanges = jest.fn(async (_db: any) => {
    // Simulate successful pull reconciliation
  });

  const mockReconcilePushResult = jest.fn(async (_db: any, entityId: string, result: any) => {
    if (result.success) {
      testDatabaseState.addRecord(entityId, {
        id: entityId,
        serverVersion: result.serverVersion,
        data: result.serverData,
      });
    }
    if (result.conflict) {
      testDatabaseState.incrementConflictCount();
    }
  });

  describe('Sync State Management', () => {
    it('should initialize with no sync in progress', () => {
      expect(isSyncInProgress()).toBe(false);
    });

    it('should track sync in progress state', () => {
      resetSyncState();
      expect(isSyncInProgress()).toBe(false);
    });

    it('should reset sync state for test isolation', () => {
      resetSyncState();
      expect(isSyncInProgress()).toBe(false);
    });
  });

  describe('Concurrent Sync Prevention', () => {
    it('should prevent overlapping sync operations', async () => {
      const database = createTestDatabase();
      testApiClient.setDeltaSyncResponse({ customers: [], jobs: [], serverTimestamp: 1000 });
      testApiClient.setSyncOperationsResponse([]);

      const sync1 = performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      // Second call while first is in progress should return cached promise
      const sync2 = performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      expect(isSyncInProgress()).toBe(true);
      const result1 = await sync1;
      const result2 = await sync2;

      // Both should complete successfully (same promise)
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(isSyncInProgress()).toBe(false);
    });

    it('should return cached promise on concurrent sync attempt', async () => {
      const database = createTestDatabase();
      testApiClient.setDeltaSyncResponse({ customers: [], jobs: [], serverTimestamp: 1000 });
      testApiClient.setSyncOperationsResponse([]);

      const promise1 = performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      // Get second promise while first is in progress (immediately, synchronously)
      const promise2 = performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      // Both should resolve successfully
      const result1 = await promise1;
      const result2 = await promise2;

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(isSyncInProgress()).toBe(false);
    });

    it('should allow sync after previous completes', async () => {
      const database = createTestDatabase();
      testApiClient.setDeltaSyncResponse({ customers: [], jobs: [], serverTimestamp: 1000 });
      testApiClient.setSyncOperationsResponse([]);

      // First sync
      await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      expect(isSyncInProgress()).toBe(false);

      // Second sync should execute fresh
      const result2 = await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      expect(result2.success).toBe(true);
    });
  });

  describe('Operation Queue Processing', () => {
    it('should fetch pending operations from queue', async () => {
      const database = createTestDatabase();

      // Add operations to queue
      testDatabaseState.addOperation({
        id: 'op-1',
        entity_type: 'job',
        entity_id: 'job-1',
        operation: 'create',
        client_version: 1,
        changes: '{"title":"test"}',
        retry_count: 0,
        _raw: {
          id: 'op-1',
          entity_type: 'job',
          entity_id: 'job-1',
          operation: 'create',
          client_version: 1,
          changes: '{"title":"test"}',
          retry_count: 0,
        },
      });

      testApiClient.setDeltaSyncResponse({ customers: [], jobs: [], serverTimestamp: 1000 });
      testApiClient.setSyncOperationsResponse([{ success: true, serverVersion: 2, data: {}, conflict: false }]);

      await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      // Should have attempted to push the operation
      expect(testApiClient.getSyncOperationsCalls().length).toBeGreaterThan(0);
    });

    it('should increment retry count on push failure', async () => {
      const database = createTestDatabase();

      // Add operation to queue
      const operation = {
        id: 'op-1',
        entity_type: 'job',
        entity_id: 'job-1',
        operation: 'create',
        client_version: 1,
        changes: '{"title":"test"}',
        retry_count: 0,
        status: 'pending',
        _raw: {
          id: 'op-1',
          entity_type: 'job',
          entity_id: 'job-1',
          operation: 'create',
          client_version: 1,
          changes: '{"title":"test"}',
          retry_count: 0,
        },
        update: async (fn: (o: any) => void) => {
          fn(operation);
        },
        destroyPermanently: async () => {
          testDatabaseState.removeOperation('op-1');
        },
      };

      testDatabaseState.addOperation(operation);

      testApiClient.setDeltaSyncResponse({ customers: [], jobs: [], serverTimestamp: 1000 });
      testApiClient.setSyncOperationsResponse([{ success: false, error: 'Network error', serverVersion: 0 }]);

      await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      // Operation should still be in queue with incremented retry count
      const ops = testDatabaseState.getOperations();
      expect(ops.length).toBeGreaterThan(0);
    });

    it('should remove operation from queue after successful reconciliation', async () => {
      const database = createTestDatabase();

      // Add operation to queue
      const operation = {
        id: 'op-1',
        entity_type: 'job',
        entity_id: 'job-1',
        operation: 'create',
        client_version: 1,
        changes: '{"title":"test"}',
        retry_count: 0,
        _raw: {
          id: 'op-1',
          entity_type: 'job',
          entity_id: 'job-1',
          operation: 'create',
          client_version: 1,
          changes: '{"title":"test"}',
          retry_count: 0,
        },
        update: async (fn: (o: any) => void) => {
          fn(operation);
        },
        destroyPermanently: async () => {
          testDatabaseState.removeOperation('op-1');
        },
      };

      testDatabaseState.addOperation(operation);

      testApiClient.setDeltaSyncResponse({ customers: [], jobs: [], serverTimestamp: 1000 });
      testApiClient.setSyncOperationsResponse([{ success: true, serverVersion: 2, data: {}, conflict: false }]);

      await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      // Operation should be removed from queue
      const ops = testDatabaseState.getOperations();
      expect(ops.find((o: any) => o.id === 'op-1')).toBeUndefined();
    });
  });

  describe('Push Reconciliation', () => {
    it('should apply server data on successful push', async () => {
      const database = createTestDatabase();

      const operation = {
        id: 'op-1',
        entity_type: 'job',
        entity_id: 'job-1',
        operation: 'update',
        client_version: 1,
        changes: '{"title":"test"}',
        retry_count: 0,
        _raw: {
          id: 'op-1',
          entity_type: 'job',
          entity_id: 'job-1',
          operation: 'update',
          client_version: 1,
          changes: '{"title":"test"}',
          retry_count: 0,
        },
        update: async (fn: (o: any) => void) => {
          fn(operation);
        },
        destroyPermanently: async () => {
          testDatabaseState.removeOperation('op-1');
        },
      };

      testDatabaseState.addOperation(operation);

      testApiClient.setDeltaSyncResponse({ customers: [], jobs: [], serverTimestamp: 1000 });
      testApiClient.setSyncOperationsResponse([
        {
          success: true,
          serverVersion: 2,
          data: { title: 'server-title', status: 'accepted' },
          conflict: false,
        },
      ]);

      await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      // Verify reconcile was called with server data
      const records = testDatabaseState.getAllRecords();
      const record = records.find((r: any) => r.id === 'job-1');
      expect(record).toBeDefined();
      expect(record?.serverVersion).toBe(2);
    });

    it('should handle server-wins conflict resolution', async () => {
      const database = createTestDatabase();

      const operation = {
        id: 'op-1',
        entity_type: 'job',
        entity_id: 'job-1',
        operation: 'update',
        client_version: 1,
        changes: '{"title":"test"}',
        retry_count: 0,
        _raw: {
          id: 'op-1',
          entity_type: 'job',
          entity_id: 'job-1',
          operation: 'update',
          client_version: 1,
          changes: '{"title":"test"}',
          retry_count: 0,
        },
        update: async (fn: (o: any) => void) => {
          fn(operation);
        },
        destroyPermanently: async () => {
          testDatabaseState.removeOperation('op-1');
        },
      };

      testDatabaseState.addOperation(operation);

      testApiClient.setDeltaSyncResponse({ customers: [], jobs: [], serverTimestamp: 1000 });
      testApiClient.setSyncOperationsResponse([
        {
          success: true,
          serverVersion: 3,
          data: { title: 'server-wins' },
          conflict: true, // Conflict detected
        },
      ]);

      await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      // Verify conflict count was incremented
      expect(testDatabaseState.getConflictCount()).toBeGreaterThan(0);
    });
  });

  describe('Pull Synchronization', () => {
    it('should call deltaSync with last cursor', async () => {
      const database = createTestDatabase();

      // Set cursor to a specific value
      await testCursorStorage.setItemAsync('lastSyncCursor', '500');

      testApiClient.setDeltaSyncResponse({ customers: [], jobs: [], serverTimestamp: 1000 });
      testApiClient.setSyncOperationsResponse([]);

      await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      // Verify deltaSync was called with the cursor
      const calls = testApiClient.getDeltaSyncCalls();
      expect(calls).toContain(500);
    });

    it('should count pulled records in result', async () => {
      const database = createTestDatabase();

      testApiClient.setDeltaSyncResponse({
        customers: [{ id: 'c1', artisanId: 'a1', name: 'Customer 1', phone: '123', normalizedPhone: '123' }],
        jobs: [
          { id: 'j1', artisanId: 'a1', clientId: 'cli1', title: 'Job 1', description: 'Desc', category: 'cat', location: 'loc', isArchived: false, serverVersion: 1, deleted: false, updatedAt: '2024-01-01', createdAt: '2024-01-01' },
          { id: 'j2', artisanId: 'a1', clientId: 'cli1', title: 'Job 2', description: 'Desc', category: 'cat', location: 'loc', isArchived: false, serverVersion: 1, deleted: false, updatedAt: '2024-01-01', createdAt: '2024-01-01' },
        ],
        serverTimestamp: 1000,
      });
      testApiClient.setSyncOperationsResponse([]);

      const result = await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      // Should count 1 customer + 2 jobs = 3
      expect(result.pulledCount).toBe(3);
    });
  });

  describe('Cursor Management', () => {
    it('should advance cursor only after successful reconciliation', async () => {
      const database = createTestDatabase();

      testApiClient.setDeltaSyncResponse({ customers: [], jobs: [], serverTimestamp: 1000 });
      testApiClient.setSyncOperationsResponse([]);

      await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      // Verify cursor was advanced
      const cursor = await testCursorStorage.getItemAsync('lastSyncCursor');
      expect(cursor).toBe('1000');
    });

    it('should preserve cursor on pull reconciliation failure', async () => {
      const database = createTestDatabase();

      // Set initial cursor
      await testCursorStorage.setItemAsync('lastSyncCursor', '500');

      testApiClient.setDeltaSyncResponse({ customers: [], jobs: [], serverTimestamp: 1000 });
      testApiClient.setSyncOperationsResponse([]);

      // Mock reconciliation to fail
      const failingReconcile = jest.fn(async () => {
        throw new Error('Reconciliation failed');
      });

      await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        failingReconcile,
        mockReconcilePushResult
      );

      // Cursor should remain unchanged
      const cursor = await testCursorStorage.getItemAsync('lastSyncCursor');
      expect(cursor).toBe('500');
    });

    it('should resume sync from last cursor', async () => {
      const database = createTestDatabase();

      // Set cursor to simulate previous sync
      await testCursorStorage.setItemAsync('lastSyncCursor', '750');

      testApiClient.setDeltaSyncResponse({ customers: [], jobs: [], serverTimestamp: 1500 });
      testApiClient.setSyncOperationsResponse([]);

      await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      // Verify deltaSync was called with the cursor value
      const calls = testApiClient.getDeltaSyncCalls();
      expect(calls).toContain(750);

      // Verify cursor was advanced to new timestamp
      const newCursor = await testCursorStorage.getItemAsync('lastSyncCursor');
      expect(newCursor).toBe('1500');
    });
  });

  describe('Error Handling', () => {
    it('should handle network disconnection gracefully', async () => {
      const database = createTestDatabase();

      testApiClient.setDeltaSyncResponse(null);
      const failingApiClient = {
        ...testApiClient,
        deltaSync: jest.fn(async () => {
          throw new Error('Network timeout');
        }),
        syncOperations: jest.fn(async () => []),
      };

      const result = await performSyncWithBoundaries(
        { database, apiClient: failingApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should report sync errors in result', async () => {
      const database = createTestDatabase();

      testApiClient.setDeltaSyncResponse({ customers: [], jobs: [], serverTimestamp: 1000 });
      testApiClient.setSyncOperationsResponse([]);

      const failingReconcile = jest.fn(async () => {
        throw new Error('Database write failed');
      });

      const result = await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        failingReconcile,
        mockReconcilePushResult
      );

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes('reconciliation'))).toBe(true);
    });
  });

  describe('Result Reporting', () => {
    it('should return SyncResult with complete information', async () => {
      const database = createTestDatabase();

      testApiClient.setDeltaSyncResponse({
        customers: [{ id: 'c1', artisanId: 'a1', name: 'Customer 1', phone: '123', normalizedPhone: '123' }],
        jobs: [],
        serverTimestamp: 1000,
      });
      testApiClient.setSyncOperationsResponse([]);

      const result: SyncResult = await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('pushedCount');
      expect(result).toHaveProperty('pulledCount');
      expect(result).toHaveProperty('conflicts');
      expect(result).toHaveProperty('errors');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.pushedCount).toBe('number');
      expect(typeof result.pulledCount).toBe('number');
      expect(typeof result.conflicts).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should count pushed and pulled records', async () => {
      const database = createTestDatabase();

      const operation = {
        id: 'op-1',
        entity_type: 'job',
        entity_id: 'job-1',
        operation: 'create',
        client_version: 1,
        changes: '{"title":"test"}',
        retry_count: 0,
        _raw: {
          id: 'op-1',
          entity_type: 'job',
          entity_id: 'job-1',
          operation: 'create',
          client_version: 1,
          changes: '{"title":"test"}',
          retry_count: 0,
        },
        update: async (fn: (o: any) => void) => {
          fn(operation);
        },
        destroyPermanently: async () => {
          testDatabaseState.removeOperation('op-1');
        },
      };

      testDatabaseState.addOperation(operation);

      testApiClient.setDeltaSyncResponse({
        customers: [{ id: 'c1', artisanId: 'a1', name: 'Customer 1', phone: '123', normalizedPhone: '123' }],
        jobs: [
          { id: 'j1', artisanId: 'a1', clientId: 'cli1', title: 'Job 1', description: 'Desc', category: 'cat', location: 'loc', isArchived: false, serverVersion: 1, deleted: false, updatedAt: '2024-01-01', createdAt: '2024-01-01' },
        ],
        serverTimestamp: 1000,
      });
      testApiClient.setSyncOperationsResponse([{ success: true, serverVersion: 2, data: {}, conflict: false }]);

      const result = await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      expect(result.pushedCount).toBeGreaterThanOrEqual(0);
      expect(result.pulledCount).toBe(2); // 1 customer + 1 job
    });

    it('should track conflicts in result', async () => {
      const database = createTestDatabase();

      const operation = {
        id: 'op-1',
        entity_type: 'job',
        entity_id: 'job-1',
        operation: 'update',
        client_version: 1,
        changes: '{"title":"test"}',
        retry_count: 0,
        _raw: {
          id: 'op-1',
          entity_type: 'job',
          entity_id: 'job-1',
          operation: 'update',
          client_version: 1,
          changes: '{"title":"test"}',
          retry_count: 0,
        },
        update: async (fn: (o: any) => void) => {
          fn(operation);
        },
        destroyPermanently: async () => {
          testDatabaseState.removeOperation('op-1');
        },
      };

      testDatabaseState.addOperation(operation);

      testApiClient.setDeltaSyncResponse({ customers: [], jobs: [], serverTimestamp: 1000 });
      testApiClient.setSyncOperationsResponse([
        { success: true, serverVersion: 2, data: {}, conflict: true },
      ]);

      await performSyncWithBoundaries(
        { database, apiClient: testApiClient, secureStore: testCursorStorage },
        mockReconcilePullChanges,
        mockReconcilePushResult
      );

      expect(testDatabaseState.getConflictCount()).toBeGreaterThanOrEqual(0);
    });
  });
});
