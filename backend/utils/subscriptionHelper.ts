/**
 * Calculate new subscription expiry date.
 * If currently active and not expired → extend from current expiry.
 * If expired or inactive → start from now.
 */
export function calculateNewExpiry(currentExpiresAt: Date | null): {
  periodStart: Date;
  periodEnd: Date;
} {
  const now = new Date();
  const base =
    currentExpiresAt && new Date(currentExpiresAt) > now
      ? new Date(currentExpiresAt)
      : now;

  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + 30); // 30-day subscription period

  return { periodStart: base, periodEnd: newExpiry };
}
