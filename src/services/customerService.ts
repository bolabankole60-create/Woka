/**
 * Offline-First Customer Service
 *
 * Provides local-first operations for customer management:
 * 1. Write to WatermelonDB locally
 * 2. Queue operation for sync
 * 3. Return immediately for UI update
 * 4. Sync pushes to server
 */

import { Database } from '@nozbe/watermelondb';
import Customer from '../models/Customer';
import { normalizeNigerianPhone } from '../utils/phoneFormatter';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface CustomerServiceResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class CustomerService {
  constructor(private db: Database, private artisanId: string) {}

  async createCustomer(input: CreateCustomerInput): Promise<CustomerServiceResult> {
    try {
      // Validate input
      if (!input.name?.trim()) {
        return { success: false, error: 'Name is required' };
      }
      if (!input.phone?.trim()) {
        return { success: false, error: 'Phone is required' };
      }

      const normalizedPhone = normalizeNigerianPhone(input.phone);

      // Check for duplicate within WatermelonDB (local)
      const existing = await this.db
        .get<Customer>('customers')
        .query()
        .fetch();

      const duplicate = existing.find(
        (c) =>
          c.normalizedPhone === normalizedPhone &&
          c.artisanId === this.artisanId &&
          !c.isArchived
      );

      if (duplicate) {
        return {
          success: false,
          error: 'A customer with this phone number already exists',
        };
      }

      const customerId = generateId();
      const now = Date.now();

      // 1. Write locally to WatermelonDB
      await this.db.write(async () => {
        const customersCollection = this.db.get<Customer>('customers');
        return customersCollection.create((c: any) => {
          c.id = customerId;
          c.artisan_id = this.artisanId;
          c.name = input.name;
          c.phone = input.phone;
          c.normalized_phone = normalizedPhone;
          c.email = input.email || null;
          c.address = input.address || null;
          c.notes = input.notes || null;
          c.is_archived = false;
          c.archived_at = null;
          c.sync_status = 'local';
          c.client_version = 0;
          c.server_version = 0;
          c.last_synced_at = null;
          c.created_at = now;
          c.updated_at = now;
        });
      });

      // 2. Queue operation for sync
      await this.db.write(async () => {
        const queueCollection = this.db.get('operation_queue');
        await queueCollection.create((op: any) => {
          op.id = generateId();
          op.entity_type = 'customers';
          op.entity_id = customerId;
          op.operation = 'create';
          op.changes = JSON.stringify({
            name: input.name,
            phone: input.phone,
            normalized_phone: normalizedPhone,
            email: input.email || null,
            address: input.address || null,
            notes: input.notes || null,
          });
          op.client_version = 0;
          op.status = 'local';
          op.retry_count = 0;
          op.max_retries = 3;
          op.created_at = now;
          op.enqueued_at = now;
        });
      });

      // 3. Return local state immediately
      return {
        success: true,
        data: {
          id: customerId,
          artisanId: this.artisanId,
          name: input.name,
          phone: input.phone,
          normalizedPhone,
          email: input.email || null,
          address: input.address || null,
          notes: input.notes || null,
          isArchived: false,
          archivedAt: null,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async updateCustomer(
    customerId: string,
    input: UpdateCustomerInput
  ): Promise<CustomerServiceResult> {
    try {
      // Load from WatermelonDB
      const customersCollection = this.db.get<Customer>('customers');
      const customer = await customersCollection.find(customerId).catch(() => null);

      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }

      // Check ownership
      if (customer.artisanId !== this.artisanId) {
        return { success: false, error: 'Access denied' };
      }

      // Validate phone if provided
      let normalizedPhone = customer.normalizedPhone;
      if (input.phone) {
        normalizedPhone = normalizeNigerianPhone(input.phone);

        // Check for duplicate
        const existing = await customersCollection.query().fetch();
        const duplicate = existing.find(
          (c) =>
            c.normalizedPhone === normalizedPhone &&
            c.artisanId === this.artisanId &&
            c.id !== customerId &&
            !c.isArchived
        );

        if (duplicate) {
          return {
            success: false,
            error: 'A customer with this phone number already exists',
          };
        }
      }

      const now = Date.now();

      // 1. Update in WatermelonDB
      await this.db.write(async () => {
        await customer.update((c: any) => {
          if (input.name !== undefined) c.name = input.name;
          if (input.phone !== undefined) {
            c.phone = input.phone;
            c.normalized_phone = normalizedPhone;
          }
          if (input.email !== undefined) c.email = input.email || null;
          if (input.address !== undefined) c.address = input.address || null;
          if (input.notes !== undefined) c.notes = input.notes || null;
          c.sync_status = 'local';
          c.client_version = customer.clientVersion;
          c.updated_at = now;
        });
      });

      // 2. Queue operation for sync
      await this.db.write(async () => {
        const queueCollection = this.db.get('operation_queue');
        await queueCollection.create((op: any) => {
          op.id = generateId();
          op.entity_type = 'customers';
          op.entity_id = customerId;
          op.operation = 'update';
          op.changes = JSON.stringify({
            ...(input.name !== undefined && { name: input.name }),
            ...(input.phone !== undefined && { phone: input.phone }),
            ...(input.phone !== undefined && { normalized_phone: normalizedPhone }),
            ...(input.email !== undefined && { email: input.email || null }),
            ...(input.address !== undefined && { address: input.address || null }),
            ...(input.notes !== undefined && { notes: input.notes || null }),
          });
          op.client_version = customer.clientVersion;
          op.status = 'local';
          op.retry_count = 0;
          op.max_retries = 3;
          op.created_at = now;
          op.enqueued_at = now;
        });
      });

      // 3. Return updated state
      return {
        success: true,
        data: {
          id: customerId,
          artisanId: customer.artisanId,
          name: input.name ?? customer.name,
          phone: input.phone ?? customer.phone,
          normalizedPhone,
          email: input.email ?? customer.email,
          address: input.address ?? customer.address,
          notes: input.notes ?? customer.notes,
          isArchived: customer.isArchived,
          archivedAt: customer.archivedAt,
          createdAt: customer.createdAt,
          updatedAt: new Date(now),
        },
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async archiveCustomer(customerId: string): Promise<CustomerServiceResult> {
    try {
      const customersCollection = this.db.get<Customer>('customers');
      const customer = await customersCollection.find(customerId).catch(() => null);

      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }

      if (customer.artisanId !== this.artisanId) {
        return { success: false, error: 'Access denied' };
      }

      const now = Date.now();

      // 1. Update in WatermelonDB
      await this.db.write(async () => {
        await customer.update((c: any) => {
          c.is_archived = true;
          c.archived_at = now;
          c.sync_status = 'local';
          c.updated_at = now;
        });
      });

      // 2. Queue operation
      await this.db.write(async () => {
        const queueCollection = this.db.get('operation_queue');
        await queueCollection.create((op: any) => {
          op.id = generateId();
          op.entity_type = 'customers';
          op.entity_id = customerId;
          op.operation = 'archive';
          op.changes = JSON.stringify({
            is_archived: true,
            archived_at: now,
          });
          op.client_version = customer.clientVersion;
          op.status = 'local';
          op.retry_count = 0;
          op.max_retries = 3;
          op.created_at = now;
          op.enqueued_at = now;
        });
      });

      return {
        success: true,
        data: {
          id: customerId,
          isArchived: true,
          archivedAt: now,
        },
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async restoreCustomer(customerId: string): Promise<CustomerServiceResult> {
    try {
      const customersCollection = this.db.get<Customer>('customers');
      const customer = await customersCollection.find(customerId).catch(() => null);

      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }

      if (customer.artisanId !== this.artisanId) {
        return { success: false, error: 'Access denied' };
      }

      const now = Date.now();

      // 1. Update in WatermelonDB
      await this.db.write(async () => {
        await customer.update((c: any) => {
          c.is_archived = false;
          c.archived_at = null;
          c.sync_status = 'local';
          c.updated_at = now;
        });
      });

      // 2. Queue operation
      await this.db.write(async () => {
        const queueCollection = this.db.get('operation_queue');
        await queueCollection.create((op: any) => {
          op.id = generateId();
          op.entity_type = 'customers';
          op.entity_id = customerId;
          op.operation = 'restore';
          op.changes = JSON.stringify({
            is_archived: false,
            archived_at: null,
          });
          op.client_version = customer.clientVersion;
          op.status = 'local';
          op.retry_count = 0;
          op.max_retries = 3;
          op.created_at = now;
          op.enqueued_at = now;
        });
      });

      return {
        success: true,
        data: {
          id: customerId,
          isArchived: false,
          archivedAt: null,
        },
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getCustomer(customerId: string): Promise<CustomerServiceResult> {
    try {
      const customersCollection = this.db.get<Customer>('customers');
      const customer = await customersCollection.find(customerId).catch(() => null);

      if (!customer) {
        return { success: false, error: 'Customer not found' };
      }

      if (customer.artisanId !== this.artisanId) {
        return { success: false, error: 'Access denied' };
      }

      return {
        success: true,
        data: {
          id: customer.id,
          artisanId: customer.artisanId,
          name: customer.name,
          phone: customer.phone,
          normalizedPhone: customer.normalizedPhone,
          email: customer.email,
          address: customer.address,
          notes: customer.notes,
          isArchived: customer.isArchived,
          archivedAt: customer.archivedAt,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
          syncStatus: (customer._raw as any).sync_status,
          clientVersion: customer.clientVersion,
          serverVersion: customer.serverVersion,
        },
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async listCustomers(isArchived?: boolean): Promise<CustomerServiceResult> {
    try {
      const customersCollection = this.db.get<Customer>('customers');
      let query = customersCollection.query();

      // Filter by artisan
      // (WatermelonDB Q syntax would be used here in a full implementation)
      const all = await query.fetch();

      let filtered = all.filter((c) => c.artisanId === this.artisanId);

      if (isArchived !== undefined) {
        filtered = filtered.filter((c) => c.isArchived === isArchived);
      }

      return {
        success: true,
        data: filtered.map((c) => ({
          id: c.id,
          artisanId: c.artisanId,
          name: c.name,
          phone: c.phone,
          normalizedPhone: c.normalizedPhone,
          email: c.email,
          address: c.address,
          notes: c.notes,
          isArchived: c.isArchived,
          archivedAt: c.archivedAt,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
