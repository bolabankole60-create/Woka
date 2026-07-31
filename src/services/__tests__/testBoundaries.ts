/**
 * Test Boundaries
 * Provides deterministic test implementations of sync orchestrator's external dependencies.
 * Production code is unchanged; tests override these boundaries only.
 */

/**
 * In-memory cursor storage for testing
 */
class TestCursorStorage {
  private cursors = new Map<string, string>();

  async getItemAsync(key: string): Promise<string | null> {
    return this.cursors.get(key) || null;
  }

  async setItemAsync(key: string, value: string): Promise<void> {
    this.cursors.set(key, value);
  }

  reset(): void {
    this.cursors.clear();
  }

  getCursor(key: string): string | null {
    return this.cursors.get(key) || null;
  }
}

/**
 * Mock API client for testing sync operations
 */
class TestApiClient {
  private syncOperationsCalls: any[] = [];
  private deltaSyncCalls: any[] = [];
  private syncOperationsResponse: any[] = [];
  private deltaSyncResponse: any = null;

  setSyncOperationsResponse(response: any[]): void {
    this.syncOperationsResponse = response;
  }

  setDeltaSyncResponse(response: any): void {
    this.deltaSyncResponse = response;
  }

  async syncOperations(operations: any[]): Promise<any[]> {
    this.syncOperationsCalls.push(operations);
    return this.syncOperationsResponse;
  }

  async deltaSync(cursor: number): Promise<any> {
    this.deltaSyncCalls.push(cursor);
    return this.deltaSyncResponse;
  }

  getSyncOperationsCalls(): any[] {
    return this.syncOperationsCalls;
  }

  getDeltaSyncCalls(): any[] {
    return this.deltaSyncCalls;
  }

  reset(): void {
    this.syncOperationsCalls = [];
    this.deltaSyncCalls = [];
  }
}

/**
 * Test WatermelonDB operations - tracks queue and record state
 */
class TestDatabaseState {
  private operationQueue: any[] = [];
  private records = new Map<string, any>();
  private conflicts = 0;

  addOperation(op: any): void {
    // Ensure operation has proper mock methods
    if (!op.update) {
      op.update = async (fn: (o: any) => void) => {
        fn(op);
      };
    }
    if (!op.destroyPermanently) {
      op.destroyPermanently = async () => {
        this.removeOperation(op.id);
      };
    }
    this.operationQueue.push(op);
  }

  getOperations(): any[] {
    return this.operationQueue;
  }

  removeOperation(id: string): void {
    this.operationQueue = this.operationQueue.filter((op) => op.id !== id);
  }

  updateOperation(id: string, updates: any): void {
    const op = this.operationQueue.find((o) => o.id === id);
    if (op) {
      Object.assign(op, updates);
    }
  }

  addRecord(id: string, data: any): void {
    this.records.set(id, data);
  }

  getRecord(id: string): any {
    return this.records.get(id);
  }

  getAllRecords(): any[] {
    return Array.from(this.records.values());
  }

  incrementConflictCount(): void {
    this.conflicts++;
  }

  getConflictCount(): number {
    return this.conflicts;
  }

  reset(): void {
    this.operationQueue = [];
    this.records.clear();
    this.conflicts = 0;
  }
}

export const testCursorStorage = new TestCursorStorage();
export const testApiClient = new TestApiClient();
export const testDatabaseState = new TestDatabaseState();

/**
 * Create a mock WatermelonDB for testing
 * Minimal implementation that supports the sync orchestrator's operations
 */
export function createTestDatabase(): any {
  return {
    get(collectionName: string): any {
      if (collectionName === 'operation_queue') {
        return {
          query: () => ({
            fetch: async () => testDatabaseState.getOperations(),
          }),
        };
      }
      return null;
    },

    write: async (fn: (db: any) => Promise<void>) => {
      await fn({});
    },
  };
}

/**
 * Reset all test boundaries for clean test isolation
 */
export function resetTestBoundaries(): void {
  testCursorStorage.reset();
  testApiClient.reset();
  testDatabaseState.reset();
}
