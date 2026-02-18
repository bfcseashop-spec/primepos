/**
 * Normalize invoice/bill numbers for flexible matching.
 * E.g. IAR-0017 matches IAR00017, INV001 matches INV00001 (invoice 1).
 */
export function normalizeBillNo(s: string): string {
  const t = (s || "").trim().replace(/[\s\-_]/g, "");
  const match = t.match(/^([A-Za-z]*)(\d*)$/);
  if (!match) return t.toLowerCase();
  const prefix = (match[1] || "").toLowerCase();
  const num = match[2] ? String(parseInt(match[2], 10) || 0) : "";
  return `${prefix}:${num}`;
}

export function billNoMatches(searchVal: string, billNo: string): boolean {
  if (!searchVal || !billNo) return false;
  if (searchVal.toLowerCase() === billNo.toLowerCase()) return true;
  return normalizeBillNo(searchVal) === normalizeBillNo(billNo);
}
