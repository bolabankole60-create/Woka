/**
 * Nigerian Phone Number Normalization
 *
 * Converts Nigerian phone numbers to E.164 format for storage and deduplication.
 * E.164: +234XXXXXXXXXX (country code 234 for Nigeria)
 */

/**
 * Normalize Nigerian phone number to E.164 format
 *
 * Accepts formats:
 * - 0701234567 (11 digits, standard Nigerian)
 * - +2347012345678 (E.164 with +)
 * - 2347012345678 (E.164 without +)
 * - 07012345678 (with formatting)
 *
 * Returns: +2347012345678 (E.164 format)
 * Throws: Error if not a valid Nigerian number
 */
export function normalizeNigerianPhone(phone: string): string {
  if (!phone) {
    throw new Error('Phone number is required');
  }

  // Extract only digits
  const digits = phone.replace(/\D/g, '');

  // Handle 11-digit Nigerian format (0XXXXXXXXXX)
  if (digits.length === 11) {
    if (digits.startsWith('0')) {
      const valid = /^0[7-9]\d{9}$/.test(digits);
      if (!valid) {
        throw new Error('Invalid Nigerian phone number format');
      }
      // Convert 07012345678 to +2347012345678
      return '+234' + digits.slice(1);
    }
    throw new Error('11-digit numbers must start with 0');
  }

  // Handle 13-digit format (234XXXXXXXXXX)
  if (digits.length === 13) {
    if (digits.startsWith('234')) {
      const valid = /^234[7-9]\d{9}$/.test(digits);
      if (!valid) {
        throw new Error('Invalid Nigerian phone number format');
      }
      return '+' + digits;
    }
    throw new Error('13-digit numbers must start with 234');
  }

  throw new Error(
    `Invalid phone number length: ${digits.length}. Expected 11 or 13 digits.`
  );
}

/**
 * Check if two phone numbers are the same after normalization
 */
export function isSamePhoneNumber(phone1: string, phone2: string): boolean {
  try {
    const normalized1 = normalizeNigerianPhone(phone1);
    const normalized2 = normalizeNigerianPhone(phone2);
    return normalized1 === normalized2;
  } catch {
    return false;
  }
}

/**
 * Validate Nigerian phone number without normalization
 */
export function isValidNigerianPhone(phone: string): boolean {
  try {
    normalizeNigerianPhone(phone);
    return true;
  } catch {
    return false;
  }
}
