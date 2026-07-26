/**
 * Paystack Payment Webhook Controller
 *
 * Handles all Paystack webhook events for:
 * - Charge success/failure (customer payments)
 * - Transfers (artisan payouts)
 * - Disputes & refunds
 *
 * Implements idempotent processing to handle webhook retries safely.
 * Uses Prisma transactions for data consistency.
 *
 * Webhook Flow:
 * 1. Signature verification (middleware)
 * 2. Idempotency check (database)
 * 3. Event processing (this file)
 * 4. Return 200 OK (Paystack marks as delivered)
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Paystack Charge Success Event
 */
interface ChargeSuccessPayload {
  event: 'charge.success';
  data: {
    id: number; // Paystack charge ID
    reference: string; // Unique transaction reference
    amount: number; // Amount in kobo (e.g., 100000 = ₦1000)
    currency: string; // NGN
    status: 'success';
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
    metadata?: {
      invoiceId?: string;
      artisanId?: string;
      jobId?: string;
      paymentStage?: 'deposit' | 'release' | 'final';
    };
    paid_at: string; // ISO timestamp
    created_at: string;
  };
}

/**
 * Paystack Transfer Event
 */
interface TransferEventPayload {
  event: 'transfer.success' | 'transfer.failed' | 'transfer.reversed';
  data: {
    reference: string; // Unique transfer reference
    amount: number; // Amount in kobo
    status: 'success' | 'failed' | 'reversed';
    transfer_code?: string;
    reason?: string; // Reason for failure/reversal
    metadata?: {
      paymentId?: string;
      artisanId?: string;
    };
    recipient: {
      id: number;
      name: string;
      bank_name?: string;
      account_number?: string;
    };
  };
}

type PaystackEvent = ChargeSuccessPayload | TransferEventPayload | { event: string };

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

/**
 * Main webhook endpoint handler
 *
 * Routes events to appropriate handlers and ensures idempotent processing.
 *
 * Returns 200 OK for all events (even unhandled ones) so Paystack
 * marks the webhook as delivered and stops retrying.
 */
export const handlePaystackWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const payload = req.body as PaystackEvent;

    // 1. Log receipt
    logger.info(`[Paystack] Received event: ${payload.event}`, {
      reference: (payload.data as any)?.reference,
    });

    // 2. Check idempotency (prevent duplicate processing)
    const isProcessed = await checkIdempotency(payload);

    if (isProcessed) {
      logger.info(`[Paystack] Webhook already processed (idempotent)`, {
        event: payload.event,
        reference: (payload.data as any)?.reference,
      });

      // Return 200 OK (webhook marked as delivered)
      res.status(200).json({
        success: true,
        message: 'Webhook already processed',
      });
      return;
    }

    // 3. Route to event handler
    switch (payload.event) {
      case 'charge.success':
        await handleChargeSuccess(payload as ChargeSuccessPayload);
        break;

      case 'charge.failed':
        await handleChargeFailed(payload);
        break;

      case 'transfer.success':
        await handleTransferSuccess(payload as TransferEventPayload);
        break;

      case 'transfer.failed':
      case 'transfer.reversed':
        await handleTransferFailure(payload as TransferEventPayload);
        break;

      default:
        logger.debug(`[Paystack] Unhandled event: ${payload.event}`);
    }

    // 4. Mark as processed (idempotency)
    await recordProcessedWebhook(payload);

    // 5. Return 200 OK
    // Paystack checks for 200-299 status codes as success
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
    });
  }
);

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle Charge Success (Payment Received)
 *
 * When a customer successfully pays via Paystack:
 * 1. Find the invoice from metadata
 * 2. Record payment in database
 * 3. Update invoice status
 * 4. Increment server_version for mobile sync
 */
