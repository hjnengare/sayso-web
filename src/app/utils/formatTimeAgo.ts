import { formatDistanceToNow } from 'date-fns';

/**
 * Format a timestamp to a human-readable "time ago" string
 * @param timestamp - ISO string or Date object
 * @returns Formatted string like "2 minutes ago", "1 hour ago", etc.
 */
export function formatTimeAgo(timestamp: string | Date): string {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const formatted = formatDistanceToNow(date, { addSuffix: false });
    
    // Convert "about X" to just "X" for cleaner display
    return formatted.replace(/^about /, '').replace(/^less than /, '');
  } catch (error) {
    console.error('Error formatting time ago:', error);
    return 'Recently';
  }
}

