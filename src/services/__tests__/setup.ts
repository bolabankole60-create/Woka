/**
 * Test Setup
 * In-memory database adapter for testing
 */

import { Database, appSchema, tableSchema } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

const testDbSchema = appSchema({
  version: 6,
  tables: [
    tableSchema({
      name: 'customers',
      columns: [
        { name: 'id', type: 'string', isIndexed: true },
        { name: 'artisan_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'normalized_phone', type: 'string', isIndexed: true },
        { name: 'email', type: 'string', isOptional: true },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'is_archived', type: 'boolean' },
        { name: 'archived_at', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'client_version', type: 'number' },
        { name: 'server_version', type: 'number' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'jobs',
      columns: [
        { name: 'id', type: 'string', isIndexed: true },
        { name: 'artisan_id', type: 'string', isIndexed: true },
        { name: 'client_id', type: 'string', isIndexed: true },
        { name: 'customer_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'location', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'priority', type: 'string', isOptional: true },
        { name: 'estimated_cost', type: 'number', isOptional: true },
        { name: 'material_cost', type: 'number' },
        { name: 'labor_fee', type: 'number' },
        { name: 'tax_amount', type: 'number' },
        { name: 'discount_amount', type: 'number' },
        { name: 'total_amount', type: 'number' },
        { name: 'paid_amount', type: 'number' },
        { name: 'pending_amount', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'client_notes', type: 'string', isOptional: true },
        { name: 'artisan_notes', type: 'string', isOptional: true },
        { name: 'images', type: 'string', isOptional: true },
        { name: 'scheduled_date', type: 'number', isOptional: true },
        { name: 'started_at', type: 'number', isOptional: true },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'is_archived', type: 'boolean' },
        { name: 'archived_at', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'client_version', type: 'number' },
        { name: 'server_version', type: 'number' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'invoices',
      columns: [
        { name: 'id', type: 'string', isIndexed: true },
        { name: 'job_id', type: 'string', isIndexed: true },
        { name: 'artisan_id', type: 'string', isIndexed: true },
        { name: 'invoice_number', type: 'string', isIndexed: true },
        { name: 'subtotal', type: 'number' },
        { name: 'tax_rate', type: 'number' },
        { name: 'tax_amount', type: 'number' },
        { name: 'discount_amount', type: 'number' },
        { name: 'total_amount', type: 'number' },
        { name: 'amount_paid', type: 'number' },
        { name: 'amount_due', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'paid_status', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'payment_terms', type: 'string', isOptional: true },
        { name: 'issued_at', type: 'number' },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'paid_at', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'client_version', type: 'number' },
        { name: 'server_version', type: 'number' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'payments',
      columns: [
        { name: 'id', type: 'string', isIndexed: true },
        { name: 'invoice_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'job_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'artisan_id', type: 'string', isIndexed: true },
        { name: 'amount', type: 'number' },
        { name: 'method', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'transaction_id', type: 'string', isOptional: true },
        { name: 'receipt_number', type: 'string', isOptional: true },
        { name: 'paystack_transfer_id', type: 'string', isOptional: true },
        { name: 'proof_of_payment', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'paid_at', type: 'number', isOptional: true },
        { name: 'recorded_at', type: 'number' },
        { name: 'sync_status', type: 'string' },
        { name: 'client_version', type: 'number' },
        { name: 'server_version', type: 'number' },
        { name: 'last_synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'operation_queue',
      columns: [
        { name: 'id', type: 'string', isIndexed: true },
        { name: 'entity_type', type: 'string', isIndexed: true },
        { name: 'entity_id', type: 'string', isIndexed: true },
        { name: 'operation', type: 'string' },
        { name: 'changes', type: 'string' },
        { name: 'client_version', type: 'number' },
        { name: 'retry_count', type: 'number' },
        { name: 'max_retries', type: 'number' },
        { name: 'last_retry_at', type: 'number', isOptional: true },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'enqueued_at', type: 'number' },
      ],
    }),
  ],
});

export async function setupTestDatabase(): Promise<Database> {
  const adapter = new LokiJSAdapter({
    schema: testDbSchema,
  });

  const database = new Database({
    adapter,
    modelClasses: [],
  });

  return database;
}

export async function cleanupTestDatabase(db: Database): Promise<void> {
  try {
    await db.action(async () => {
      const collections = ['jobs', 'customers', 'invoices', 'payments', 'operation_queue'];
      for (const name of collections) {
        try {
          const collection = db.get(name);
          const items = await collection.query().fetch();
          for (const item of items) {
            await item.markAsDeleted();
          }
        } catch (error) {
          // Collection might not exist
        }
      }
    });
  } catch (error) {
    // Cleanup might fail on test db close
  }
}
