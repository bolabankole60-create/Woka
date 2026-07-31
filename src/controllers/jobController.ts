/**
 * Job Controller
 *
 * Handles job CRUD operations with authenticated context.
 * Enforces artisan ownership and optional customer validation.
 */

import { Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

/**
 * GET /api/v1/jobs
 * List jobs for authenticated artisan with optional filters
 */
export async function listJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const statusParam = req.query.status;
    const customerIdParam = req.query.customerId;

    const where: any = {
      artisanId: req.artisanId,
      deleted: false,
    };

    if (statusParam && typeof statusParam === 'string') {
      where.status = statusParam;
    }

    if (customerIdParam && typeof customerIdParam === 'string') {
      where.customerId = customerIdParam;
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        customer: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    logger.error('[Jobs] Error listing jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list jobs',
    });
  }
}

/**
 * GET /api/v1/jobs/:id
 * Get single job by ID
 */
export async function getJob(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : '';

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Invalid job ID',
      });
      return;
    }

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice: true,
        payments: true,
      },
    });

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    // Verify ownership
    if (job.artisanId !== req.artisanId) {
      res.status(403).json({
        success: false,
        error: 'Job does not belong to authenticated artisan',
      });
      return;
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error('[Jobs] Error getting job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job',
    });
  }
}

/**
 * POST /api/v1/jobs
 * Create new job
 */
export async function createJobEndpoint(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { clientId, customerId, title, description, category, location, priority, estimatedCost } = req.body;

    // Validate required fields
    if (!clientId || !title || !description || !category || !location) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: clientId, title, description, category, location',
      });
      return;
    }

    // Verify customer belongs to artisan if provided
    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer || customer.artisanId !== req.artisanId) {
        res.status(403).json({
          success: false,
          error: 'Customer does not belong to authenticated artisan',
        });
        return;
      }
    }

    const job = await prisma.job.create({
      data: {
        artisanId: req.artisanId,
        clientId,
        customerId: customerId || null,
        title,
        description,
        category,
        location,
        priority: priority || null,
        estimatedCost: estimatedCost || 0,
        status: 'DRAFT',
        serverVersion: 1,
      },
      include: {
        customer: true,
      },
    });

    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    logger.error('[Jobs] Error creating job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create job',
    });
  }
}

/**
 * PATCH /api/v1/jobs/:id
 * Update job
 */
export async function updateJobEndpoint(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const idParam = req.params.id;
    const { title, description, priority, estimatedCost, customerId, notes } = req.body;
    const id = typeof idParam === 'string' ? idParam : '';

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Invalid job ID',
      });
      return;
    }

    const existing = await prisma.job.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    // Verify ownership
    if (existing.artisanId !== req.artisanId) {
      res.status(403).json({
        success: false,
        error: 'Job does not belong to authenticated artisan',
      });
      return;
    }

    // Verify customer if changing
    if (customerId && customerId !== existing.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer || customer.artisanId !== req.artisanId) {
        res.status(403).json({
          success: false,
          error: 'Customer does not belong to authenticated artisan',
        });
        return;
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
      serverVersion: existing.serverVersion + 1,
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (estimatedCost !== undefined) updateData.estimatedCost = estimatedCost;
    if (customerId !== undefined) updateData.customerId = customerId || null;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.job.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('[Jobs] Error updating job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job',
    });
  }
}

/**
 * POST /api/v1/jobs/:id/complete
 * Mark job as completed
 */
export async function completeJobEndpoint(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : '';

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Invalid job ID',
      });
      return;
    }

    const job = await prisma.job.findUnique({ where: { id } });

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    if (job.artisanId !== req.artisanId) {
      res.status(403).json({
        success: false,
        error: 'Job does not belong to authenticated artisan',
      });
      return;
    }

    const updated = await prisma.job.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        serverVersion: job.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('[Jobs] Error completing job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete job',
    });
  }
}

/**
 * POST /api/v1/jobs/:id/reopen
 * Reopen a completed job
 */
export async function reopenJobEndpoint(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : '';

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Invalid job ID',
      });
      return;
    }

    const job = await prisma.job.findUnique({ where: { id } });

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    if (job.artisanId !== req.artisanId) {
      res.status(403).json({
        success: false,
        error: 'Job does not belong to authenticated artisan',
      });
      return;
    }

    const updated = await prisma.job.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        completedAt: null,
        serverVersion: job.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('[Jobs] Error reopening job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reopen job',
    });
  }
}

/**
 * POST /api/v1/jobs/:id/archive
 * Archive a job
 */
export async function archiveJobEndpoint(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : '';

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Invalid job ID',
      });
      return;
    }

    const job = await prisma.job.findUnique({ where: { id } });

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    if (job.artisanId !== req.artisanId) {
      res.status(403).json({
        success: false,
        error: 'Job does not belong to authenticated artisan',
      });
      return;
    }

    const archiveData: any = {
      archivedAt: new Date(),
      serverVersion: job.serverVersion + 1,
      updatedAt: new Date(),
    };

    const updated = await prisma.job.update({
      where: { id },
      data: archiveData,
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('[Jobs] Error archiving job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive job',
    });
  }
}

/**
 * POST /api/v1/jobs/:id/restore
 * Restore an archived job
 */
export async function restoreJobEndpoint(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const idParam = req.params.id;
    const id = typeof idParam === 'string' ? idParam : '';

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Invalid job ID',
      });
      return;
    }

    const job = await prisma.job.findUnique({ where: { id } });

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    if (job.artisanId !== req.artisanId) {
      res.status(403).json({
        success: false,
        error: 'Job does not belong to authenticated artisan',
      });
      return;
    }

    const restoreData: any = {
      archivedAt: null,
      serverVersion: job.serverVersion + 1,
      updatedAt: new Date(),
    };

    const updated = await prisma.job.update({
      where: { id },
      data: restoreData,
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('[Jobs] Error restoring job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore job',
    });
  }
}