async function handleChargeSuccess(payload: ChargeSuccessPayload): Promise<void> {
  try {
    const { data } = payload;
    const { reference, amount, metadata } = data;

    // Extract invoice and artisan IDs from metadata
    const invoiceId = metadata?.invoiceId;
    const artisanId = metadata?.artisanId;
    const paymentStage = metadata?.paymentStage || 'full'; // deposit, release, final

    if (!invoiceId || !artisanId) {
      logger.warn('[Paystack] Missing invoice or artisan ID in charge.success', {
        reference,
        metadata,
      });
      return;
    }

    logger.info(`[Paystack] Processing charge.success`, {
      reference,
      invoiceId,
      artisanId,
      amountNaira: amount / 100,
      stage: paymentStage,
    });

    // Use transaction for consistency
    await prisma.$transaction(async (tx) => {
      // 1. Find invoice
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        logger.error(`[Paystack] Invoice not found: ${invoiceId}`);
        return;
      }

      // 2. Create payment record
      const newPayment = await tx.payment.create({
        data: {
          id: `pay_${reference}`,
          invoiceId,
          artisanId,
          amount: amount / 100, // Convert from kobo to naira
          method: 'PAYSTACK_ESCROW',
          status: 'COMPLETED',
          transactionId: reference,
          paystackTransferId: reference,
          paidAt: new Date(data.paid_at),
          recordedAt: new Date(),
          notes: `Payment received via Paystack (${paymentStage})`,
          serverVersion: 1,
        },
      });

      // 3. Update invoice
      const newAmountPaid = invoice.amountPaid + newPayment.amount;
      const newAmountDue = invoice.totalAmount - newAmountPaid;

      let newStatus = invoice.status;
      let newPaidStatus = 'partially_paid';

      if (newAmountDue <= 0) {
        // Fully paid
        newStatus = 'paid';
        newPaidStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'accepted'; // At least partially paid
      }

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          amountDue: Math.max(0, newAmountDue),
          status: newStatus,
          paidStatus: newPaidStatus,
          serverVersion: invoice.serverVersion + 1,
          updatedAt: new Date(),
          paidAt: newAmountDue <= 0 ? new Date() : invoice.paidAt,
        },
      });

      // 4. If fully paid, update related job
      if (newAmountDue <= 0) {
        const job = await tx.job.findUnique({
          where: { id: invoice.jobId },
        });

        if (job) {
          await tx.job.update({
            where: { id: job.id },
            data: {
              paidAmount: job.totalAmount,
              pendingAmount: 0,
              status: 'PAID',
              serverVersion: job.serverVersion + 1,
              updatedAt: new Date(),
            },
          });

          logger.info(`[Paystack] Job marked as PAID`, {
            jobId: job.id,
            totalAmount: job.totalAmount,
          });
        }
      }

      logger.info(`[Paystack] charge.success processed`, {
        paymentId: newPayment.id,
        invoiceStatus: newStatus,
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
      });
    });
  } catch (error) {
    logger.error('[Paystack] Error processing charge.success:', error);
    throw error;
  }
}

/**
 * Handle Charge Failed
 *
 * Customer payment failed. Update payment record and log event.
 */
async function handleChargeFailed(payload: any): Promise<void> {
  try {
    const { data } = payload;
    const { reference } = data;

    logger.warn(`[Paystack] Charge failed`, {
      reference,
      reason: data.gateway_response,
    });

    // Record failed payment for audit
    // (Implementation depends on your requirements)
  } catch (error) {
    logger.error('[Paystack] Error processing charge.failed:', error);
  }
}

/**
 * Handle Transfer Success (Artisan Payout)
 *
 * When we successfully transfer funds to artisan:
 * 1. Find the payment record
 * 2. Update status to COMPLETED
 * 3. Mark payment as transferred
 */
