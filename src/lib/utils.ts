/**
 * Generate a URL-friendly slug from a title and optional year.
 */
export function slugify(title: string, year?: number): string {
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  if (year) {
    slug += `-${year}`;
  }
  
  return slug;
}

/**
 * Format a number as Sri Lankan Rupees.
 */
export function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString()}`;
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

/**
 * Get relative time string (e.g., "2 hours ago").
 */
export function timeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

/**
 * Extract year from a string like "Avatar 2009" or "Harry Potter (2001)"
 */
export function extractYearFromTitle(title: string): { cleanTitle: string; year: number | undefined } {
  // Match patterns like (2001), 2001 at end of string
  const yearMatch = title.match(/[\s(]*(\d{4})[\s)]*$/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    if (year >= 1900 && year <= 2030) {
      const cleanTitle = title.replace(/[\s(]*\d{4}[\s)]*$/, '').trim();
      return { cleanTitle, year };
    }
  }
  return { cleanTitle: title.trim(), year: undefined };
}
