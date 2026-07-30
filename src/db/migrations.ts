/**
 * WatermelonDB Schema Migrations
 *
 * Defines schema upgrades from one version to the next.
 * WatermelonDB automatically applies these migrations during database initialization.
 */

import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations';

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
      ],
    },
  ],
});
