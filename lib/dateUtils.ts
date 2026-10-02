/**
 * Client-safe date and timestamp utility functions.
 * Does not import any server-only modules (mongoose, mongodb, etc.).
 */

export function getRecordExactDate(r: { date: Date | string; createdAt?: Date | string }): Date {
  const d = new Date(r.date);
  const c = r.createdAt ? new Date(r.createdAt) : d;
  if (d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0) {
    return d;
  }
  const combined = new Date(d);
  combined.setHours(c.getHours(), c.getMinutes(), c.getSeconds(), c.getMilliseconds());
  return combined;
}

export function getRecordExactTimestamp(r: { date: Date | string; createdAt?: Date | string }): number {
  return getRecordExactDate(r).getTime();
}
