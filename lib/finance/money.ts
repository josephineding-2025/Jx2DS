/** Core type — all money amounts in sen (1 MYR = 100 sen) */
export type Sen = bigint;

export const ZERO_SEN: Sen = 0n;

const MYR_INPUT_REGEX = /^\d+(\.\d{1,2})?$/;

/**
 * Parse a Malaysian Ringgit amount string into sen.
 *
 * @example
 * parseMyrToSen("21.25") // 2125n
 * @example
 * parseMyrToSen("100") // 10000n
 * @example
 * parseMyrToSen("0.50") // 50n
 */
export function parseMyrToSen(input: string): Sen {
  if (input.length === 0) {
    throw new Error("Money input cannot be empty.");
  }

  if (!MYR_INPUT_REGEX.test(input)) {
    if (input.includes("-")) {
      throw new Error("Money input cannot be negative.");
    }
    throw new Error(
      'Invalid MYR amount. Expected format like "21.25", "100", or "0.50" with at most 2 decimal places.',
    );
  }

  const [ringgitPart, senPart = ""] = input.split(".");
  const ringgit = BigInt(ringgitPart) * 100n;
  const sen = BigInt(senPart.padEnd(2, "0"));

  return ringgit + sen;
}

function formatSenToSen(sen: Sen): string {
  const absoluteSen = sen < 0n ? -sen : sen;
  const ringgit = absoluteSen / 100n;
  const remainder = absoluteSen % 100n;
  const value = `${ringgit}.${remainder.toString().padStart(2, "0")}`;

  return sen < 0n ? `-${value}` : value;
}

/**
 * Format sen into a normalized MYR string.
 *
 * @example
 * formatSenToMyr(2125n) // "21.25"
 * @example
 * formatSenToMyr(10000n) // "100.00"
 * @example
 * formatSenToMyr(50n) // "0.50"
 */
export function formatSenToMyr(sen: Sen): string {
  return formatSenToSen(sen);
}

/**
 * Format sen for UI display.
 *
 * @example
 * formatSenToDisplay(2125n) // "RM 21.25"
 * @example
 * formatSenToDisplay(-500n) // "RM -5.00"
 */
export function formatSenToDisplay(sen: Sen): string {
  return `RM ${formatSenToSen(sen)}`;
}

/**
 * Convert a Prisma Decimal-like value into sen using its string form.
 *
 * @example
 * decimalToSen({ toString: () => "21.25" }) // 2125n
 */
export function decimalToSen(value: { toString(): string }): Sen {
  return parseMyrToSen(value.toString());
}

/**
 * Convert sen to a JavaScript number for display-only use.
 *
 * @deprecated Only for non-arithmetic display (charts, formatting). Never use for money calculations.
 *
 * @example
 * senToNumber(2125n) // 21.25
 */
export function senToNumber(sen: Sen): number {
  return Number(sen) / 100;
}

/**
 * Add two sen amounts.
 *
 * @example
 * addSen(100n, 25n) // 125n
 */
export function addSen(a: Sen, b: Sen): Sen {
  return a + b;
}

/**
 * Subtract one sen amount from another.
 *
 * @example
 * subtractSen(100n, 25n) // 75n
 * subtractSen(25n, 100n) // -75n
 */
export function subtractSen(a: Sen, b: Sen): Sen {
  return a - b;
}

/**
 * Split a sen total equally across participants.
 *
 * @example
 * splitSenEqually(1000n, 3) // [334n, 333n, 333n]
 */
export function splitSenEqually(totalSen: Sen, count: number): Sen[] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("Count must be a positive integer.");
  }

  if (totalSen < 0n) {
    throw new Error("Total sen cannot be negative.");
  }

  const countBigInt = BigInt(count);
  const base = totalSen / countBigInt;
  const remainder = totalSen % countBigInt;

  const result: Sen[] = [];
  for (let index = 0; index < count; index += 1) {
    result.push(BigInt(index) < remainder ? base + 1n : base);
  }

  return result;
}

/**
 * Split a sen total by integer percentages that must sum to 100.
 *
 * @example
 * splitSenByPercentages(1000n, [20, 30, 50]) // [200n, 300n, 500n]
 */
export function splitSenByPercentages(totalSen: Sen, percentages: number[]): Sen[] {
  if (totalSen < 0n) {
    throw new Error("Total sen cannot be negative.");
  }

  if (percentages.length === 0) {
    throw new Error("Percentages cannot be empty.");
  }

  if (!percentages.every((percentage) => Number.isInteger(percentage) && percentage >= 0)) {
    throw new Error("Percentages must be non-negative integers.");
  }

  const totalPercentage = percentages.reduce((sum, percentage) => sum + percentage, 0);
  if (totalPercentage !== 100) {
    throw new Error("Percentages must sum to 100.");
  }

  const shares = percentages.map((percentage) => (totalSen * BigInt(percentage)) / 100n);
  const allocated = shares.reduce((sum, share) => sum + share, 0n);
  let remainder = totalSen - allocated;

  for (let index = 0; index < shares.length && remainder > 0n; index += 1) {
    shares[index] += 1n;
    remainder -= 1n;
  }

  return shares;
}

/**
 * Check whether a sen amount is strictly positive.
 *
 * @example
 * isPositiveSen(1n) // true
 * isPositiveSen(0n) // false
 */
export function isPositiveSen(sen: Sen): boolean {
  return sen > 0n;
}

/**
 * Check whether a sen amount is zero or positive.
 *
 * @example
 * isNonNegativeSen(0n) // true
 * isNonNegativeSen(-1n) // false
 */
export function isNonNegativeSen(sen: Sen): boolean {
  return sen >= 0n;
}

/**
 * Sanitize a JS number through sen to eliminate floating-point drift.
 * Use this whenever a raw JS number must be written to a Prisma Decimal column.
 *
 * @example
 * sanitizeMyr(0.1 + 0.2) // 0.30  (not 0.30000000000000004)
 * sanitizeMyr(21.25)      // 21.25
 */
export function sanitizeMyr(amount: number): number {
  return Number(formatSenToMyr(parseMyrToSen(String(amount))));
}
