/**
 * WatermelonDB Schema Migrations
 *
 * Defines schema upgrades from one version to the next.
 * WatermelonDB automatically applies these migrations during database initialization.
 */

import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations';

/**
 * Migration from schema version 4 to 5
 * Adds the customers table for Phase 2A
 */
export const dbMigrations = schemaMigrations({
  migrations: [
    {
      toVersion: 5,
      steps: [
        createTable({
          name: 'customers',
          columns: [
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
      ],
    },
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: 'jobs',
          columns: [
            { name: 'customer_id', type: 'string', isIndexed: true, isOptional: true },
            { name: 'is_archived', type: 'boolean' },
            { name: 'archived_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 7,
      steps: [
        createTable({
          name: 'invoices',
          columns: [
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
        createTable({
          name: 'invoice_items',
          columns: [
            { name: 'invoice_id', type: 'string', isIndexed: true },
            { name: 'description', type: 'string' },
            { name: 'quantity', type: 'number' },
            { name: 'unit_price', type: 'number' },
            { name: 'amount', type: 'number' },
            { name: 'category', type: 'string' },
            { name: 'created_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'payments',
          columns: [
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
      ],
    },
  ],
});
