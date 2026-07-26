/**
 * Formatting & Validation Utilities
 *
 * Common functions for currency formatting, phone numbers, dates, and validation.
 * Optimized for Nigerian market.
 */

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format amount as Nigerian Naira
 * @param amount Amount in naira
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string: "₦1,234.56"
 */
export function formatCurrency(amount: number, decimals: number = 2): string {
  if (!Number.isFinite(amount)) {
    return '₦0.00';
  }

  return `₦${amount.toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Parse currency string to number
 * @param value String like "₦1,234.56" or "1234.56"
 * @returns Number or 0 if invalid
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[₦,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculate percentage of amount
 * @param amount Base amount
 * @param percentage Percentage (0-100)
 * @returns Calculated value
 */
export function calculatePercentage(amount: number, percentage: number): number {
  return (amount * percentage) / 100;
}

// ============================================================================
// PHONE NUMBER FORMATTING
// ============================================================================

/**
 * Format Nigerian phone number for display
 * @param phone Phone number (various formats accepted)
 * @returns Formatted string: "0701 234 5678" or "0701-234-5678"
 */
export function formatPhoneDisplay(phone: string, format: 'dots' | 'dashes' = 'dots'): string {
  if (!phone) return '';

  // Extract only digits
  const digits = phone.replace(/\D/g, '');

  // Handle Nigerian format (11 digits)
  if (digits.length === 11) {
    const area = digits.slice(0, 4);
    const first = digits.slice(4, 7);
    const last = digits.slice(7);
    const separator = format === 'dots' ? ' ' : '-';
    return `${area}${separator}${first}${separator}${last}`;
  }

  return phone;
}

/**
 * Format phone for WhatsApp URL
 * Converts to international format (e.g., 234701234567)
 * @param phone Nigerian phone number
 * @returns International format or null if invalid
 */
export function formatPhoneForWhatsApp(phone: string): string | null {
  if (!phone) return null;

  // Extract only digits
  const digits = phone.replace(/\D/g, '');

  // Must be 11 digits (Nigerian)
  if (digits.length !== 11) return null;

  // Convert 0701... to 234701...
  if (digits.startsWith('0')) {
    return '234' + digits.slice(1);
  }

  // Already in correct format
  if (digits.startsWith('234')) {
    return digits;
  }

  return null;
}

/**
 * Validate Nigerian phone number
 * @param phone Phone number to validate
 * @returns True if valid Nigerian number
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');

  // Must be 11 digits (0XXX...) or 13 digits (234XXX...)
  if (digits.length === 11 && digits.startsWith('0')) {
    return /^0[7-9]\d{9}$/.test(digits);
  }

  if (digits.length === 13 && digits.startsWith('234')) {
    return /^234[7-9]\d{9}$/.test(digits);
  }

  return false;
}

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Validate email address
 * @param email Email to validate
 * @returns True if valid format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

/**
 * Format date for display
 * @param date Date to format
 * @param style Format style
 * @returns Formatted string
 */
export function formatDate(
  date: Date | string | number,
  style: 'short' | 'long' | 'relative' = 'short'
): string {
  const dateObj = new Date(date);

  if (Number.isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  switch (style) {
    case 'short':
      // "25 Jul 2024"
      return dateObj.toLocaleDateString('en-NG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

    case 'long':
      // "Friday, 25 July 2024"
      return dateObj.toLocaleDateString('en-NG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

    case 'relative':
      return formatRelativeDate(dateObj);

    default:
      return dateObj.toLocaleDateString('en-NG');
  }
}

/**
 * Format date as relative time
 * @param date Date to format
 * @returns String like "2 hours ago" or "in 3 days"
 */
export function formatRelativeDate(date: Date | string | number): string {
  const dateObj = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSeconds < 0) {
    // Future date
    const absDiffSeconds = Math.abs(diffSeconds);
    const absDiffMinutes = Math.round(absDiffSeconds / 60);
    const absDiffHours = Math.round(absDiffMinutes / 60);
    const absDiffDays = Math.round(absDiffHours / 24);

    if (absDiffSeconds < 60) return 'in a few seconds';
    if (absDiffMinutes < 60) return `in ${absDiffMinutes} minute${absDiffMinutes !== 1 ? 's' : ''}`;
    if (absDiffHours < 24) return `in ${absDiffHours} hour${absDiffHours !== 1 ? 's' : ''}`;
    return `in ${absDiffDays} day${absDiffDays !== 1 ? 's' : ''}`;
  }

  // Past date
  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  // Fall back to formatted date
  return formatDate(dateObj, 'short');
}

/**
 * Format time for display
 * @param date Date to format
 * @returns Time string like "2:30 PM"
 */
export function formatTime(date: Date | string | number): string {
  const dateObj = new Date(date);

  return dateObj.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date and time together
 * @param date Date to format
 * @returns String like "25 Jul 2024, 2:30 PM"
 */
export function formatDateTime(date: Date | string | number): string {
  return `${formatDate(date, 'short')}, ${formatTime(date)}`;
}

/**
 * Get date range label for invoice period
 * @param dateFrom Start date
 * @param dateTo End date
 * @returns Label like "Jul 1 - Jul 31, 2024"
 */
export function formatDateRange(dateFrom: Date, dateTo: Date): string {
  const from = formatDate(dateFrom, 'short');
  const to = formatDate(dateTo, 'short');
  return `${from} - ${to}`;
}

// ============================================================================
// TEXT FORMATTING
// ============================================================================

/**
 * Truncate text to max length with ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text or original if shorter
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Capitalize first letter of string
 * @param text Text to capitalize
 * @returns Capitalized text
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert enum value to display label
 * @param value Enum value (snake_case)
 * @returns Display label (Title Case)
 */
export function labelFromEnum(value: string): string {
  if (!value) return '';
  return value
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Format job status for display
 * @param status Job status enum
 * @returns User-friendly label
 */
export function formatJobStatus(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Draft',
    accepted: 'Accepted',
    material_sourced: 'Materials Sourced',
    in_progress: 'In Progress',
    awaiting_inspection: 'Awaiting Inspection',
    completed: 'Completed',
    paid: 'Paid',
    cancelled: 'Cancelled',
  };

  return statusMap[status] || capitalize(status);
}

/**
 * Format payment status for display
 * @param status Payment status enum
 * @returns User-friendly label
 */
export function formatPaymentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    refunded: 'Refunded',
  };

  return statusMap[status] || capitalize(status);
}

/**
 * Format expense category for display
 * @param category Expense category enum
 * @returns User-friendly label
 */
export function formatExpenseCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    fuel: '⛽ Fuel/Petrol',
    transport: '🚗 Transport',
    tools: '🔧 Tools',
    equipment: '⚙️ Equipment',
    other: '📦 Other',
  };

  return categoryMap[category] || capitalize(category);
}

// ============================================================================
// BANK INFORMATION
// ============================================================================

/**
 * Nigerian bank codes (subset for common banks)
 */
export const NIGERIAN_BANKS = [
  { code: '044', name: 'Guaranty Trust Bank (GTB)' },
  { code: '999', name: 'First Banc Nigeria' },
  { code: '090', name: 'First Bank Nigeria' },
  { code: '070', name: 'Zenith Bank' },
  { code: '050', name: 'First City Monument Bank (FCMB)' },
  { code: '011', name: 'First Institute of Bankers' },
  { code: '012', name: 'WEMA Bank' },
  { code: '032', name: 'Union Bank' },
  { code: '021', name: 'Stanbic IBTC Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '959', name: 'Allied Bank' },
  { code: '050', name: 'FCMB' },
  { code: '403', name: 'Access Bank' },
  { code: '060', name: 'Standard Chartered Bank' },
];

/**
 * Get bank name from code
 * @param code Bank code
 * @returns Bank name or code if not found
 */
export function getBankName(code: string): string {
  const bank = NIGERIAN_BANKS.find((b) => b.code === code);
  return bank?.name || code;
}

// ============================================================================
// INVOICE FORMATTING
// ============================================================================

/**
 * Generate invoice text for WhatsApp sharing
 * @param invoiceData Invoice data
 * @returns Formatted text
 */
export function generateInvoiceTextForWhatsApp(invoiceData: any): string {
  const {
    artisanName,
    clientName,
    items = [],
    subtotal = 0,
    taxAmount = 0,
    discountAmount = 0,
    totalAmount = 0,
    notes = '',
  } = invoiceData;

  let text = `*INVOICE*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `*From:* ${artisanName || 'Service Provider'}\n`;
  text += `*To:* ${clientName || 'Client'}\n\n`;

  text += `*ITEMS:*\n`;
  items.forEach((item: any) => {
    const amount = item.quantity * item.unitPrice;
    text += `${item.description}\n`;
    text += `  ${item.quantity} × ${formatCurrency(item.unitPrice)} = ${formatCurrency(amount)}\n`;
  });

  text += `\n━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Subtotal: ${formatCurrency(subtotal)}\n`;

  if (taxAmount > 0) {
    text += `Tax: ${formatCurrency(taxAmount)}\n`;
  }

  if (discountAmount > 0) {
    text += `Discount: -${formatCurrency(discountAmount)}\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `*TOTAL: ${formatCurrency(totalAmount)}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (notes) {
    text += `Notes: ${notes}\n\n`;
  }

  text += `Please confirm receipt. Thank you!`;

  return text;
}
