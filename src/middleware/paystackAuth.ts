/**
 * Paystack Webhook Authentication Middleware
 *
 * Implements cryptographic verification of Paystack webhook signatures.
 * Every webhook from Paystack includes an x-paystack-signature header containing
 * an HMAC-SHA512 hash of the request body. This middleware verifies that the
 * hash matches our computation using the Paystack secret key.
 *
 * Security Features:
 * - Constant-time comparison to prevent timing attacks
 * - Raw body verification (not parsed JSON)
 * - Immediate rejection of invalid signatures (401)
 * - Logging of verification attempts
 * - Protection against replay attacks via idempotency check (downstream)
 *
 * Reference: https://paystack.com/docs/payments/webhooks/#securing-webhooks
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Extended Express Request with Paystack-specific properties
 */
export interface PaystackRequest extends Request {
  rawBody: string; // Raw request body (preserved for HMAC verification)
  payloadVerified: boolean; // Flag indicating verification status
  signature: string; // Original signature from header
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const SIGNATURE_HEADER = 'x-paystack-signature';
const HASH_ALGORITHM = 'sha512';

/**
 * Whitelist of allowed Paystack event types
 * Only these events will be processed
 */
const ALLOWED_EVENTS = [
  'charge.success',
  'charge.failed',
  'charge.dispute.resolved',
  'transfer.success',
  'transfer.failed',
  'transfer.reversed',
  'invoice.payment_requested',
  'invoice.create',
  'invoice.update',
  'invoice.payment_reminder',
];

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Verify Paystack webhook signature
 *
 * This middleware:
 * 1. Extracts the x-paystack-signature header
 * 2. Computes HMAC-SHA512 of the raw request body using secret key
 * 3. Performs constant-time comparison with provided signature
 * 4. Rejects immediately if invalid
 * 5. Attaches verified payload to request object
 *
 * Must be applied BEFORE body parsing middleware to access raw body.
 *
 * Usage:
 * app.post('/api/v1/webhooks/paystack', verifyPaystackSignature, webhookHandler);
 */
export function verifyPaystackSignature(
  req: PaystackRequest,
  res: Response,
  next: NextFunction,
): void {
  try {
    // 1. Validate secret key is configured
    if (!PAYSTACK_SECRET_KEY) {
      logger.error('[Paystack] PAYSTACK_SECRET_KEY not configured');
      res.status(500).json({
        success: false,
        error: 'Webhook verification not configured',
      });
      return;
    }

    // 2. Extract signature from header
    const signature = req.get(SIGNATURE_HEADER);

    if (!signature) {
      logger.warn(`[Paystack] Missing ${SIGNATURE_HEADER} header`, {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: 'Invalid request: missing signature header',
      });
      return;
    }

    // 3. Get raw body (must be preserved from Express middleware order)
    const rawBody = req.rawBody || '';

    if (!rawBody) {
      logger.warn('[Paystack] Missing or empty request body', {
        ip: req.ip,
        signature,
      });

      res.status(400).json({
        success: false,
        error: 'Invalid request: empty body',
      });
      return;
    }

    // 4. Compute HMAC-SHA512 of raw body with secret key
    const hash = crypto
      .createHmac(HASH_ALGORITHM, PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    // 5. Constant-time comparison (prevents timing attacks)
    // Using timingSafeEqual to prevent timing-based attacks
    const isValid = timingSafeEqual(hash, signature);

    if (!isValid) {
      logger.warn('[Paystack] Invalid webhook signature', {
        expected: signature,
        computed: hash.substring(0, 20) + '...', // Log partial hash for debugging
        ip: req.ip,
        bodyLength: rawBody.length,
      });

      // Return 401 Unauthorized for invalid signatures
      // Paystack will retry the webhook
      res.status(401).json({
        success: false,
        error: 'Invalid signature',
      });
      return;
    }

    // 6. Signature verified - attach to request and continue
    logger.debug('[Paystack] Webhook signature verified', {
      algorithm: HASH_ALGORITHM,
      bodyLength: rawBody.length,
    });

    req.payloadVerified = true;
    req.signature = signature;

    // Continue to next middleware
    next();
  } catch (error) {
    logger.error('[Paystack] Signature verification error:', error);

    // Return 500 so Paystack retries (not a permanent failure)
    res.status(500).json({
      success: false,
      error: 'Verification error',
    });
  }
}

/**
 * Timing-safe string comparison
 *
 * Prevents timing attacks by taking the same amount of time
 * regardless of where the strings differ. Node.js crypto module
 * provides this, but we implement it for clarity.
 *
 * @param a First string
 * @param b Second string
 * @returns true if strings are equal, false otherwise
 */
function timingSafeEqual(a: string, b: string): boolean {
  // Quick check for different lengths
  if (a.length !== b.length) {
    return false;
  }

  // Constant-time comparison
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Validate webhook event type
 *
 * Ensures only allowed event types are processed.
 * Paystack may send events we don't handle, so we explicitly
 * whitelist the events we care about.
 */
export function validatePaystackEvent(
  req: PaystackRequest,
  res: Response,
  next: NextFunction,
): void {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!body.event) {
      logger.warn('[Paystack] Missing event type in payload');

      res.status(400).json({
        success: false,
        error: 'Missing event type',
      });
      return;
    }

    // Check if event is whitelisted
    if (!ALLOWED_EVENTS.includes(body.event)) {
      logger.debug(`[Paystack] Ignoring unhandled event: ${body.event}`);

      // Return 200 OK even though we ignore it
      // (Paystack expects success for all events)
      res.status(200).json({
        success: true,
        message: `Event ${body.event} received but not processed`,
      });
      return;
    }

    // Attach verified payload to request
    req.body = body;

    logger.debug(`[Paystack] Processing event: ${body.event}`);

    next();
  } catch (error) {
    logger.error('[Paystack] Event validation error:', error);

    res.status(400).json({
      success: false,
      error: 'Invalid payload format',
    });
  }
}

// ============================================================================
// EXPORTS FOR TESTING/DEBUGGING
// ============================================================================

/**
 * Export HMAC computation for testing
 * NOT for production use
 */
export function computePaystackHmac(body: string): string {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY not configured');
  }

  return crypto
    .createHmac(HASH_ALGORITHM, PAYSTACK_SECRET_KEY)
    .update(body)
    .digest('hex');
}
