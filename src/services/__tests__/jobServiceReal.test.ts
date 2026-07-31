/**
 * Real JobService Behavioral Tests
 * Executes actual service methods with in-memory database
 */

import { JobService } from '../jobService';
import { InMemoryDatabase } from './inMemoryDatabase';

describe('JobService Real Behavior', () => {
  let db: InMemoryDatabase;
  const artisanId = 'artisan-123';
  const clientId = 'client-456';

  beforeEach(() => {
    db = new InMemoryDatabase();
  });

  describe('Job Creation', () => {
    it('should create job with required fields and set status DRAFT', async () => {
      const service = new JobService(db as any, artisanId);

      const result = await service.createJob({
        clientId,
        title: 'Plumbing Repair',
        description: 'Fix leaking faucet',
        category: 'plumbing',
        location: 'Kitchen',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const raw = result.data?._raw as any;
      expect(raw.title).toBe('Plumbing Repair');
      expect(raw.description).toBe('Fix leaking faucet');
      expect(raw.status).toBe('DRAFT');
      expect(raw.sync_status).toBe('local');
      expect(raw.customer_id).toBeNull();
    });

    it('should create job with customer ID', async () => {
      const service = new JobService(db as any, artisanId);
      const customerId = 'customer-789';

      const result = await service.createJob({
        clientId,
        customerId,
        title: 'Electrical Work',
        description: 'Install outlet',
        category: 'electrical',
        location: 'Bedroom',
      });

      expect(result.success).toBe(true);
      expect((result.data?._raw as any).customer_id).toBe(customerId);
    });

    it('should queue create operation', async () => {
      const service = new JobService(db as any, artisanId);

      await service.createJob({
        clientId,
        title: 'Test Job',
        description: 'Description',
        category: 'plumbing',
        location: 'Location',
      });

      const queueCollection = db.get('operation_queue');
      const operations = await queueCollection.query().fetch();

      expect(operations.length).toBe(1);
      expect((operations[0]._raw as any).operation).toBe('create');
      expect((operations[0]._raw as any).status).toBe('local');
    });

    it('should reject job with missing title', async () => {
      const service = new JobService(db as any, artisanId);

      const result = await service.createJob({
        clientId,
        title: '',
        description: 'Description',
        category: 'plumbing',
        location: 'Location',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Title and description required');
    });

    it('should not write job on validation failure', async () => {
      const service = new JobService(db as any, artisanId);

      await service.createJob({
        clientId,
        title: '',
        description: '',
        category: 'plumbing',
        location: 'Location',
      });

      const jobsCollection = db.get('jobs');
      const jobs = await jobsCollection.query().fetch();

      expect(jobs.length).toBe(0);
    });
  });

  describe('Job Update with Customer', () => {
    let jobId: string;

    beforeEach(async () => {
      const service = new JobService(db as any, artisanId);
      const result = await service.createJob({
        clientId,
        title: 'Test Job',
        description: 'Description',
        category: 'plumbing',
        location: 'Location',
      });
      jobId = (result.data?._raw as any).id;
    });

    it('should update customer ID', async () => {
      const service = new JobService(db as any, artisanId);
      const newCustomerId = 'customer-new';

      const result = await service.updateJob(jobId, {
        customerId: newCustomerId,
      });

      expect(result.success).toBe(true);

      const jobsCollection = db.get('jobs');
      const job = await jobsCollection.find(jobId);
      expect((job?._raw as any).customer_id).toBe(newCustomerId);
    });

    it('should clear customer by passing null', async () => {
      const service = new JobService(db as any, artisanId);

      // First set a customer
      await service.updateJob(jobId, { customerId: 'customer-1' });

      // Then clear it
      const result = await service.updateJob(jobId, { customerId: null });

      expect(result.success).toBe(true);

      const jobsCollection = db.get('jobs');
      const job = await jobsCollection.find(jobId);
      expect((job?._raw as any).customer_id).toBeNull();
    });

    it('should preserve customer if not specified', async () => {
      const service = new JobService(db as any, artisanId);

      // Set customer
      await service.updateJob(jobId, { customerId: 'customer-1' });

      // Update other field without specifying customer
      await service.updateJob(jobId, { title: 'New Title' });

      const jobsCollection = db.get('jobs');
      const job = await jobsCollection.find(jobId);
      expect((job?._raw as any).customer_id).toBe('customer-1');
      expect((job?._raw as any).title).toBe('New Title');
    });

    it('should queue update operation', async () => {
      const service = new JobService(db as any, artisanId);
      db.get('operation_queue').query().fetch().then((ops: any) => {
        ops.forEach((op: any) => {
          if ((op._raw as any).operation === 'create') {
            db.get('operation_queue');
          }
        });
      });

      await service.updateJob(jobId, { title: 'Updated' });

      const queueCollection = db.get('operation_queue');
      const operations = await queueCollection.query().fetch();
      const updateOps = operations.filter(
        (op: any) => (op._raw as any).operation === 'update'
      );

      expect(updateOps.length).toBeGreaterThan(0);
    });
  });

  describe('Job Status Changes', () => {
    let jobId: string;

    beforeEach(async () => {
      const service = new JobService(db as any, artisanId);
      const result = await service.createJob({
        clientId,
        title: 'Test Job',
        description: 'Description',
        category: 'plumbing',
        location: 'Location',
      });
      jobId = (result.data?._raw as any).id;
    });

    it('should complete job and set timestamp', async () => {
      const service = new JobService(db as any, artisanId);

      const result = await service.completeJob(jobId);

      expect(result.success).toBe(true);

      const jobsCollection = db.get('jobs');
      const job = await jobsCollection.find(jobId);
      expect((job?._raw as any).status).toBe('COMPLETED');
      expect((job?._raw as any).completed_at).toBeDefined();
      expect(typeof (job?._raw as any).completed_at).toBe('number');
    });

    it('should reopen completed job', async () => {
      const service = new JobService(db as any, artisanId);

      await service.completeJob(jobId);
      const result = await service.reopenJob(jobId);

      expect(result.success).toBe(true);

      const jobsCollection = db.get('jobs');
      const job = await jobsCollection.find(jobId);
      expect((job?._raw as any).status).toBe('IN_PROGRESS');
      expect((job?._raw as any).completed_at).toBeNull();
    });
  });

  describe('Job Archive and Restore', () => {
    let jobId: string;

    beforeEach(async () => {
      const service = new JobService(db as any, artisanId);
      const result = await service.createJob({
        clientId,
        title: 'Test Job',
        description: 'Description',
        category: 'plumbing',
        location: 'Location',
      });
      jobId = (result.data?._raw as any).id;
    });

    it('should archive job locally before queueing', async () => {
      const service = new JobService(db as any, artisanId);

      const result = await service.archiveJob(jobId);

      expect(result.success).toBe(true);

      const jobsCollection = db.get('jobs');
      const job = await jobsCollection.find(jobId);
      expect((job?._raw as any).is_archived).toBe(true);
      expect((job?._raw as any).archived_at).toBeDefined();
    });

    it('should restore archived job', async () => {
      const service = new JobService(db as any, artisanId);

      await service.archiveJob(jobId);
      const result = await service.restoreJob(jobId);

      expect(result.success).toBe(true);

      const jobsCollection = db.get('jobs');
      const job = await jobsCollection.find(jobId);
      expect((job?._raw as any).is_archived).toBe(false);
      expect((job?._raw as any).archived_at).toBeNull();
    });
  });

  describe('List and Filter Jobs', () => {
    let jobId2: string;

    beforeEach(async () => {
      const service = new JobService(db as any, artisanId);

      await service.createJob({
        clientId,
        customerId: 'customer-1',
        title: 'Job 1',
        description: 'Desc 1',
        category: 'plumbing',
        location: 'Location 1',
      });

      const result2 = await service.createJob({
        clientId,
        title: 'Job 2',
        description: 'Desc 2',
        category: 'electrical',
        location: 'Location 2',
      });
      jobId2 = (result2.data?._raw as any).id;

      await service.createJob({
        clientId,
        customerId: 'customer-1',
        title: 'Job 3',
        description: 'Desc 3',
        category: 'plumbing',
        location: 'Location 3',
      });

      await service.completeJob(jobId2);
    });

    it('should list all jobs', async () => {
      const service = new JobService(db as any, artisanId);

      const result = await service.listJobs();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(3);
    });

    it('should filter jobs by status', async () => {
      const service = new JobService(db as any, artisanId);

      const result = await service.listJobs({ status: 'COMPLETED' });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
    });

    it('should filter jobs by customer ID', async () => {
      const service = new JobService(db as any, artisanId);

      const result = await service.listJobs({ customerId: 'customer-1' });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });

    it('should combine filters', async () => {
      const service = new JobService(db as any, artisanId);

      const result = await service.listJobs({
        status: 'DRAFT',
        customerId: 'customer-1',
      });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2); // jobId1 and jobId3 are both DRAFT with customer-1
    });
  });

  describe('Sync Status Tracking', () => {
    it('should track sync status and timestamps', async () => {
      const service = new JobService(db as any, artisanId);

      const createResult = await service.createJob({
        clientId,
        title: 'Test Job',
        description: 'Description',
        category: 'plumbing',
        location: 'Location',
      });

      const jobId = (createResult.data?._raw as any).id;
      const createdAt = (createResult.data?._raw as any).created_at;

      await service.updateJob(jobId, { title: 'Updated' });

      const jobsCollection = db.get('jobs');
      const job = await jobsCollection.find(jobId);
      const raw = job?._raw as any;

      expect(raw.sync_status).toBe('local');
      expect(raw.created_at).toBeDefined();
      expect(raw.updated_at).toBeDefined();
      expect(raw.updated_at).toBeGreaterThanOrEqual(createdAt);
    });
  });
});
