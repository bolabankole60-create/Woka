/**
 * Customer Management Controller
 *
 * Handles CRUD operations for customers (Phase 2A).
 * Implements:
 * - Ownership isolation (artisanId from auth, not request)
 * - Nigerian phone normalization
 * - Archive functionality (soft delete)
 * - Search and filtering
 * - Sync metadata tracking
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { normalizeNigerianPhone } from '../utils/phoneFormatter';

/**
 * Authenticated Request interface with userId
 */
interface AuthRequest extends Request {
  userId?: string;
}

// ============================================================================
// CONTROLLERS
// ============================================================================

/**
 * GET /api/v1/customers
 * List all customers for authenticated artisan
 */
export const listCustomers = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const search = Array.isArray(req.query.search) ? req.query.search[0] : (req.query.search as string | undefined);
  const isArchived = Array.isArray(req.query.isArchived) ? req.query.isArchived[0] : (req.query.isArchived as string | undefined);
  const artisanId = req.userId;

  try {
    // Build query filters
    const where: any = { artisanId };

    if (isArchived === 'true') {
      where.isArchived = true;
    } else if (isArchived === 'false') {
      where.isArchived = false;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { normalizedPhone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: customers,
      count: customers.length,
    });
  } catch (error) {
    logger.error('Error listing customers:', error);
    throw error;
  }
});

/**
 * GET /api/v1/customers/:id
 * Get single customer by ID
 */
export const getCustomer = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const artisanId = req.userId;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    // Verify ownership
    if (customer.artisanId !== artisanId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    logger.error(`Error getting customer ${id}:`, error);
    throw error;
  }
});

/**
 * POST /api/v1/customers
 * Create new customer
 */
export const createCustomer = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const { name, phone, email, address, notes } = req.body;
  const artisanId = req.userId; // Force artisanId from auth

  // Validate required fields
  if (!name || !phone) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: name, phone',
    });
    return;
  }

  try {
    // Normalize phone number
    const normalizedPhone = normalizeNigerianPhone(phone);

    // Check for duplicate phone within artisan's customers
    const existing = await prisma.customer.findUnique({
      where: {
        artisanId_normalizedPhone: {
          artisanId,
          normalizedPhone,
        },
      } as any,
    });

    if (existing) {
      res.status(409).json({
        success: false,
        error: 'Customer with this phone number already exists',
      });
      return;
    }

    const customer = await prisma.customer.create({
      data: {
        artisanId,
        name,
        phone,
        normalizedPhone,
        email: email || undefined,
        address: address || undefined,
        notes: notes || undefined,
        isArchived: false,
        serverVersion: 1,
      },
    });

    logger.info(`Customer created: ${customer.id}`, { artisanId, name });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    logger.error('Error creating customer:', error);
    throw error;
  }
});

/**
 * PATCH /api/v1/customers/:id
 * Update customer
 */
export const updateCustomer = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { name, phone, email, address, notes } = req.body;
  const artisanId = req.userId;

  try {
    // Verify ownership
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    if (customer.artisanId !== artisanId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email || null;
    if (address !== undefined) updateData.address = address || null;
    if (notes !== undefined) updateData.notes = notes || null;

    // Handle phone change with normalization
    if (phone !== undefined) {
      const normalizedPhone = normalizeNigerianPhone(phone);

      // Check for duplicate if phone is changing
      if (phone !== customer.phone) {
        const existing = await prisma.customer.findUnique({
          where: {
            artisanId_normalizedPhone: {
              artisanId,
              normalizedPhone,
            } as any,
          },
        });

        if (existing && existing.id !== id) {
          res.status(409).json({
            success: false,
            error: 'Another customer has this phone number',
          });
          return;
        }
      }

      updateData.phone = phone;
      updateData.normalizedPhone = normalizedPhone;
    }

    updateData.serverVersion = customer.serverVersion + 1;
    updateData.updatedAt = new Date();

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Customer updated: ${id}`, { artisanId });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error(`Error updating customer ${id}:`, error);
    throw error;
  }
});

/**
 * PATCH /api/v1/customers/:id/archive
 * Archive customer (soft delete)
 */
export const archiveCustomer = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const artisanId = req.userId;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    if (customer.artisanId !== artisanId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const archived = await prisma.customer.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        serverVersion: customer.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    logger.info(`Customer archived: ${id}`, { artisanId });

    res.json({ success: true, data: archived });
  } catch (error) {
    logger.error(`Error archiving customer ${id}:`, error);
    throw error;
  }
});

/**
 * PATCH /api/v1/customers/:id/restore
 * Restore archived customer
 */
export const restoreCustomer = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const artisanId = req.userId;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    if (customer.artisanId !== artisanId) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    const restored = await prisma.customer.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
        serverVersion: customer.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    logger.info(`Customer restored: ${id}`, { artisanId });

    res.json({ success: true, data: restored });
  } catch (error) {
    logger.error(`Error restoring customer ${id}:`, error);
    throw error;
  }
});
