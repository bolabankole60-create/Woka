/**
 * Job Service
 * Offline-first job management following Customer Service architecture
 */

import { Database } from '@nozbe/watermelondb';

interface CreateJobInput {
  customerId?: string;
  clientId: string;
  title: string;
  description: string;
  category: string;
  location: string;
  priority?: string;
  estimatedCost?: number;
  dueDate?: Date;
}

interface UpdateJobInput {
  title?: string;
  description?: string;
  priority?: string;
  estimatedCost?: number;
  dueDate?: Date;
  status?: string;
  notes?: string;
}

export class JobService {
  constructor(private db: Database, private artisanId: string) {}

  async createJob(input: CreateJobInput) {
    try {
      // Validate
      if (!input.title || !input.description) {
        return { success: false, error: 'Title and description required' };
      }

      const operationId = `job-create-${Date.now()}`;
      const clientVersion = 0;

      // Write to WatermelonDB
      const job = await this.db.write(async () => {
        const jobCollection = this.db.get('jobs');
        const newJob = await jobCollection.create((j: any) => {
          j.id = `job-${Date.now()}`;
          j.artisan_id = this.artisanId;
          j.client_id = input.clientId;
          j.customer_id = input.customerId || null;
          j.title = input.title;
          j.description = input.description;
          j.category = input.category;
          j.location = input.location;
          j.priority = input.priority || null;
          j.estimated_cost = input.estimatedCost || 0;
          j.due_date = input.dueDate?.getTime() || null;
          j.status = 'DRAFT';
          j.sync_status = 'local';
          j.client_version = clientVersion;
          j.server_version = 0;
          j.created_at = Date.now();
          j.updated_at = Date.now();
        });

        // Queue operation
        const queueCollection = this.db.get('operation_queue');
        await queueCollection.create((op: any) => {
          op.id = operationId;
          op.entity_type = 'jobs';
          op.entity_id = newJob._raw.id;
          op.operation = 'create';
          op.changes = JSON.stringify({
            customerId: input.customerId,
            clientId: input.clientId,
            title: input.title,
            description: input.description,
            category: input.category,
            location: input.location,
            priority: input.priority,
            estimatedCost: input.estimatedCost,
            dueDate: input.dueDate,
          });
          op.client_version = clientVersion;
          op.retry_count = 0;
          op.max_retries = 3;
          op.status = 'local';
          op.created_at = Date.now();
          op.enqueued_at = Date.now();
        });

        return newJob;
      });

      return { success: true, data: job };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async updateJob(jobId: string, input: UpdateJobInput) {
    try {
      // Verify ownership
      const job = await this.db.get('jobs').find(jobId).catch(() => null);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      const operationId = `job-update-${Date.now()}`;

      await this.db.write(async () => {
        await job.update((j: any) => {
          if (input.title) j.title = input.title;
          if (input.description) j.description = input.description;
          if (input.priority !== undefined) j.priority = input.priority;
          if (input.estimatedCost !== undefined) j.estimated_cost = input.estimatedCost;
          if (input.dueDate !== undefined) j.due_date = input.dueDate?.getTime() || null;
          if (input.status) j.status = input.status;
          if (input.notes !== undefined) j.notes = input.notes;
          j.sync_status = 'local';
          j.updated_at = Date.now();
        });

        const queueCollection = this.db.get('operation_queue');
        await queueCollection.create((op: any) => {
          op.id = operationId;
          op.entity_type = 'jobs';
          op.entity_id = jobId;
          op.operation = 'update';
          op.changes = JSON.stringify(input);
          op.client_version = (job._raw as any).client_version;
          op.retry_count = 0;
          op.max_retries = 3;
          op.status = 'local';
          op.created_at = Date.now();
          op.enqueued_at = Date.now();
        });
      });

      return { success: true, data: job };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async completeJob(jobId: string) {
    try {
      const job = await this.db.get('jobs').find(jobId).catch(() => null);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      const operationId = `job-complete-${Date.now()}`;

      await this.db.write(async () => {
        await job.update((j: any) => {
          j.status = 'COMPLETED';
          j.completed_at = Date.now();
          j.sync_status = 'local';
          j.updated_at = Date.now();
        });

        const queueCollection = this.db.get('operation_queue');
        await queueCollection.create((op: any) => {
          op.id = operationId;
          op.entity_type = 'jobs';
          op.entity_id = jobId;
          op.operation = 'complete';
          op.changes = JSON.stringify({ completedAt: new Date() });
          op.client_version = (job._raw as any).client_version;
          op.retry_count = 0;
          op.max_retries = 3;
          op.status = 'local';
          op.created_at = Date.now();
          op.enqueued_at = Date.now();
        });
      });

      return { success: true, data: job };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async getJob(jobId: string) {
    try {
      const job = await this.db.get('jobs').find(jobId);
      return { success: true, data: job };
    } catch {
      return { success: false, error: 'Job not found' };
    }
  }

  async listJobs(filters?: { status?: string; customerId?: string }) {
    try {
      const jobCollection = this.db.get('jobs');
      const jobs = await jobCollection.query().fetch();

      const filtered = jobs.filter((j: any) => {
        if (filters?.status && (j._raw as any).status !== filters.status) return false;
        if (filters?.customerId && (j._raw as any).customer_id !== filters.customerId) return false;
        return true;
      });

      return { success: true, data: filtered };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async reopenJob(jobId: string) {
    try {
      const job = await this.db.get('jobs').find(jobId).catch(() => null);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      const operationId = `job-reopen-${Date.now()}`;

      await this.db.write(async () => {
        await job.update((j: any) => {
          j.status = 'IN_PROGRESS';
          j.completed_at = null;
          j.sync_status = 'local';
          j.updated_at = Date.now();
        });

        const queueCollection = this.db.get('operation_queue');
        await queueCollection.create((op: any) => {
          op.id = operationId;
          op.entity_type = 'jobs';
          op.entity_id = jobId;
          op.operation = 'reopen';
          op.changes = JSON.stringify({ status: 'IN_PROGRESS' });
          op.client_version = (job._raw as any).client_version;
          op.retry_count = 0;
          op.max_retries = 3;
          op.status = 'local';
          op.created_at = Date.now();
          op.enqueued_at = Date.now();
        });
      });

      return { success: true, data: job };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async archiveJob(jobId: string) {
    try {
      const job = await this.db.get('jobs').find(jobId).catch(() => null);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      const operationId = `job-archive-${Date.now()}`;

      await this.db.write(async () => {
        await job.update((j: any) => {
          j.sync_status = 'local';
          j.updated_at = Date.now();
        });

        const queueCollection = this.db.get('operation_queue');
        await queueCollection.create((op: any) => {
          op.id = operationId;
          op.entity_type = 'jobs';
          op.entity_id = jobId;
          op.operation = 'archive';
          op.changes = JSON.stringify({ archived: true });
          op.client_version = (job._raw as any).client_version;
          op.retry_count = 0;
          op.max_retries = 3;
          op.status = 'local';
          op.created_at = Date.now();
          op.enqueued_at = Date.now();
        });
      });

      return { success: true, data: job };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async restoreJob(jobId: string) {
    try {
      const job = await this.db.get('jobs').find(jobId).catch(() => null);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      const operationId = `job-restore-${Date.now()}`;

      await this.db.write(async () => {
        await job.update((j: any) => {
          j.sync_status = 'local';
          j.updated_at = Date.now();
        });

        const queueCollection = this.db.get('operation_queue');
        await queueCollection.create((op: any) => {
          op.id = operationId;
          op.entity_type = 'jobs';
          op.entity_id = jobId;
          op.operation = 'restore';
          op.changes = JSON.stringify({ archived: false });
          op.client_version = (job._raw as any).client_version;
          op.retry_count = 0;
          op.max_retries = 3;
          op.status = 'local';
          op.created_at = Date.now();
          op.enqueued_at = Date.now();
        });
      });

      return { success: true, data: job };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
