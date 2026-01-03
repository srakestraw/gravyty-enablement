/**
 * Format duration in minutes to a human-readable string
 * 
 * Formats:
 * - < 60 minutes -> "{m}m" (e.g., 33 -> "33m")
 * - >= 60 and divisible by 60 -> "{h}h" (e.g., 120 -> "2h")
 * - >= 60 and not divisible by 60 -> "{h}h {m}m" (e.g., 90 -> "1h 30m")
 * 
 * @param minutes - Duration in minutes (must be >= 1)
 * @returns Formatted duration string
 */
export function formatDurationMinutes(minutes: number): string {
  if (minutes < 1) {
    throw new Error('Minutes must be at least 1');
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}


