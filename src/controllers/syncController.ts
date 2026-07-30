/**
 * Sync Controller
 *
 * Handles offline-first sync with conflict resolution using PostgreSQL transactions.
 * Implements delta sync for efficient data exchange between mobile and server.
 *
 * Features:
 * - Atomic transactions for data consistency
 * - Server-Wins conflict resolution strategy
 * - Delta sync (only returns records changed since lastSyncedAt)
 * - Automatic server version increment
 * - Audit logging for sync operations
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

interface SyncOperation {
  id: string;
  collection: string;
  operation: 'create' | 'update' | 'delete';
  clientVersion: number;
  data: Record<string, any>;
}

interface SyncRequest {
  lastSyncedAt: number; // Unix timestamp in milliseconds
  pushChanges: Record<string, SyncOperation[]>; // { 'jobs': [...], 'invoices': [...] }
}

interface SyncResult {
  operationId: string;
  collection: string;
  operation: 'create' | 'update' | 'delete';
  success: boolean;
  conflict?: boolean;
  serverVersion?: number;
  serverData?: Record<string, any>;
  error?: string;
}

interface PullChanges {
  [collection: string]: Array<Record<string, any>>;
}

// ============================================================================
// SYNC ENDPOINT
// ============================================================================

/**
 * POST /api/v1/sync
 *
 * Bi-directional sync endpoint for offline-first mobile app.
 *
 * Request:
 * {
 *   "lastSyncedAt": 1690401234567,
 *   "pushChanges": {
 *     "jobs": [
 *       { "id": "job_1", "operation": "update", "clientVersion": 1, "data": {...} }
 *     ]
 *   }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "pullChanges": { "jobs": [...], "invoices": [...] },
 *   "serverTimestamp": 1690401245000,
 *   "results": [{ "operationId": "job_1", "success": true, "serverVersion": 2 }]
 * }
 */
export async function handleSync(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const { lastSyncedAt, pushChanges } = req.body as SyncRequest;

  try {
    // Validate request
    if (!lastSyncedAt || typeof lastSyncedAt !== 'number') {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid lastSyncedAt timestamp',
      });
      return;
    }

    const lastSyncDate = new Date(lastSyncedAt);
    logger.info(`[Sync] Starting sync. Last synced: ${lastSyncDate.toISOString()}`);

    // Process changes in a transaction
    const results = await processPushChangesInTransaction(pushChanges);

    // Query for pull changes (records updated since lastSyncedAt)
    const pullChanges = await getPullChanges(lastSyncDate);

    // Log sync operation
    await logSyncOperation({
      operation: 'push_pull',
      success: true,
      resultsCount: results.length,
      hasConflicts: results.some((r) => r.conflict),
    });

    const duration = Date.now() - startTime;

    logger.info(
      `[Sync] Sync complete. Processed ${results.length} operations in ${duration}ms`
    );

    // Send response
    res.json({
      success: true,
      pullChanges,
      serverTimestamp: Date.now(),
      results,
      duration,
    });
  } catch (error) {
    logger.error('[Sync] Error during sync:', error);

    await logSyncOperation({
      operation: 'push_pull',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: 'Sync failed. Please try again.',
    });
  }
}

// ============================================================================
// TRANSACTION HANDLING
// ============================================================================

/**
 * Process all pushed changes in a single PostgreSQL transaction
 *
 * Transaction ensures:
 * - All-or-nothing semantics
 * - Conflict detection and resolution
 * - Automatic server version increment
 * - Data consistency
 */
async function processPushChangesInTransaction(
  pushChanges: Record<string, SyncOperation[]> | undefined
): Promise<SyncResult[]> {
  if (!pushChanges) {
    return [];
  }

  const results: SyncResult[] = [];

  // Start transaction
  await prisma.$transaction(async (tx: any) => {
    for (const [collection, operations] of Object.entries(pushChanges)) {
      logger.debug(`[Sync] Processing ${operations.length} operations for ${collection}`);

      for (const op of operations) {
        const result = await processOperation(tx, collection, op);
        results.push(result);
      }
    }
  });

  return results;
}

/**
 * Process a single operation within a transaction
 *
 * Checks for conflicts:
 * - If client version < server version, conflict detected
 * - Returns server's current state
 * - Client can retry or accept server version
 */
