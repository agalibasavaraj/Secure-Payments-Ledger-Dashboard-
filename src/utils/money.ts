/**
 * Secure Payments Ledger - Money Utility
 * All backend amounts are integers in minor units (paise).
 * 1 Rupee = 100 paise.
 * Floats are strictly prohibited for monetary calculations.
 */

/**
 * Formats minor units (paise) into human-readable INR currency string.
 * Example: 25000 -> "₹250.00"
 */
export function formatMoney(
  minorUnits: number | bigint | null | undefined,
  currency = 'INR'
): string {
  if (minorUnits === null || minorUnits === undefined || isNaN(Number(minorUnits))) {
    return '₹0.00';
  }

  const minor = Number(minorUnits);
  const isNegative = minor < 0;
  const absMinor = Math.abs(minor);

  const rupees = Math.floor(absMinor / 100);
  const paise = absMinor % 100;
  const paiseStr = paise.toString().padStart(2, '0');

  // Format integer part with Indian Numbering System (lakhs/crores)
  const rupeesFormatted = formatIndianNumber(rupees);

  const sign = isNegative ? '-' : '';
  const symbol = currency === 'INR' ? '₹' : `${currency} `;

  return `${sign}${symbol}${rupeesFormatted}.${paiseStr}`;
}

/**
 * Helper to format numbers according to the Indian numbering system.
 * e.g., 100000 -> "1,00,000"
 */
function formatIndianNumber(x: number): string {
  const str = x.toString();
  if (str.length <= 3) return str;

  const lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

  return `${formattedOther},${lastThree}`;
}

/**
 * Converts user input string or number (in major currency units, e.g. "250.50" or 250.5)
 * safely to minor units integer (paise) without floating point inaccuracies.
 * E.g. "0.10" -> 10, "0.20" -> 20, 0.1 + 0.2 inputs handled safely.
 */
export function toMinorUnits(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;

  const clean = input.toString().trim().replace(/,/g, '');
  if (!clean || isNaN(Number(clean))) return 0;

  // Split on decimal point to avoid floating-point math issues like 0.1 + 0.2 = 0.30000000000000004
  const parts = clean.split('.');
  const wholePart = parseInt(parts[0] || '0', 10);
  if (isNaN(wholePart)) return 0;

  let fractionPart = 0;
  if (parts.length > 1) {
    // Take at most 2 decimal digits, pad with 0 if single digit
    const fracStr = (parts[1] + '00').slice(0, 2);
    fractionPart = parseInt(fracStr, 10);
  }

  const isNeg = clean.startsWith('-');
  const total = Math.abs(wholePart) * 100 + fractionPart;
  return isNeg ? -total : total;
}

/**
 * Compact formatting for stats, e.g. 5000000 -> "₹50K"
 */
export function formatMoneyCompact(minorUnits: number): string {
  const rupees = Math.floor(Math.abs(minorUnits) / 100);
  if (rupees >= 10000000) {
    const cr = rupees / 10000000;
    return `₹${Number.isInteger(cr) ? cr : cr.toFixed(1)}Cr`;
  }
  if (rupees >= 100000) {
    return `₹${(rupees / 100000).toFixed(1)}L`;
  }
  if (rupees >= 1000) {
    const k = rupees / 1000;
    return `₹${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return formatMoney(minorUnits);
}
