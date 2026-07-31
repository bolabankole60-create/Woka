/**
 * Job Controller Integration Tests
 * Tests real Express handlers with actual Prisma queries
 */

import request from 'supertest';
import { Express, Router } from 'express';
import express from 'express';
import { prisma } from '../../config/database';
import { requireAuth } from '../../middleware/authMiddleware';
import { asyncHandler } from '../../middleware/errorHandler';
import {
  listJobs,
  getJob,
  createJobEndpoint,
  updateJobEndpoint,
  completeJobEndpoint,
  reopenJobEndpoint,
  archiveJobEndpoint,
  restoreJobEndpoint,
} from '../jobController';

let app: Express;

// Skip these tests if DATABASE_URL is not set (local development)
// These are integration tests that require a real PostgreSQL database
const describeIfDB = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDB('Job Controller Integration Tests', () => {
  const artisan1Id = 'artisan-1';
  const artisan2Id = 'artisan-2';
  const clientId = 'client-1';
  const userId = 'user-1';

  const token1 = `artisan:${artisan1Id}`;
  const token2 = `artisan:${artisan2Id}`;

  let jobId: string;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    const router = Router();
    router.get('/jobs', requireAuth, asyncHandler(listJobs as any));
    router.get('/jobs/:id', requireAuth, asyncHandler(getJob as any));
    router.post('/jobs', requireAuth, asyncHandler(createJobEndpoint as any));
    router.patch('/jobs/:id', requireAuth, asyncHandler(updateJobEndpoint as any));
    router.post('/jobs/:id/complete', requireAuth, asyncHandler(completeJobEndpoint as any));
    router.post('/jobs/:id/reopen', requireAuth, asyncHandler(reopenJobEndpoint as any));
    router.post('/jobs/:id/archive', requireAuth, asyncHandler(archiveJobEndpoint as any));
    router.post('/jobs/:id/restore', requireAuth, asyncHandler(restoreJobEndpoint as any));

    app.use('/api/v1', router);
  });

  beforeEach(async () => {
    // Clean up test data only if DATABASE_URL is available
    if (process.env.DATABASE_URL) {
      try {
        await prisma.job.deleteMany({});
        await prisma.customer.deleteMany({});
        await prisma.user.deleteMany({});
        // Create test users
        await prisma.user.create({
          data: {
            id: artisan1Id,
            email: 'artisan1@test.com',
            role: 'ARTISAN',
            phone: '08011111111',
            firstName: 'Artisan',
            lastName: 'One',
            state: 'Lagos',
            city: 'Lagos',
            passwordHash: 'test_hash_1',
            passwordSalt: 'test_salt_1',
          },
        });
        await prisma.user.create({
          data: {
            id: artisan2Id,
            email: 'artisan2@test.com',
            role: 'ARTISAN',
            phone: '08022222222',
            firstName: 'Artisan',
            lastName: 'Two',
            state: 'Lagos',
            city: 'Lagos',
            passwordHash: 'test_hash_2',
            passwordSalt: 'test_salt_2',
          },
        });
        // Create client user for job clientId foreign key
        await prisma.user.create({
          data: {
            id: clientId,
            email: 'client@test.com',
            role: 'CLIENT',
            phone: '08033333333',
            firstName: 'Client',
            lastName: 'User',
            state: 'Lagos',
            city: 'Lagos',
            passwordHash: 'test_hash_client',
            passwordSalt: 'test_salt_client',
          },
        });
      } catch {
        // Skip cleanup if database not available
      }
    }
  });

  afterAll(async () => {
    if (process.env.DATABASE_URL) {
      try {
        await prisma.job.deleteMany({});
        await prisma.customer.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.$disconnect();
      } catch {
        // Skip cleanup if database not available
      }
    }
  });

  describe('Authentication', () => {
    it('should reject request without Authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/jobs')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication required');
    });

    it('should reject request with invalid token format', async () => {
      const response = await request(app)
        .get('/api/v1/jobs')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token format');
    });

    it('should accept valid token format', async () => {
      const response = await request(app)
        .get('/api/v1/jobs')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Create Job', () => {
    it('should create job with required fields', async () => {
      const response = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          clientId,
          title: 'Fix Electrical Wiring',
          description: 'Rewire living room',
          category: 'electrical',
          location: 'Lagos, Nigeria',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.artisanId).toBe(artisan1Id);
      expect(response.body.data.title).toBe('Fix Electrical Wiring');
      expect(response.body.data.status).toBe('DRAFT');

      jobId = response.body.data.id;
    });

    it('should reject create without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          clientId,
          title: 'Fix Wiring',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should force artisanId from auth, not request body', async () => {
      const response = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          artisanId: artisan2Id,
          clientId,
          title: 'Fix Wiring',
          description: 'Rewire',
          category: 'electrical',
          location: 'Lagos',
        })
        .expect(201);

      expect(response.body.data.artisanId).toBe(artisan1Id);
      expect(response.body.data.artisanId).not.toBe(artisan2Id);
    });

    it('should reject invalid customer', async () => {
      const response = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          clientId,
          customerId: 'nonexistent-customer',
          title: 'Fix Wiring',
          description: 'Rewire',
          category: 'electrical',
          location: 'Lagos',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Customer does not belong');
    });

    it('should reject customer from different artisan', async () => {
      const customer = await prisma.customer.create({
        data: {
          artisanId: artisan2Id,
          name: 'Other Customer',
          phone: '08012345678',
          normalizedPhone: '2348012345678',
        },
      });

      const response = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          clientId,
          customerId: customer.id,
          title: 'Fix Wiring',
          description: 'Rewire',
          category: 'electrical',
          location: 'Lagos',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Customer does not belong');
    });
  });

  describe('Get Job', () => {
    beforeEach(async () => {
      const job = await prisma.job.create({
        data: {
          artisanId: artisan1Id,
          clientId,
          title: 'Fix Wiring',
          description: 'Rewire',
          category: 'electrical',
          location: 'Lagos',
          status: 'DRAFT',
          serverVersion: 1,
        },
      });
      jobId = job.id;
    });

    it('should get job by ID if owner', async () => {
      const response = await request(app)
        .get(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(jobId);
      expect(response.body.data.artisanId).toBe(artisan1Id);
    });

    it('should reject if different artisan', async () => {
      const response = await request(app)
        .get(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Job does not belong');
    });

    it('should return 404 for nonexistent job', async () => {
      const response = await request(app)
        .get('/api/v1/jobs/nonexistent')
        .set('Authorization', `Bearer ${token1}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('List Jobs', () => {
    beforeEach(async () => {
      await prisma.job.create({
        data: {
          artisanId: artisan1Id,
          clientId,
          title: 'Job 1',
          description: 'Desc',
          category: 'electrical',
          location: 'Lagos',
          status: 'DRAFT',
          serverVersion: 1,
        },
      });

      await prisma.job.create({
        data: {
          artisanId: artisan1Id,
          clientId,
          title: 'Job 2',
          description: 'Desc',
          category: 'plumbing',
          location: 'Abuja',
          status: 'COMPLETED',
          serverVersion: 1,
        },
      });

      await prisma.job.create({
        data: {
          artisanId: artisan2Id,
          clientId,
          title: 'Job 3',
          description: 'Desc',
          category: 'electrical',
          location: 'Lagos',
          status: 'DRAFT',
          serverVersion: 1,
        },
      });
    });

    it('should list only authenticated artisan jobs', async () => {
      const response = await request(app)
        .get('/api/v1/jobs')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((j: any) => j.artisanId === artisan1Id)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/jobs?status=COMPLETED')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('COMPLETED');
    });
  });

  describe('Update Job', () => {
    beforeEach(async () => {
      const job = await prisma.job.create({
        data: {
          artisanId: artisan1Id,
          clientId,
          title: 'Original Title',
          description: 'Original Desc',
          category: 'electrical',
          location: 'Lagos',
          status: 'DRAFT',
          serverVersion: 1,
        },
      });
      jobId = job.id;
    });

    it('should update job if owner', async () => {
      const response = await request(app)
        .patch(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          title: 'Updated Title',
          description: 'Updated Desc',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.description).toBe('Updated Desc');
      expect(response.body.data.serverVersion).toBe(2);
    });

    it('should reject update if not owner', async () => {
      const response = await request(app)
        .patch(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          title: 'Updated Title',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Job does not belong');
    });

    it('should allow updating customer to valid customer', async () => {
      const customer = await prisma.customer.create({
        data: {
          artisanId: artisan1Id,
          name: 'Test Customer',
          phone: '08012345678',
          normalizedPhone: '2348012345678',
        },
      });

      const response = await request(app)
        .patch(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          customerId: customer.id,
        })
        .expect(200);

      expect(response.body.data.customerId).toBe(customer.id);
    });

    it('should reject update to customer from different artisan', async () => {
      const customer = await prisma.customer.create({
        data: {
          artisanId: artisan2Id,
          name: 'Other Customer',
          phone: '08012345678',
          normalizedPhone: '2348012345678',
        },
      });

      const response = await request(app)
        .patch(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          customerId: customer.id,
        })
        .expect(403);

      expect(response.body.error).toContain('Customer does not belong');
    });
  });

  describe('Job Status Transitions', () => {
    beforeEach(async () => {
      const job = await prisma.job.create({
        data: {
          artisanId: artisan1Id,
          clientId,
          title: 'Test Job',
          description: 'Desc',
          category: 'electrical',
          location: 'Lagos',
          status: 'DRAFT',
          serverVersion: 1,
        },
      });
      jobId = job.id;
    });

    it('should complete job', async () => {
      const response = await request(app)
        .post(`/api/v1/jobs/${jobId}/complete`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.data.status).toBe('COMPLETED');
      expect(response.body.data.completedAt).toBeTruthy();
      expect(response.body.data.serverVersion).toBe(2);
    });

    it('should reopen completed job', async () => {
      await request(app)
        .post(`/api/v1/jobs/${jobId}/complete`)
        .set('Authorization', `Bearer ${token1}`);

      const response = await request(app)
        .post(`/api/v1/jobs/${jobId}/reopen`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.data.status).toBe('IN_PROGRESS');
      expect(response.body.data.completedAt).toBeNull();
    });
  });

  describe('Job Archiving', () => {
    beforeEach(async () => {
      const job = await prisma.job.create({
        data: {
          artisanId: artisan1Id,
          clientId,
          title: 'Test Job',
          description: 'Desc',
          category: 'electrical',
          location: 'Lagos',
          status: 'DRAFT',
          serverVersion: 1,
        },
      });
      jobId = job.id;
    });

    it('should archive job', async () => {
      const response = await request(app)
        .post(`/api/v1/jobs/${jobId}/archive`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.data.isArchived).toBe(true);
      expect(response.body.data.serverVersion).toBe(2);
    });

    it('should restore archived job', async () => {
      await request(app)
        .post(`/api/v1/jobs/${jobId}/archive`)
        .set('Authorization', `Bearer ${token1}`);

      const response = await request(app)
        .post(`/api/v1/jobs/${jobId}/restore`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.data.isArchived).toBe(false);
    });

    it('should reject archive/restore by non-owner', async () => {
      const response = await request(app)
        .post(`/api/v1/jobs/${jobId}/archive`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);

      expect(response.body.error).toContain('Job does not belong');
    });
  });
});
