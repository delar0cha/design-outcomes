/**
 * Format a Date or ISO string for display.
 * Outputs: "Apr 19, 2026"
 */
export function fmtDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Convert a slug to a readable title (fallback if title not available).
 */
export function slugToTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Clamp a number between min and max.
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
