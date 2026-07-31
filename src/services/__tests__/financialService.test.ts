/**
 * Financial Service Tests
 * Tests real financial calculation functions
 */

import {
  calculateOutstandingBalance,
  calculatePaidPercentage,
  getPaymentStatus,
  type FinancialState,
} from '../financialService';
import {
  getInvoiceRaw,
  filterPaymentsByInvoice,
  sumPaymentAmounts,
} from '../watermelonHelpers';
import { InMemoryDatabase } from './inMemoryDatabase';

describe('Financial Service Calculations', () => {
  describe('calculateOutstandingBalance', () => {
    it('should handle no invoice', () => {
      const state: FinancialState = {
        invoiceTotal: 0,
        invoiceAmountPaid: 0,
      };

      const outstanding = calculateOutstandingBalance(state);

      expect(outstanding).toBe(0);
    });

    it('should handle unpaid invoice', () => {
      const state: FinancialState = {
        invoiceTotal: 1000,
        invoiceAmountPaid: 0,
      };

      const outstanding = calculateOutstandingBalance(state);

      expect(outstanding).toBe(1000);
    });

    it('should handle partial payment', () => {
      const state: FinancialState = {
        invoiceTotal: 1000,
        invoiceAmountPaid: 600,
      };

      const outstanding = calculateOutstandingBalance(state);

      expect(outstanding).toBe(400);
    });

    it('should handle full payment', () => {
      const state: FinancialState = {
        invoiceTotal: 1000,
        invoiceAmountPaid: 1000,
      };

      const outstanding = calculateOutstandingBalance(state);

      expect(outstanding).toBe(0);
    });

    it('should handle overpayment', () => {
      const state: FinancialState = {
        invoiceTotal: 1000,
        invoiceAmountPaid: 1200,
      };

      const outstanding = calculateOutstandingBalance(state);

      // max(negative, 0) = 0
      expect(outstanding).toBe(0);
    });

    it('should handle zero-value invoice', () => {
      const state: FinancialState = {
        invoiceTotal: 0,
        invoiceAmountPaid: 0,
      };

      const outstanding = calculateOutstandingBalance(state);

      expect(outstanding).toBe(0);
    });

    it('should handle large amounts', () => {
      const state: FinancialState = {
        invoiceTotal: 999999.99,
        invoiceAmountPaid: 500000.00,
      };

      const outstanding = calculateOutstandingBalance(state);

      expect(outstanding).toBeCloseTo(499999.99, 2);
    });

    it('should handle decimal precision', () => {
      const state: FinancialState = {
        invoiceTotal: 1000.50,
        invoiceAmountPaid: 600.75,
      };

      const outstanding = calculateOutstandingBalance(state);

      expect(outstanding).toBeCloseTo(399.75, 2);
    });
  });

  describe('calculatePaidPercentage', () => {
    it('should return 0 for unpaid invoice', () => {
      const state: FinancialState = {
        invoiceTotal: 1000,
        invoiceAmountPaid: 0,
      };

      const percentage = calculatePaidPercentage(state);

      expect(percentage).toBe(0);
    });

    it('should return 50 for half paid', () => {
      const state: FinancialState = {
        invoiceTotal: 1000,
        invoiceAmountPaid: 500,
      };

      const percentage = calculatePaidPercentage(state);

      expect(percentage).toBe(50);
    });

    it('should return 100 for fully paid', () => {
      const state: FinancialState = {
        invoiceTotal: 1000,
        invoiceAmountPaid: 1000,
      };

      const percentage = calculatePaidPercentage(state);

      expect(percentage).toBe(100);
    });

    it('should handle zero invoice', () => {
      const state: FinancialState = {
        invoiceTotal: 0,
        invoiceAmountPaid: 0,
      };

      const percentage = calculatePaidPercentage(state);

      expect(percentage).toBe(0);
    });

    it('should handle overpayment', () => {
      const state: FinancialState = {
        invoiceTotal: 1000,
        invoiceAmountPaid: 1200,
      };

      const percentage = calculatePaidPercentage(state);

      expect(percentage).toBe(120);
    });
  });

  describe('getPaymentStatus', () => {
    it('should return unpaid for zero payment', () => {
      const state: FinancialState = {
        invoiceTotal: 1000,
        invoiceAmountPaid: 0,
      };

      const status = getPaymentStatus(state);

      expect(status).toBe('unpaid');
    });

    it('should return partial for partial payment', () => {
      const state: FinancialState = {
        invoiceTotal: 1000,
        invoiceAmountPaid: 600,
      };

      const status = getPaymentStatus(state);

      expect(status).toBe('partial');
    });

    it('should return paid for full payment', () => {
      const state: FinancialState = {
        invoiceTotal: 1000,
        invoiceAmountPaid: 1000,
      };

      const status = getPaymentStatus(state);

      expect(status).toBe('paid');
    });

    it('should return overpaid for excess payment', () => {
      const state: FinancialState = {
        invoiceTotal: 1000,
        invoiceAmountPaid: 1200,
      };

      const status = getPaymentStatus(state);

      expect(status).toBe('overpaid');
    });
  });

  describe('Financial Integration with WatermelonDB', () => {
    let db: InMemoryDatabase;

    beforeEach(() => {
      db = new InMemoryDatabase();
    });

    it('should calculate outstanding from linked payments', async () => {
      const invoicesCollection = db.get('invoices');
      const paymentsCollection = db.get('payments');

      // Create invoice
      const invoice = await invoicesCollection.create(async (i: any) => {
        i.id = 'inv-1';
        i.job_id = 'job-1';
        i.artisan_id = 'artisan-1';
        i.invoice_number = 'INV001';
        i.subtotal = 1000;
        i.tax_rate = 0;
        i.tax_amount = 0;
        i.discount_amount = 0;
        i.total_amount = 1000;
        i.amount_paid = 0;
        i.amount_due = 1000;
        i.status = 'sent';
        i.paid_status = 'unpaid';
        i.issued_at = Date.now();
        i.sync_status = 'synced';
        i.client_version = 0;
        i.server_version = 1;
        i.created_at = Date.now();
        i.updated_at = Date.now();
      });

      // Create payments
      await paymentsCollection.create(async (p: any) => {
        p.id = 'pay-1';
        p.invoice_id = 'inv-1';
        p.artisan_id = 'artisan-1';
        p.amount = 600;
        p.method = 'cash';
        p.status = 'completed';
        p.recorded_at = Date.now();
        p.sync_status = 'synced';
        p.client_version = 0;
        p.server_version = 1;
        p.created_at = Date.now();
        p.updated_at = Date.now();
      });

      // Get all payments for invoice
      const allPayments = await paymentsCollection.query().fetch();
      const invoicePayments = filterPaymentsByInvoice(allPayments, 'inv-1');

      const totalPaid = sumPaymentAmounts(invoicePayments);

      const state: FinancialState = {
        invoiceTotal: getInvoiceRaw(invoice).total_amount,
        invoiceAmountPaid: totalPaid,
      };

      const outstanding = calculateOutstandingBalance(state);

      expect(outstanding).toBe(400);
      expect(getPaymentStatus(state)).toBe('partial');
    });

    it('should handle missing payment records', async () => {
      const invoicesCollection = db.get('invoices');
      const paymentsCollection = db.get('payments');

      const invoice = await invoicesCollection.create(async (i: any) => {
        i.id = 'inv-2';
        i.job_id = 'job-2';
        i.artisan_id = 'artisan-1';
        i.invoice_number = 'INV002';
        i.subtotal = 500;
        i.tax_rate = 0;
        i.tax_amount = 0;
        i.discount_amount = 0;
        i.total_amount = 500;
        i.amount_paid = 0;
        i.amount_due = 500;
        i.status = 'sent';
        i.paid_status = 'unpaid';
        i.issued_at = Date.now();
        i.sync_status = 'synced';
        i.client_version = 0;
        i.server_version = 1;
        i.created_at = Date.now();
        i.updated_at = Date.now();
      });

      // Don't create any payments
      const allPayments = await paymentsCollection.query().fetch();
      const invoicePayments = filterPaymentsByInvoice(allPayments, 'inv-2');

      expect(invoicePayments.length).toBe(0);

      const totalPaid = sumPaymentAmounts(invoicePayments);

      const state: FinancialState = {
        invoiceTotal: getInvoiceRaw(invoice).total_amount,
        invoiceAmountPaid: totalPaid,
      };

      // Should not crash
      const outstanding = calculateOutstandingBalance(state);
      expect(outstanding).toBe(500);
    });

    it('should prevent double-counting payments', async () => {
      const invoicesCollection = db.get('invoices');
      const paymentsCollection = db.get('payments');

      const invoice = await invoicesCollection.create(async (i: any) => {
        i.id = 'inv-3';
        i.job_id = 'job-3';
        i.artisan_id = 'artisan-1';
        i.invoice_number = 'INV003';
        i.subtotal = 1000;
        i.tax_rate = 0;
        i.tax_amount = 0;
        i.discount_amount = 0;
        i.total_amount = 1000;
        i.amount_paid = 500; // Pre-calculated
        i.amount_due = 500;
        i.status = 'sent';
        i.paid_status = 'partially_paid';
        i.issued_at = Date.now();
        i.sync_status = 'synced';
        i.client_version = 0;
        i.server_version = 1;
        i.created_at = Date.now();
        i.updated_at = Date.now();
      });

      // Create single payment
      await paymentsCollection.create(async (p: any) => {
        p.id = 'pay-3';
        p.invoice_id = 'inv-3';
        p.artisan_id = 'artisan-1';
        p.amount = 500;
        p.method = 'bank_transfer';
        p.status = 'completed';
        p.recorded_at = Date.now();
        p.sync_status = 'synced';
        p.client_version = 0;
        p.server_version = 1;
        p.created_at = Date.now();
        p.updated_at = Date.now();
      });

      // Query by invoice_id to prevent duplicates
      const allPayments = await paymentsCollection.query().fetch();
      const invoicePayments = filterPaymentsByInvoice(allPayments, 'inv-3');

      // Should have exactly 1 payment
      expect(invoicePayments.length).toBe(1);

      const totalPaid = sumPaymentAmounts(invoicePayments);

      // Use queried total, not pre-calculated
      const state: FinancialState = {
        invoiceTotal: getInvoiceRaw(invoice).total_amount,
        invoiceAmountPaid: totalPaid,
      };

      const outstanding = calculateOutstandingBalance(state);
      expect(outstanding).toBe(500);
    });
  });
});
