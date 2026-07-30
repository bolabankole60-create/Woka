/**
 * Customer Queries Service
 *
 * Provides access to customer-related data:
 * - Related jobs, invoices, payments
 * - Financial aggregations (total invoiced, total paid, outstanding)
 */

import { prisma } from '../config/database';

export interface CustomerFinancials {
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
}

export interface CustomerWithFinancials {
  id: string;
  artisanId: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  email?: string;
  address?: string;
  notes?: string;
  isArchived: boolean;
  archivedAt?: Date;
  financials: CustomerFinancials;
}

/**
 * Get all jobs for a customer
 */
export async function getCustomerJobs(customerId: string) {
  return prisma.job.findMany({
    where: {
      customerId,
      deleted: false,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      totalAmount: true,
      paidAmount: true,
      pendingAmount: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get all invoices for a customer (through jobs)
 */
export async function getCustomerInvoices(customerId: string) {
  return prisma.invoice.findMany({
    where: {
      job: {
        customerId,
        deleted: false,
      },
      deleted: false,
    },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
      status: true,
      paidStatus: true,
      issuedAt: true,
      dueDate: true,
      paidAt: true,
    },
    orderBy: { issuedAt: 'desc' },
  });
}

/**
 * Get all payments for a customer (direct + through invoices)
 */
export async function getCustomerPayments(customerId: string) {
  return prisma.payment.findMany({
    where: {
      OR: [
        { customerId },
        { invoice: { job: { customerId, deleted: false } } },
      ],
      deleted: false,
    },
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      paidAt: true,
      recordedAt: true,
      notes: true,
    },
    orderBy: { recordedAt: 'desc' },
  });
}

/**
 * Calculate total invoiced amount for a customer
 * Sum of all invoice totals for customer's jobs
 */
export async function calculateTotalInvoiced(customerId: string): Promise<number> {
  const result = await prisma.invoice.aggregate({
    where: {
      job: {
        customerId,
        deleted: false,
      },
      deleted: false,
    },
    _sum: {
      totalAmount: true,
    },
  });
  return result._sum.totalAmount || 0;
}

/**
 * Calculate total paid amount for a customer
 * Sum of all completed payments + invoice amounts marked as paid
 * Avoids double-counting by using invoice amountPaid instead of separate payment rows
 */
export async function calculateTotalPaid(customerId: string): Promise<number> {
  // Get sum of all invoice amounts that are marked paid
  const invoicesPaid = await prisma.invoice.aggregate({
    where: {
      job: {
        customerId,
        deleted: false,
      },
      paidStatus: { in: ['paid', 'partially_paid'] },
      deleted: false,
    },
    _sum: {
      amountPaid: true,
    },
  });

  // Get direct payments to customer (not tied to invoices)
  const directPayments = await prisma.payment.aggregate({
    where: {
      customerId,
      invoiceId: null,
      status: 'COMPLETED',
      deleted: false,
    },
    _sum: {
      amount: true,
    },
  });

  return (invoicesPaid._sum.amountPaid || 0) + (directPayments._sum.amount || 0);
}

/**
 * Calculate outstanding balance for a customer
 * Outstanding = Total Invoiced - Total Paid
 */
export async function calculateOutstandingBalance(customerId: string): Promise<number> {
  const totalInvoiced = await calculateTotalInvoiced(customerId);
  const totalPaid = await calculateTotalPaid(customerId);
  return Math.max(0, totalInvoiced - totalPaid);
}

/**
 * Get complete customer financials in one query
 */
export async function getCustomerFinancials(customerId: string): Promise<CustomerFinancials> {
  const [totalInvoiced, totalPaid] = await Promise.all([
    calculateTotalInvoiced(customerId),
    calculateTotalPaid(customerId),
  ]);

  return {
    totalInvoiced,
    totalPaid,
    outstandingBalance: Math.max(0, totalInvoiced - totalPaid),
  };
}

/**
 * Get customer with all related data and financials
 */
export async function getCustomerWithFinancials(
  customerId: string
): Promise<CustomerWithFinancials | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return null;
  }

  const financials = await getCustomerFinancials(customerId);

  return {
    id: customer.id,
    artisanId: customer.artisanId,
    name: customer.name,
    phone: customer.phone,
    normalizedPhone: customer.normalizedPhone,
    email: customer.email || undefined,
    address: customer.address || undefined,
    notes: customer.notes || undefined,
    isArchived: customer.isArchived,
    archivedAt: customer.archivedAt || undefined,
    financials,
  };
}
