/**
 * Route Setup
 *
 * Registers all API routes with the Express app
 */

import { Application } from 'express';
import { handleSync } from '../controllers/syncController';
import { handlePaystackWebhook } from '../controllers/paymentWebhookController';
import { verifyPaystackSignature, validatePaystackEvent } from '../middleware/paystackAuth';
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
  app.post('/api/v1/sync', asyncHandler(handleSync));

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
  // JOBS ROUTES
  // ============================================================================

  // GET /api/v1/jobs - List jobs (with filtering)
  // GET /api/v1/jobs/:id - Get single job
  // POST /api/v1/jobs - Create job
  // PATCH /api/v1/jobs/:id - Update job
  // DELETE /api/v1/jobs/:id - Delete job

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
