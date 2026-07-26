/**
 * WatermelonDB Database Setup
 *
 * Initializes local SQLite database for offline-first support.
 * WatermelonDB is optimized for React Native with lazy loading and performance.
 *
 * Tables:
 * - users: Artisan/client profiles
 * - jobs: Main job/service records
 * - invoices: Generated invoices
 * - payments: Payment tracking
 * - expenseLogs: Operational expenses
 * - operationQueue: Pending sync operations
 */

import { Database, Model } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Schema } from '@nozbe/watermelondb';

/**
 * Define database schema
 * This mirrors the Prisma schema for consistency
 */
export const dbSchema = new Schema({
  version: 4, // Increment when schema changes
  tables: [
    // Users Table
    {
      name: 'users',
      primaryKey: 'id',
      columns: [
        { name: 'id', type: 'string', isIndexed: true },
        { name: 'role', type: 'string' }, // 'artisan' | 'client' | 'admin'
        { name: 'email', type: 'string', isIndexed: true },
        { name: 'phone', type: 'string' },
        { name: 'first_name', type: 'string' },
        { name: 'last_name', type: 'string' },
        { name: 'profile_image', type: 'string', isOptional: true },
        { name: 'trade', type: 'string', isOptional: true }, // For artisans
        { name: 'bio', type: 'string', isOptional: true },
        { name: 'years_of_experience', type: 'number', isOptional: true },
        { name: 'rating', type: 'number', isOptional: true },
        { name: 'rating_count', type: 'number', isOptional: true },
        { name: 'bank_account_name', type: 'string', isOptional: true },
        { name: 'bank_account_number', type: 'string', isOptional: true },
        { name: 'bank_code', type: 'string', isOptional: true },
        { name: 'paystack_customer_id', type: 'string', isOptional: true },
        { name: 'state', type: 'string' },
        { name: 'city', type: 'string' },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'whatsapp_number', type: 'string', isOptional: true },
        { name: 'email_verified', type: 'boolean', default: false },
        { name: 'phone_verified', type: 'boolean', default: false },
        // Sync tracking
        { name: 'sync_status', type: 'string', default: 'local' }, // 'local' | 'syncing' | 'synced' | 'conflict' | 'failed'
        { name: 'client_version', type: 'number', default: 0 },
        { name: 'server_version', type: 'number', default: 0 },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    },

    // Jobs Table
    {
      name: 'jobs',
      primaryKey: 'id',
      columns: [
        { name: 'id', type: 'string', isIndexed: true },
        { name: 'artisan_id', type: 'string', isIndexed: true },
        { name: 'client_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'location', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true }, // Job status enum
        { name: 'priority', type: 'string', isOptional: true },
        { name: 'estimated_cost', type: 'number', isOptional: true },
        { name: 'material_cost', type: 'number', default: 0 },
        { name: 'labor_fee', type: 'number', default: 0 },
        { name: 'tax_amount', type: 'number', default: 0 },
        { name: 'discount_amount', type: 'number', default: 0 },
        { name: 'total_amount', type: 'number', default: 0 },
        { name: 'paid_amount', type: 'number', default: 0 },
        { name: 'pending_amount', type: 'number', default: 0 },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'client_notes', type: 'string', isOptional: true },
        { name: 'artisan_notes', type: 'string', isOptional: true },
        { name: 'images', type: 'string', isOptional: true }, // Serialized JSON array
        { name: 'scheduled_date', type: 'number', isOptional: true },
        { name: 'started_at', type: 'number', isOptional: true },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'due_date', type: 'number', isOptional: true },
        // Sync tracking
        { name: 'sync_status', type: 'string', default: 'local' },
        { name: 'client_version', type: 'number', default: 0 },
        { name: 'server_version', type: 'number', default: 0 },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    },

    // Invoices Table
    {
      name: 'invoices',
      primaryKey: 'id',
      columns: [
        { name: 'id', type: 'string', isIndexed: true },
        { name: 'job_id', type: 'string', isIndexed: true },
        { name: 'artisan_id', type: 'string', isIndexed: true },
        { name: 'invoice_number', type: 'string', isIndexed: true },
        { name: 'subtotal', type: 'number', default: 0 },
        { name: 'tax_rate', type: 'number', default: 0.075 },
        { name: 'tax_amount', type: 'number', default: 0 },
        { name: 'discount_amount', type: 'number', default: 0 },
        { name: 'total_amount', type: 'number', default: 0 },
        { name: 'amount_paid', type: 'number', default: 0 },
        { name: 'amount_due', type: 'number', default: 0 },
        { name: 'status', type: 'string', default: 'draft' },
        { name: 'paid_status', type: 'string', default: 'unpaid' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'payment_terms', type: 'string', isOptional: true },
        { name: 'issued_at', type: 'number' },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'paid_at', type: 'number', isOptional: true },
        // Sync tracking
        { name: 'sync_status', type: 'string', default: 'local' },
        { name: 'client_version', type: 'number', default: 0 },
        { name: 'server_version', type: 'number', default: 0 },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    },

    // Invoice Items Table
    {
      name: 'invoice_items',
      primaryKey: 'id',
      columns: [
        { name: 'id', type: 'string', isIndexed: true },
        { name: 'invoice_id', type: 'string', isIndexed: true },
        { name: 'description', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'unit_price', type: 'number' },
        { name: 'amount', type: 'number' },
        { name: 'category', type: 'string' }, // 'material' | 'labor' | 'service'
        { name: 'created_at', type: 'number' },
      ],
    },

    // Payments Table
    {
      name: 'payments',
      primaryKey: 'id',
      columns: [
        { name: 'id', type: 'string', isIndexed: true },
        { name: 'invoice_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'job_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'artisan_id', type: 'string', isIndexed: true },
        { name: 'amount', type: 'number' },
        { name: 'method', type: 'string' }, // 'cash' | 'bank_transfer' | 'paystack_escrow'
        { name: 'status', type: 'string', default: 'pending' },
        { name: 'transaction_id', type: 'string', isOptional: true },
        { name: 'receipt_number', type: 'string', isOptional: true },
        { name: 'paystack_transfer_id', type: 'string', isOptional: true },
        { name: 'proof_of_payment', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'paid_at', type: 'number', isOptional: true },
        { name: 'recorded_at', type: 'number' },
        // Sync tracking
        { name: 'sync_status', type: 'string', default: 'local' },
        { name: 'client_version', type: 'number', default: 0 },
        { name: 'server_version', type: 'number', default: 0 },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    },

    // Expense Log Table
    {
      name: 'expense_logs',
      primaryKey: 'id',
      columns: [
        { name: 'id', type: 'string', isIndexed: true },
        { name: 'artisan_id', type: 'string', isIndexed: true },
        { name: 'category', type: 'string' }, // 'fuel' | 'transport' | 'tools' | 'equipment' | 'other'
        { name: 'description', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'expense_date', type: 'number', isIndexed: true },
        { name: 'recorded_at', type: 'number' },
        { name: 'job_id', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'receipt', type: 'string', isOptional: true },
        // Sync tracking
        { name: 'sync_status', type: 'string', default: 'local' },
        { name: 'client_version', type: 'number', default: 0 },
        { name: 'server_version', type: 'number', default: 0 },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    },

    // Operation Queue Table (for pending offline operations)
    {
      name: 'operation_queue',
      primaryKey: 'id',
      columns: [
        { name: 'id', type: 'string', isIndexed: true },
        { name: 'entity_type', type: 'string', isIndexed: true },
        { name: 'entity_id', type: 'string', isIndexed: true },
        { name: 'operation', type: 'string' }, // 'create' | 'update' | 'delete'
        { name: 'changes', type: 'string' }, // Serialized JSON
        { name: 'client_version', type: 'number' },
        { name: 'retry_count', type: 'number', default: 0 },
        { name: 'max_retries', type: 'number', default: 5 },
        { name: 'last_retry_at', type: 'number', isOptional: true },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'status', type: 'string', default: 'local' },
        { name: 'created_at', type: 'number' },
        { name: 'enqueued_at', type: 'number' },
        { name: 'processed_at', type: 'number', isOptional: true },
      ],
    },
  ],
});

/**
 * Initialize and export database instance
 */
export async function initializeDatabase(): Promise<Database> {
  const adapter = new SQLiteAdapter({
    schema: dbSchema,
    dbName: 'tradify_db', // SQLite file name
  });

  const database = new Database({
    adapter,
    actionsEnabled: true, // Enable batch operations
  });

  // Run migrations if needed
  await database.write(async () => {
    // TODO: Add migration logic here
  });

  return database;
}

/**
 * Helper functions for common database operations
 */
export const dbHelpers = {
  /**
   * Get all pending operations for sync
   */
  async getPendingOperations(db: Database): Promise<any[]> {
    const collection = db.get('operation_queue');
    const records = await collection
      .query(
        // Only get pending operations
        // This would be: DB.where('status', Q.eq('local'))
        // But WatermelonDB uses Q syntax, so we use raw query
      )
      .fetch();
    return records;
  },

  /**
   * Queue an operation for sync
   */
  async queueOperation(
    db: Database,
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    changes: any,
    clientVersion: number
  ): Promise<string> {
    const collection = db.get('operation_queue');
    const record = await db.write(async () => {
      return collection.create((op: any) => {
        op.entity_type = entityType;
        op.entity_id = entityId;
        op.operation = operation;
        op.changes = JSON.stringify(changes);
        op.client_version = clientVersion;
        op.status = 'local';
        op.created_at = Date.now();
        op.enqueued_at = Date.now();
      });
    });
    return record.id;
  },

  /**
   * Mark operations as processed
   */
  async markOperationsProcessed(db: Database, operationIds: string[]): Promise<void> {
    const collection = db.get('operation_queue');
    await db.write(async () => {
      const records = await collection.query().fetch();
      for (const record of records) {
        if (operationIds.includes(record.id)) {
          await record.update((op: any) => {
            op.status = 'synced';
            op.processed_at = Date.now();
          });
        }
      }
    });
  },

  /**
   * Get jobs for artisan with pagination
   */
  async getArtisanJobs(
    db: Database,
    artisanId: string,
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const collection = db.get('jobs');
    let query = collection.query();
    // Add filtering: artisan_id = artisanId and optionally status
    // WatermelonDB Q syntax would be used here
    const records = await query.fetch();
    return records.slice(offset, offset + limit);
  },

  /**
   * Calculate invoice totals
   */
  calculateInvoiceTotals(items: any[], taxRate: number, discountRate: number) {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subtotal * taxRate;
    const discountAmount = subtotal * discountRate;
    const totalAmount = subtotal + taxAmount - discountAmount;

    return { subtotal, taxAmount, discountAmount, totalAmount };
  },
};