async function processOperation(
  tx: any, // Transaction client
  collection: string,
  op: SyncOperation
): Promise<SyncResult> {
  const { id, operation, clientVersion, data } = op;

  const baseResult: SyncResult = {
    operationId: id,
    collection,
    operation,
    success: true,
  };

  try {
    switch (collection) {
      case 'users':
        return await handleUserOperation(tx, operation, id, clientVersion, data, baseResult);

      case 'jobs':
        return await handleJobOperation(tx, operation, id, clientVersion, data, baseResult);

      case 'invoices':
        return await handleInvoiceOperation(tx, operation, id, clientVersion, data, baseResult);

      case 'payments':
        return await handlePaymentOperation(tx, operation, id, clientVersion, data, baseResult);

      case 'expenseLogs':
        return await handleExpenseOperation(tx, operation, id, clientVersion, data, baseResult);

      case 'customers':
        return await handleCustomerOperation(tx, operation, id, clientVersion, data, baseResult);

      default:
        return {
          ...baseResult,
          success: false,
          error: `Unknown collection: ${collection}`,
        };
    }
  } catch (error) {
    logger.error(`[Sync] Error processing ${collection}/${id}:`, error);
    return {
      ...baseResult,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// OPERATION HANDLERS
// ============================================================================

/**
 * Handle user operations (create, update, delete)
 */
async function handleUserOperation(
  tx: any,
  operation: string,
  id: string,
  clientVersion: number,
  data: Record<string, any>,
  baseResult: SyncResult
): Promise<SyncResult> {
  if (operation === 'create') {
    await tx.user.create({
      data: {
        id,
        ...data,
        serverVersion: 1,
      },
    });
    return { ...baseResult, serverVersion: 1 };
  }

  if (operation === 'update') {
    // Check for conflict
    const existing = await tx.user.findUnique({ where: { id } });

    if (!existing) {
      return {
        ...baseResult,
        success: false,
        error: 'User not found',
      };
    }

    if (clientVersion < existing.serverVersion) {
      // Conflict: server version is newer
      return {
        ...baseResult,
        conflict: true,
        serverVersion: existing.serverVersion,
        serverData: existing,
      };
    }

    // No conflict, update the record
    const updated = await tx.user.update({
      where: { id },
      data: {
        ...data,
        serverVersion: existing.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    return {
      ...baseResult,
      serverVersion: updated.serverVersion,
    };
  }

  if (operation === 'delete') {
    const existing = await tx.user.findUnique({ where: { id } });

    if (!existing) {
      return {
        ...baseResult,
        success: false,
        error: 'User not found',
      };
    }

    // Soft delete
    await tx.user.update({
      where: { id },
      data: {
        deleted: true,
        serverVersion: existing.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    return {
      ...baseResult,
      serverVersion: existing.serverVersion + 1,
    };
  }

  return { ...baseResult, success: false, error: 'Invalid operation' };
}

/**
 * Handle job operations
 */
async function handleJobOperation(
  tx: any,
  operation: string,
  id: string,
  clientVersion: number,
  data: Record<string, any>,
  baseResult: SyncResult
): Promise<SyncResult> {
  if (operation === 'create') {
    await tx.job.create({
      data: {
        id,
        ...data,
        serverVersion: 1,
      },
    });
    return { ...baseResult, serverVersion: 1 };
  }

  if (operation === 'update') {
    const existing = await tx.job.findUnique({ where: { id } });

    if (!existing) {
      return { ...baseResult, success: false, error: 'Job not found' };
    }

    if (clientVersion < existing.serverVersion) {
      return {
        ...baseResult,
        conflict: true,
        serverVersion: existing.serverVersion,
        serverData: existing,
      };
    }

    const updated = await tx.job.update({
      where: { id },
      data: {
        ...data,
        serverVersion: existing.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    return { ...baseResult, serverVersion: updated.serverVersion };
  }

  if (operation === 'delete') {
    const existing = await tx.job.findUnique({ where: { id } });

    if (!existing) {
      return { ...baseResult, success: false, error: 'Job not found' };
    }

    await tx.job.update({
      where: { id },
      data: {
        deleted: true,
        serverVersion: existing.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    return { ...baseResult, serverVersion: existing.serverVersion + 1 };
  }

  return { ...baseResult, success: false, error: 'Invalid operation' };
}

/**
 * Handle invoice operations
 */
async function handleInvoiceOperation(
  tx: any,
  operation: string,
  id: string,
  clientVersion: number,
  data: Record<string, any>,
  baseResult: SyncResult
): Promise<SyncResult> {
  if (operation === 'create') {
    await tx.invoice.create({
      data: {
        id,
        ...data,
        serverVersion: 1,
      },
    });
    return { ...baseResult, serverVersion: 1 };
  }

  if (operation === 'update') {
    const existing = await tx.invoice.findUnique({ where: { id } });

    if (!existing) {
      return { ...baseResult, success: false, error: 'Invoice not found' };
    }

    if (clientVersion < existing.serverVersion) {
      return {
        ...baseResult,
        conflict: true,
        serverVersion: existing.serverVersion,
        serverData: existing,
      };
    }

    const updated = await tx.invoice.update({
      where: { id },
      data: {
        ...data,
        serverVersion: existing.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    return { ...baseResult, serverVersion: updated.serverVersion };
  }

  if (operation === 'delete') {
    const existing = await tx.invoice.findUnique({ where: { id } });

    if (!existing) {
      return { ...baseResult, success: false, error: 'Invoice not found' };
    }

    await tx.invoice.update({
      where: { id },
      data: {
        deleted: true,
        serverVersion: existing.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    return { ...baseResult, serverVersion: existing.serverVersion + 1 };
  }

  return { ...baseResult, success: false, error: 'Invalid operation' };
}

/**
 * Handle payment operations
 */
async function handlePaymentOperation(
  tx: any,
  operation: string,
  id: string,
  clientVersion: number,
  data: Record<string, any>,
  baseResult: SyncResult
): Promise<SyncResult> {
  if (operation === 'create') {
    await tx.payment.create({
      data: { id, ...data, serverVersion: 1 },
    });
    return { ...baseResult, serverVersion: 1 };
  }

  if (operation === 'update') {
    const existing = await tx.payment.findUnique({ where: { id } });

    if (!existing) {
      return { ...baseResult, success: false, error: 'Payment not found' };
    }

    if (clientVersion < existing.serverVersion) {
      return {
        ...baseResult,
        conflict: true,
        serverVersion: existing.serverVersion,
        serverData: existing,
      };
    }

    const updated = await tx.payment.update({
      where: { id },
      data: {
        ...data,
        serverVersion: existing.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    return { ...baseResult, serverVersion: updated.serverVersion };
  }

  if (operation === 'delete') {
    const existing = await tx.payment.findUnique({ where: { id } });

    if (!existing) {
      return { ...baseResult, success: false, error: 'Payment not found' };
    }

    await tx.payment.update({
      where: { id },
      data: {
        deleted: true,
        serverVersion: existing.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    return { ...baseResult, serverVersion: existing.serverVersion + 1 };
  }

  return { ...baseResult, success: false, error: 'Invalid operation' };
}

/**
 * Handle expense operations
 */
async function handleExpenseOperation(
  tx: any,
  operation: string,
  id: string,
  clientVersion: number,
  data: Record<string, any>,
  baseResult: SyncResult
): Promise<SyncResult> {
  if (operation === 'create') {
    await tx.expenseLog.create({
      data: { id, ...data, serverVersion: 1 },
    });
    return { ...baseResult, serverVersion: 1 };
  }

  if (operation === 'update') {
    const existing = await tx.expenseLog.findUnique({ where: { id } });

    if (!existing) {
      return { ...baseResult, success: false, error: 'Expense not found' };
    }

    if (clientVersion < existing.serverVersion) {
      return {
        ...baseResult,
        conflict: true,
        serverVersion: existing.serverVersion,
        serverData: existing,
      };
    }

    const updated = await tx.expenseLog.update({
      where: { id },
      data: {
        ...data,
        serverVersion: existing.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    return { ...baseResult, serverVersion: updated.serverVersion };
  }

  if (operation === 'delete') {
    const existing = await tx.expenseLog.findUnique({ where: { id } });

    if (!existing) {
      return { ...baseResult, success: false, error: 'Expense not found' };
    }

    await tx.expenseLog.update({
      where: { id },
      data: {
        deleted: true,
        serverVersion: existing.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    return { ...baseResult, serverVersion: existing.serverVersion + 1 };
  }

  return { ...baseResult, success: false, error: 'Invalid operation' };
}

/**
 * Handle customer operations (Phase 2A)
 * Supports: create, update, archive, restore
 * Enforces: ownership (artisanId), version conflicts, phone uniqueness
 * Idempotency: Stable operation IDs prevent duplicate execution
 */
async function handleCustomerOperation(
  tx: any,
  operation: string,
  id: string,
  clientVersion: number,
  data: Record<string, any>,
  baseResult: SyncResult
): Promise<SyncResult> {
  // Get authenticated user (artisan) ID from request context
  const artisanId = (baseResult as any).artisanId;
  if (!artisanId) {
    return { ...baseResult, success: false, error: 'Not authenticated' };
  }

  // Require stable operation ID from mobile client (no fallback)
  const operationId = (baseResult as any).operationId;
  if (!operationId || typeof operationId !== 'string' || operationId.length === 0) {
    return {
      ...baseResult,
      success: false,
      error: 'Missing or invalid operationId',
    };
  }

  // Idempotency check: Has this exact operation already been processed?
  const processed = await tx.processedOperation.findUnique({
    where: {
      operationId_artisanId: {
        operationId,
        artisanId,
      },
    },
  });

  if (processed) {
    logger.debug(
      `[Sync] Duplicate operation ${operationId} for artisan ${artisanId} - returning cached result v${processed.serverVersion}`
    );
    return {
      ...baseResult,
      serverVersion: processed.serverVersion,
      success: true,
      serverData: processed.result,
    };
  }

  if (operation === 'create') {
    try {
      // Check for duplicate normalized phone within artisan's customers
      if (data.normalized_phone) {
        const duplicate = await tx.customer.findUnique({
          where: {
            artisanId_normalizedPhone: {
              artisanId,
              normalizedPhone: data.normalized_phone,
            },
          },
        } as any);

        if (duplicate) {
          return {
            ...baseResult,
            success: false,
            error: 'A customer with this phone number already exists',
          };
        }
      }

      await tx.customer.create({
        data: {
          id,
          artisanId,
          ...data,
          serverVersion: 1,
        },
      });

      // Save processed operation for idempotency
      await tx.processedOperation.upsert({
        where: { operationId_artisanId: { operationId, artisanId } },
        update: { serverVersion: 1 },
        create: {
          operationId,
          artisanId,
          entityType: 'customers',
          entityId: id,
          operation: 'create',
          serverVersion: 1,
        },
      });

      return { ...baseResult, serverVersion: 1 };
    } catch (error) {
      return {
        ...baseResult,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create customer',
      };
    }
  }

  if (operation === 'update') {
    const existing = await tx.customer.findUnique({ where: { id } });

    if (!existing) {
      return { ...baseResult, success: false, error: 'Customer not found' };
    }

    // Verify ownership
    if (existing.artisanId !== artisanId) {
      return { ...baseResult, success: false, error: 'Access denied' };
    }

    // Server-wins conflict resolution
    if (clientVersion < existing.serverVersion) {
      return {
        ...baseResult,
        conflict: true,
        serverVersion: existing.serverVersion,
        serverData: existing,
      };
    }

    // Check for duplicate phone if updating
    if (data.normalized_phone && data.normalized_phone !== existing.normalizedPhone) {
      const duplicate = await tx.customer.findUnique({
        where: {
          artisanId_normalizedPhone: {
            artisanId,
            normalizedPhone: data.normalized_phone,
          },
        },
      } as any);

      if (duplicate) {
        return {
          ...baseResult,
          success: false,
          error: 'A customer with this phone number already exists',
        };
      }
    }

    const updated = await tx.customer.update({
      where: { id },
      data: {
        ...data,
        serverVersion: existing.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    // Save processed operation for idempotency
    await tx.processedOperation.upsert({
      where: { operationId_artisanId: { operationId, artisanId } },
      update: { serverVersion: updated.serverVersion, result: updated },
      create: {
        operationId,
        artisanId,
        entityType: 'customers',
        entityId: id,
        operation: 'update',
        serverVersion: updated.serverVersion,
        result: updated,
      },
    });

    return { ...baseResult, serverVersion: updated.serverVersion, serverData: updated };
  }

  if (operation === 'archive') {
    const existing = await tx.customer.findUnique({ where: { id } });

    if (!existing) {
      return { ...baseResult, success: false, error: 'Customer not found' };
    }

    if (existing.artisanId !== artisanId) {
      return { ...baseResult, success: false, error: 'Access denied' };
    }

    const updated = await tx.customer.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        serverVersion: existing.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    await tx.processedOperation.upsert({
      where: { operationId_artisanId: { operationId, artisanId } },
      update: { serverVersion: updated.serverVersion, result: updated },
      create: {
        operationId,
        artisanId,
        entityType: 'customers',
        entityId: id,
        operation: 'archive',
        serverVersion: updated.serverVersion,
        result: updated,
      },
    });

    return { ...baseResult, serverVersion: updated.serverVersion, serverData: updated };
  }

  if (operation === 'restore') {
    const existing = await tx.customer.findUnique({ where: { id } });

    if (!existing) {
      return { ...baseResult, success: false, error: 'Customer not found' };
    }

    if (existing.artisanId !== artisanId) {
      return { ...baseResult, success: false, error: 'Access denied' };
    }

    const updated = await tx.customer.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
        serverVersion: existing.serverVersion + 1,
        updatedAt: new Date(),
      },
    });

    await tx.processedOperation.upsert({
      where: { operationId_artisanId: { operationId, artisanId } },
      update: { serverVersion: updated.serverVersion, result: updated },
      create: {
        operationId,
        artisanId,
        entityType: 'customers',
        entityId: id,
        operation: 'restore',
        serverVersion: updated.serverVersion,
        result: updated,
      },
    });

    return { ...baseResult, serverVersion: updated.serverVersion, serverData: updated };
  }

  return { ...baseResult, success: false, error: 'Invalid operation' };
}

// ============================================================================
// DELTA SYNC
// ============================================================================

/**
 * Query database for all records changed since lastSyncedAt
 *
 * Returns only modified records to minimize bandwidth.
 */
async function getPullChanges(lastSyncDate: Date): Promise<PullChanges> {
  const pullChanges: PullChanges = {};

  try {
    // Fetch updated records from each table
    // Only return non-deleted records
    const [users, jobs, invoices, payments, expenses, customers] = await Promise.all([
      prisma.user.findMany({
        where: {
          AND: [{ updatedAt: { gt: lastSyncDate } }, { deleted: false }],
        },
      }),
      prisma.job.findMany({
        where: {
          AND: [{ updatedAt: { gt: lastSyncDate } }, { deleted: false }],
        },
      }),
      prisma.invoice.findMany({
        where: {
          AND: [{ updatedAt: { gt: lastSyncDate } }, { deleted: false }],
        },
        include: { items: true },
      }),
      prisma.payment.findMany({
        where: {
          AND: [{ updatedAt: { gt: lastSyncDate } }, { deleted: false }],
        },
      }),
      prisma.expenseLog.findMany({
        where: {
          AND: [{ updatedAt: { gt: lastSyncDate } }, { deleted: false }],
        },
      }),
      prisma.customer.findMany({
        where: {
          AND: [{ updatedAt: { gt: lastSyncDate } }, { deleted: false }],
        },
      }),
    ]);

    if (users.length > 0) pullChanges.users = users;
    if (jobs.length > 0) pullChanges.jobs = jobs;
    if (invoices.length > 0) pullChanges.invoices = invoices;
    if (payments.length > 0) pullChanges.payments = payments;
    if (expenses.length > 0) pullChanges.expenseLogs = expenses;
    if (customers.length > 0) pullChanges.customers = customers;

    logger.debug(
      `[Sync] Pull changes: ${JSON.stringify(Object.keys(pullChanges).map((k) => `${k}(${pullChanges[k].length})`))}`,
    );
  } catch (error) {
    logger.error('[Sync] Error fetching pull changes:', error);
    throw error;
  }

  return pullChanges;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log sync operation for auditing and debugging
 */
async function logSyncOperation(info: {
  operation: string;
  success: boolean;
  resultsCount?: number;
  hasConflicts?: boolean;
  error?: string;
}): Promise<void> {
  try {
    await prisma.syncLog.create({
      data: {
        operation: info.operation,
        success: info.success,
        error: info.error,
        hadConflict: info.hasConflicts || false,
      },
    });
  } catch (error) {
    logger.warn('[Sync] Failed to log sync operation:', error);
  }
}