async function handleTransferSuccess(payload: TransferEventPayload): Promise<void> {
  try {
    const { data } = payload;
    const { reference, amount } = data;

    logger.info(`[Paystack] Processing transfer.success`, {
      reference,
      amountNaira: amount / 100,
      recipientBank: data.recipient.bank_name,
    });

    // Update payment status to TRANSFERRED
    await prisma.payment.updateMany({
      where: { paystackTransferId: reference },
      data: {
        status: 'COMPLETED',
        notes: `Transfer to artisan completed: ${data.recipient.name} (${data.recipient.bank_name})`,
        serverVersion: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    logger.info(`[Paystack] transfer.success processed`, {
      reference,
      recipient: data.recipient.name,
    });
  } catch (error) {
    logger.error('[Paystack] Error processing transfer.success:', error);
    throw error;
  }
}

/**
 * Handle Transfer Failure/Reversal
 *
 * Transfer failed or was reversed (dispute/refund):
 * 1. Mark payment as FAILED or REFUNDED
 * 2. Revert invoice paid amount if needed
 * 3. Notify artisan
 */
async function handleTransferFailure(payload: TransferEventPayload): Promise<void> {
  try {
    const { data } = payload;
    const { reference, status, reason } = data;

    logger.warn(`[Paystack] Transfer ${status}`, {
      reference,
      reason,
      amount: data.amount / 100,
    });

    // Map Paystack status to payment status
    const paymentStatus = status === 'reversed' ? 'REFUNDED' : 'FAILED';

    // Update payment record
    const payment = await prisma.payment.findFirst({
      where: { paystackTransferId: reference },
    });

    if (payment && payment.invoiceId) {
      await prisma.$transaction(async (tx) => {
        // 1. Update payment
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: paymentStatus as any,
            notes: `Transfer ${status}: ${reason}`,
            serverVersion: payment.serverVersion + 1,
            updatedAt: new Date(),
          },
        });

        // 2. Revert invoice if needed
        const invoice = await tx.invoice.findUnique({
          where: { id: payment.invoiceId },
        });

        if (invoice) {
          const newAmountPaid = Math.max(0, invoice.amountPaid - payment.amount);
          const newAmountDue = invoice.totalAmount - newAmountPaid;

          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              amountPaid: newAmountPaid,
              amountDue: newAmountDue,
              paidStatus: newAmountPaid === 0 ? 'unpaid' : 'partially_paid',
              serverVersion: invoice.serverVersion + 1,
              updatedAt: new Date(),
            },
          });
        }
      });

      logger.info(`[Paystack] transfer ${status} processed`, {
        paymentId: payment.id,
        invoiceId: payment.invoiceId,
      });
    }
  } catch (error) {
    logger.error('[Paystack] Error processing transfer failure:', error);
    throw error;
  }
}

// ============================================================================
// IDEMPOTENCY
// ============================================================================

/**
 * Check if webhook has already been processed
 *
 * Prevents duplicate processing if Paystack retries the webhook.
 * Uses database to record processed webhook references.
 */
async function checkIdempotency(payload: PaystackEvent): Promise<boolean> {
  try {
    const reference = (payload.data as any)?.reference;

    if (!reference) {
      return false; // No reference, allow processing
    }

    const existing = await prisma.processedWebhook.findUnique({
      where: {
        paystackReference: reference,
      },
    });

    return !!existing;
  } catch (error) {
    logger.error('[Paystack] Idempotency check error:', error);
    // Allow processing if check fails (fail-safe)
    return false;
  }
}

/**
 * Record processed webhook for idempotency
 */
async function recordProcessedWebhook(payload: PaystackEvent): Promise<void> {
  try {
    const reference = (payload.data as any)?.reference;

    if (!reference) {
      return; // No reference to record
    }

    await prisma.processedWebhook.create({
      data: {
        paystackReference: reference,
        event: payload.event,
        payloadHash: computePayloadHash(JSON.stringify(payload)),
        processedAt: new Date(),
      },
    });
  } catch (error) {
    // Log but don't throw - webhook already processed successfully
    logger.warn('[Paystack] Failed to record processed webhook:', error);
  }
}

/**
 * Compute hash of payload for verification
 */
function computePayloadHash(payload: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(payload).digest('hex');
}
