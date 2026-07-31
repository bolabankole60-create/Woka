/**
 * In-Memory Database for Testing
 * Implements WatermelonDB interface without requiring better-sqlite3
 */

interface DatabaseRecord {
  id: string;
  _raw: Record<string, any>;
  update: (fn: (raw: Record<string, any>) => void) => Promise<void>;
}

interface Collection {
  query: () => any;
  find: (id: string) => Promise<DatabaseRecord | null>;
  create: (fn: (record: any) => void) => Promise<DatabaseRecord>;
}

export class InMemoryDatabase {
  private collections: Map<string, Map<string, DatabaseRecord>> = new Map();

  constructor() {
    this.collections.set('jobs', new Map());
    this.collections.set('customers', new Map());
    this.collections.set('operation_queue', new Map());
    this.collections.set('invoices', new Map());
    this.collections.set('payments', new Map());
  }

  get(collectionName: string): Collection {
    const collection = this.collections.get(collectionName) || new Map();

    const buildQuery = (filters: Map<string, any> = new Map()) => ({
      fetch: async () => {
        let results: DatabaseRecord[] = Array.from(collection.values());

        // Apply all filters
        filters.forEach((value, field) => {
          results = results.filter(
            (rec: DatabaseRecord) => rec._raw[field] === value
          );
        });

        return results;
      },
      where: (field: string, value: any) => {
        const newFilters = new Map(filters);
        newFilters.set(field, value);
        return buildQuery(newFilters);
      },
    });

    return {
      query: () => buildQuery(),

      find: async (id: string) => {
        const record = collection.get(id);
        if (!record) return null;

        return {
          ...record,
          update: async (fn: (raw: Record<string, any>) => void) => {
            fn(record._raw);
          },
        };
      },

      create: async (fn: (record: any) => void) => {
        const record: DatabaseRecord = {
          id: `${collectionName}-${Date.now()}-${Math.random()}`,
          _raw: {},
          update: async (fn: (raw: Record<string, any>) => void) => {
            fn(record._raw);
          },
        };
        fn(record._raw);
        record._raw.id = record.id;
        collection.set(record.id, record);
        return record;
      },
    };
  }

  write(fn: () => Promise<any>): Promise<any> {
    return fn();
  }

  action(fn: () => Promise<any>): Promise<any> {
    return fn();
  }

  clear() {
    this.collections.forEach((collection) => collection.clear());
  }
}
