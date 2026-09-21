/**
 * Safe sequential document numbering utility.
 * Avoids race conditions and count() gaps by parsing highest existing sequence.
 */

export function parseNextSequence(
  prefix: string,
  year: number,
  existingNumbers: (string | undefined | null)[],
  padding: number = 4,
  fallbackCount: number = 0,
): string {
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)`);
  let maxSeq = 0;
  let hasMatch = false;

  for (const num of existingNumbers) {
    if (!num) continue;
    const match = num.match(pattern);
    if (match && match[1]) {
      hasMatch = true;
      const seq = parseInt(match[1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = hasMatch ? maxSeq + 1 : Math.max(maxSeq + 1, fallbackCount + 1);
  return `${prefix}-${year}-${String(nextSeq).padStart(padding, '0')}`;
}

export function extractSequenceNumber(referenceNumber: string | undefined | null): number {
  if (!referenceNumber) return 0;
  const parts = referenceNumber.split('-');
  if (parts.length < 3) return 0;
  const lastPart = parts[parts.length - 1];
  const parsed = parseInt(lastPart, 10);
  return isNaN(parsed) ? 0 : parsed;
}
