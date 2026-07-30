/**
 * Mobile Sync Service
 *
 * Handles bi-directional sync with server:
 * - Pull: Reconcile server customers and jobs into WatermelonDB
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
  jobs?: Array<{
    id: string;
    artisanId: string;
    clientId: string;
    customerId?: string;
    title: string;
    description: string;
    category: string;
    location: string;
    priority?: string;
    estimatedCost?: number;
    status: string;
    completedAt?: string;
    isArchived: boolean;
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
 * Reconcile pulled customers and jobs into WatermelonDB
 * Applies server data as authoritative source
 */
export async function reconcilePullChanges(
  database: Database,
  pullResponse: PullResponse
): Promise<void> {
  await database.write(async () => {
    // Reconcile customers
    if (pullResponse.customers && pullResponse.customers.length > 0) {
      const customersCollection = database.get('customers');

      for (const serverCustomer of pullResponse.customers) {
        try {
          const existing = await customersCollection.query().fetch().then(records =>
            records.find((r: any) => r._raw.id === serverCustomer.id)
          );

          if (existing) {
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
    }

    // Reconcile jobs
    if (pullResponse.jobs && pullResponse.jobs.length > 0) {
      const jobsCollection = database.get('jobs');

      for (const serverJob of pullResponse.jobs) {
        try {
          const existing = await jobsCollection.query().fetch().then(records =>
            records.find((r: any) => r._raw.id === serverJob.id)
          );

          if (existing) {
            await existing.update((j: any) => {
              j.title = serverJob.title;
              j.description = serverJob.description;
              j.category = serverJob.category;
              j.location = serverJob.location;
              j.priority = serverJob.priority || null;
              j.estimated_cost = serverJob.estimatedCost || 0;
              j.status = serverJob.status;
              j.completed_at = serverJob.completedAt ? new Date(serverJob.completedAt).getTime() : null;
              j.is_archived = serverJob.isArchived;
              j.customer_id = serverJob.customerId || null;
              j.server_version = serverJob.serverVersion;
              j.sync_status = 'synced';
              j.updated_at = new Date(serverJob.updatedAt).getTime();
            });
          } else if (!serverJob.deleted) {
            await jobsCollection.create((j: any) => {
              j.id = serverJob.id;
              j.artisan_id = serverJob.artisanId;
              j.client_id = serverJob.clientId;
              j.customer_id = serverJob.customerId || null;
              j.title = serverJob.title;
              j.description = serverJob.description;
              j.category = serverJob.category;
              j.location = serverJob.location;
              j.priority = serverJob.priority || null;
              j.estimated_cost = serverJob.estimatedCost || 0;
              j.status = serverJob.status;
              j.completed_at = serverJob.completedAt ? new Date(serverJob.completedAt).getTime() : null;
              j.is_archived = serverJob.isArchived;
              j.client_version = 0;
              j.server_version = serverJob.serverVersion;
              j.sync_status = 'synced';
              j.created_at = new Date(serverJob.createdAt).getTime();
              j.updated_at = new Date(serverJob.updatedAt).getTime();
            });
          }
        } catch (error) {
          console.error(`Failed to reconcile job ${serverJob.id}:`, error);
          throw error;
        }
      }
    }
  });
}

/**
 * Reconcile push result: update local state after successful operation
 * Supports both customers and jobs
 */
export async function reconcilePushResult(
  database: Database,
  entityId: string,
  result: PushResult
): Promise<void> {
  if (!result.success) {
    return;
  }

  await database.write(async () => {
    // Try to find in customers first
    const customersCollection = database.get('customers');
    const customer = await customersCollection.find(entityId).catch(() => null);

    if (customer) {
      if (result.conflict && result.serverData) {
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
      } else if (result.serverVersion !== undefined) {
        await customer.update((c: any) => {
          c.server_version = result.serverVersion || 0;
          c.sync_status = 'synced';
          c.client_version = result.serverVersion || 0;
        });
      }
      await removeOperationFromQueue(database, entityId);
      return;
    }

    // Try jobs
    const jobsCollection = database.get('jobs');
    const job = await jobsCollection.find(entityId).catch(() => null);

    if (job) {
      if (result.conflict && result.serverData) {
        await job.update((j: any) => {
          j.title = result.serverData.title;
          j.description = result.serverData.description;
          j.category = result.serverData.category;
          j.location = result.serverData.location;
          j.priority = result.serverData.priority || null;
          j.estimated_cost = result.serverData.estimatedCost || 0;
          j.status = result.serverData.status;
          j.completed_at = result.serverData.completedAt ? new Date(result.serverData.completedAt).getTime() : null;
          j.is_archived = result.serverData.isArchived;
          j.customer_id = result.serverData.customerId || null;
          j.server_version = result.serverVersion || result.serverData.serverVersion;
          j.sync_status = 'synced';
          j.client_version = result.serverVersion || result.serverData.serverVersion;
        });
      } else if (result.serverVersion !== undefined) {
        await job.update((j: any) => {
          j.server_version = result.serverVersion || 0;
          j.sync_status = 'synced';
          j.client_version = result.serverVersion || 0;
        });
      }
      await removeOperationFromQueue(database, entityId);
    }
  });
}

/**
 * Remove operation from queue after successful sync
 * Removes ALL operations for this entity (not just first match) to handle retries
 */
async function removeOperationFromQueue(database: Database, entityId: string): Promise<void> {
  try {
    await database.write(async () => {
      const queueCollection = database.get('operation_queue');
      const queued = await queueCollection.query().fetch();
      for (const op of queued) {
        const raw = (op as any)._raw;
        if (raw.entity_id === entityId) {
          await op.destroyPermanently();
        }
      }
    });
  } catch (error) {
    console.warn('Failed to remove operation from queue:', error);
  }
}
