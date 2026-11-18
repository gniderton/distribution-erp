/** Computes remaining unconsumed balance for a bank statement entry. */
export function getStatementEntryBalance(entry: any): number {
  if (!entry) return 0;
  if (entry.balance_amount !== undefined && entry.balance_amount !== null) {
    return Math.max(0, Number(entry.balance_amount) || 0);
  }
  if (entry.unreconciled_amount !== undefined && entry.unreconciled_amount !== null) {
    return Math.max(0, Number(entry.unreconciled_amount) || 0);
  }
  const gross = Math.abs(Number(entry.amount || 0));
  const consumed = Number(entry.consumed_amount || 0);
  return Math.max(0, Math.round((gross - consumed) * 100) / 100);
}

/** Formats a bank statement transaction_date consistently in local calendar YYYY-MM-DD. */
export function formatStatementDate(raw?: string | null): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return trimmed.split('T')[0];
}

/** Filters bank statement entries client-side by date, particulars, ref, bank name, or amount. */
export function matchesStatementSearch(entry: any, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const dateStr = formatStatementDate(entry.transaction_date).toLowerCase();
  const particulars = String(entry.particulars || '').toLowerCase();
  const ref = String(entry.bank_ref_id || '').toLowerCase();
  const bank = String(entry.bank_name || '').toLowerCase();
  const amt = String(Math.abs(Number(entry.amount || 0)));
  const bal = String(getStatementEntryBalance(entry));
  return (
    dateStr.includes(q) ||
    particulars.includes(q) ||
    ref.includes(q) ||
    bank.includes(q) ||
    amt.includes(q) ||
    bal.includes(q)
  );
}
