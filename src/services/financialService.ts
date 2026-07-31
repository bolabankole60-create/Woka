/**
 * Financial Service
 * Typed financial calculations used across the app
 */

export interface FinancialState {
  invoiceTotal: number;
  invoiceAmountPaid: number;
}

/**
 * Calculate outstanding balance
 * Outstanding = max(invoiceTotal - invoiceAmountPaid, 0)
 *
 * @param state Financial state with invoice totals
 * @returns Outstanding balance amount
 */
export function calculateOutstandingBalance(state: FinancialState): number {
  const outstanding = state.invoiceTotal - state.invoiceAmountPaid;
  return Math.max(outstanding, 0);
}

/**
 * Calculate paid percentage
 */
export function calculatePaidPercentage(state: FinancialState): number {
  if (state.invoiceTotal === 0) return 0;
  return (state.invoiceAmountPaid / state.invoiceTotal) * 100;
}

/**
 * Get payment status
 */
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid';

export function getPaymentStatus(state: FinancialState): PaymentStatus {
  if (state.invoiceAmountPaid === 0) return 'unpaid';
  if (state.invoiceAmountPaid < state.invoiceTotal) return 'partial';
  if (state.invoiceAmountPaid === state.invoiceTotal) return 'paid';
  return 'overpaid';
}
