/**
 * WatermelonDB Record Helpers
 * Typed accessors for WatermelonDB records to replace scattered `as any` casts
 */

import type {
  WatermelonJobRaw,
  WatermelonCustomerRaw,
  WatermelonInvoiceRaw,
  WatermelonPaymentRaw,
} from '../types/watermelondb';

/**
 * Safely extract raw job data with type safety
 */
export function getJobRaw(record: any): WatermelonJobRaw {
  return record._raw as WatermelonJobRaw;
}

/**
 * Get job status safely
 */
export function getJobStatus(record: any): string {
  return getJobRaw(record).status;
}

/**
 * Get job customer ID safely
 */
export function getJobCustomerId(record: any): string | null | undefined {
  return getJobRaw(record).customer_id;
}

/**
 * Get job client version safely
 */
export function getJobClientVersion(record: any): number {
  return getJobRaw(record).client_version;
}

/**
 * Safely extract raw customer data with type safety
 */
export function getCustomerRaw(record: any): WatermelonCustomerRaw {
  return record._raw as WatermelonCustomerRaw;
}

/**
 * Safely extract raw invoice data with type safety
 */
export function getInvoiceRaw(record: any): WatermelonInvoiceRaw {
  return record._raw as WatermelonInvoiceRaw;
}

/**
 * Get invoice total amount safely
 */
export function getInvoiceTotal(record: any): number {
  return getInvoiceRaw(record).total_amount;
}

/**
 * Safely extract raw payment data with type safety
 */
export function getPaymentRaw(record: any): WatermelonPaymentRaw {
  return record._raw as WatermelonPaymentRaw;
}

/**
 * Get payment invoice ID safely
 */
export function getPaymentInvoiceId(record: any): string | null | undefined {
  return getPaymentRaw(record).invoice_id;
}

/**
 * Get payment amount safely
 */
export function getPaymentAmount(record: any): number {
  return getPaymentRaw(record).amount;
}

/**
 * Filter job records by status safely
 */
export function filterJobsByStatus(records: any[], status: string): any[] {
  return records.filter((record) => getJobStatus(record) === status);
}

/**
 * Filter job records by customer safely
 */
export function filterJobsByCustomer(records: any[], customerId: string): any[] {
  return records.filter((record) => getJobCustomerId(record) === customerId);
}

/**
 * Filter payment records by invoice safely
 */
export function filterPaymentsByInvoice(records: any[], invoiceId: string): any[] {
  return records.filter((record) => getPaymentInvoiceId(record) === invoiceId);
}

/**
 * Sum payment amounts safely
 */
export function sumPaymentAmounts(records: any[]): number {
  return records.reduce((sum, record) => sum + getPaymentAmount(record), 0);
}
