/**
 * Mobile Sync Service
 *
 * Handles bi-directional sync with server:
 * - Pull: Reconcile server customers into WatermelonDB
 * - Push: Send pending operations and update local state
 * - Conflict Resolution: Apply serverData as authoritative
 */

import { Database } from '@nozbe/watermelondb';

interface PullResponse {
  customers?: Array<{
    id: string;
    artisanId: string;
    name: string;
    phone: string;
    normalizedPhone: string;
    email?: string;
    address?: string;
    notes?: string;
    isArchived: boolean;
    archivedAt?: string;
    serverVersion: number;
    deleted: boolean;
    updatedAt: string;
    createdAt: string;
  }>;
  serverTimestamp: number;
}

interface PushResult {
  success: boolean;
  serverVersion?: number;
  serverData?: any;
  conflict?: boolean;
  error?: string;
}

/**
 * Reconcile pulled customers into WatermelonDB
 * Applies server data as authoritative source
 */
export async function reconcilePullChanges(
  database: Database,
  pullResponse: PullResponse
): Promise<void> {
  if (!pullResponse.customers || pullResponse.customers.length === 0) {
    return;
  }

  await database.write(async () => {
    const customersCollection = database.get('customers');

    for (const serverCustomer of pullResponse.customers!) {
      try {
        // Find existing local record by stable ID
        const existing = await customersCollection.query().fetch().then(records =>
          records.find((r: any) => r._raw.id === serverCustomer.id)
        );

        if (existing) {
          // Update existing - apply serverData as authoritative
          await existing.update((c: any) => {
            c.name = serverCustomer.name;
            c.phone = serverCustomer.phone;
            c.normalized_phone = serverCustomer.normalizedPhone;
            c.email = serverCustomer.email || null;
            c.address = serverCustomer.address || null;
            c.notes = serverCustomer.notes || null;
            c.is_archived = serverCustomer.isArchived;
            c.archived_at = serverCustomer.archivedAt ? new Date(serverCustomer.archivedAt).getTime() : null;
            c.server_version = serverCustomer.serverVersion;
            c.sync_status = 'synced';
            c.updated_at = new Date(serverCustomer.updatedAt).getTime();
          });
        } else if (!serverCustomer.deleted) {
          // Create new record
          await customersCollection.create((c: any) => {
            c.id = serverCustomer.id;
            c.artisan_id = serverCustomer.artisanId;
            c.name = serverCustomer.name;
            c.phone = serverCustomer.phone;
            c.normalized_phone = serverCustomer.normalizedPhone;
            c.email = serverCustomer.email || null;
            c.address = serverCustomer.address || null;
            c.notes = serverCustomer.notes || null;
            c.is_archived = serverCustomer.isArchived;
            c.archived_at = serverCustomer.archivedAt ? new Date(serverCustomer.archivedAt).getTime() : null;
            c.client_version = 0;
            c.server_version = serverCustomer.serverVersion;
            c.sync_status = 'synced';
            c.created_at = new Date(serverCustomer.createdAt).getTime();
            c.updated_at = new Date(serverCustomer.updatedAt).getTime();
          });
        }
      } catch (error) {
        console.error(`Failed to reconcile customer ${serverCustomer.id}:`, error);
        throw error;
      }
    }
  });
}

/**
 * Reconcile push result: update local customer state after successful operation
 */
export async function reconcilePushResult(
  database: Database,
  customerId: string,
  result: PushResult
): Promise<void> {
  if (!result.success) {
    return;
  }

  if (result.conflict && result.serverData) {
    // Conflict: apply serverData as authoritative
    await database.write(async () => {
      const customersCollection = database.get('customers');
      const customer = await customersCollection.find(customerId).catch(() => null);

      if (customer) {
        await customer.update((c: any) => {
          c.name = result.serverData.name;
          c.phone = result.serverData.phone;
          c.normalized_phone = result.serverData.normalizedPhone;
          c.email = result.serverData.email || null;
          c.address = result.serverData.address || null;
          c.notes = result.serverData.notes || null;
          c.is_archived = result.serverData.isArchived;
          c.archived_at = result.serverData.archivedAt ? new Date(result.serverData.archivedAt).getTime() : null;
          c.server_version = result.serverVersion || result.serverData.serverVersion;
          c.sync_status = 'synced';
          c.client_version = result.serverVersion || result.serverData.serverVersion;
        });
      }
    });

    // Remove operation from queue on conflict
    await removeOperationFromQueue(database, customerId);
  } else if (result.serverVersion !== undefined) {
    // Success: update server version and mark as synced
    await database.write(async () => {
      const customersCollection = database.get('customers');
      const customer = await customersCollection.find(customerId).catch(() => null);

      if (customer) {
        await customer.update((c: any) => {
          c.server_version = result.serverVersion || 0;
          c.sync_status = 'synced';
          c.client_version = result.serverVersion || 0;
        });
      }
    });

    // Remove from queue on success
    await removeOperationFromQueue(database, customerId);
  }
}

/**
 * Remove customer operation from queue after successful sync
 */
async function removeOperationFromQueue(database: Database, customerId: string): Promise<void> {
  try {
    await database.write(async () => {
      const queueCollection = database.get('operation_queue');
      const queued = await queueCollection.query().fetch();
      for (const op of queued) {
        if ((op as any).entity_id === customerId && (op as any).entity_type === 'customers') {
          await op.destroyPermanently();
        }
      }
    });
  } catch (error) {
    console.warn('Failed to remove operation from queue:', error);
  }
}
