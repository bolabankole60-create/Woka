/**
 * Route Setup
 *
 * Registers all API routes with the Express app
 */

import { Application } from 'express';
import { handleSync } from '../controllers/syncController';
import { handlePaystackWebhook } from '../controllers/paymentWebhookController';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  archiveCustomer,
  restoreCustomer,
} from '../controllers/customerController';
import {
  listJobs,
  getJob,
  createJobEndpoint,
  updateJobEndpoint,
  completeJobEndpoint,
  reopenJobEndpoint,
  archiveJobEndpoint,
  restoreJobEndpoint,
} from '../controllers/jobController';
import { verifyPaystackSignature, validatePaystackEvent } from '../middleware/paystackAuth';
import { requireAuth } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Setup all API routes
 */
export function setupRoutes(app: Application): void {
  // ============================================================================
  // SYNC ROUTES (Offline-First)
  // ============================================================================

  /**
   * POST /api/v1/sync
   * Handles bi-directional sync for offline-first mobile app
   * Requires authentication via Bearer token in Authorization header
   *
   * Request:
   * {
   *   "lastSyncedAt": 1690401234567,
   *   "pushChanges": { "jobs": [...], "invoices": [...] }
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "pullChanges": { "jobs": [...], "invoices": [...] },
   *   "serverTimestamp": 1690401245000,
   *   "results": [...]
   * }
   */
  app.post('/api/v1/sync', requireAuth, asyncHandler(handleSync));

  // ============================================================================
  // PAYSTACK WEBHOOK ROUTES
  // ============================================================================

  /**
   * POST /api/v1/webhooks/paystack
   *
   * Receives webhooks from Paystack for payment events.
   *
   * Middleware chain:
   * 1. verifyPaystackSignature - HMAC-SHA512 verification
   * 2. validatePaystackEvent - Check event type is allowed
   * 3. handlePaystackWebhook - Process the event
   *
   * Supported events:
   * - charge.success: Customer paid via Paystack
   * - charge.failed: Payment failed
   * - transfer.success: Artisan payout successful
   * - transfer.failed/reversed: Payout failed or disputed
   *
   * Returns: 200 OK for all events (even if not processed)
   */
  app.post(
    '/api/v1/webhooks/paystack',
    verifyPaystackSignature,
    validatePaystackEvent,
    handlePaystackWebhook,
  );

  // ============================================================================
  // CUSTOMERS ROUTES (Phase 2A)
  // ============================================================================

  app.get('/api/v1/customers', listCustomers);
  app.get('/api/v1/customers/:id', getCustomer);
  app.post('/api/v1/customers', createCustomer);
  app.patch('/api/v1/customers/:id', updateCustomer);
  app.post('/api/v1/customers/:id/archive', archiveCustomer);
  app.post('/api/v1/customers/:id/restore', restoreCustomer);

  // ============================================================================
  // JOBS ROUTES (Phase 2B)
  // ============================================================================

  app.get('/api/v1/jobs', requireAuth, asyncHandler(listJobs as any));
  app.get('/api/v1/jobs/:id', requireAuth, asyncHandler(getJob as any));
  app.post('/api/v1/jobs', requireAuth, asyncHandler(createJobEndpoint as any));
  app.patch('/api/v1/jobs/:id', requireAuth, asyncHandler(updateJobEndpoint as any));
  app.post('/api/v1/jobs/:id/complete', requireAuth, asyncHandler(completeJobEndpoint as any));
  app.post('/api/v1/jobs/:id/reopen', requireAuth, asyncHandler(reopenJobEndpoint as any));
  app.post('/api/v1/jobs/:id/archive', requireAuth, asyncHandler(archiveJobEndpoint as any));
  app.post('/api/v1/jobs/:id/restore', requireAuth, asyncHandler(restoreJobEndpoint as any));

  // ============================================================================
  // INVOICES ROUTES
  // ============================================================================

  // GET /api/v1/invoices - List invoices
  // GET /api/v1/invoices/:id - Get single invoice
  // POST /api/v1/invoices - Create invoice
  // PATCH /api/v1/invoices/:id - Update invoice
  // DELETE /api/v1/invoices/:id - Delete invoice
  // GET /api/v1/invoices/:id/whatsapp - Get WhatsApp formatted text

  // ============================================================================
  // PAYMENTS ROUTES
  // ============================================================================

  // POST /api/v1/payments - Record payment
  // GET /api/v1/payments - List payments (with filtering)
  // POST /api/v1/payments/webhook - Paystack webhook handler

  // ============================================================================
  // EXPENSES ROUTES
  // ============================================================================

  // GET /api/v1/expenses - List expenses
  // POST /api/v1/expenses - Log expense
  // GET /api/v1/expenses/summary - Get expense summary

  // ============================================================================
  // AUTHENTICATION ROUTES
  // ============================================================================

  // POST /api/v1/auth/login - Login
  // POST /api/v1/auth/signup - Signup
  // POST /api/v1/auth/refresh - Refresh token
  // POST /api/v1/auth/logout - Logout
}
