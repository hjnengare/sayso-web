/**
 * Event Lifecycle Service
 *
 * Handles automatic cleanup of past dates from events and removal of fully expired events.
 * This ensures events always show accurate future dates and expired events are removed.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface EventDateInfo {
  id: string;
  ticketmaster_id: string;
  start_date: string | null;
  end_date: string | null;
  raw_data: any;
}

export interface CleanupResult {
  eventsProcessed: number;
  eventsUpdated: number;
  eventsDeleted: number;
  errors: string[];
}

/**
 * Get the start of today in UTC (midnight)
 */
export function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Check if a date string represents a past date
 */
export function isDatePast(dateString: string | null | undefined): boolean {
  if (!dateString) return false;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;

    const today = getTodayUTC();
    // Compare just the date portion (ignore time)
    const dateOnly = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

    return dateOnly < today;
  } catch {
    return false;
  }
}

/**
 * Check if a date string represents today or a future date
 */
export function isDateFutureOrToday(dateString: string | null | undefined): boolean {
  if (!dateString) return false;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;

    const today = getTodayUTC();
    const dateOnly = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

    return dateOnly >= today;
  } catch {
    return false;
  }
}

/**
 * Extract all dates from an event's raw_data (Ticketmaster format)
 * Returns an array of ISO date strings
 */
export function extractAllDatesFromRawData(rawData: any): string[] {
  const dates: string[] = [];

  if (!rawData) return dates;

  // Primary date from dates.start
  if (rawData.dates?.start?.dateTime) {
    dates.push(rawData.dates.start.dateTime);
  } else if (rawData.dates?.start?.localDate) {
    dates.push(rawData.dates.start.localDate + 'T00:00:00Z');
  }

  // Check for additional dates in _embedded.dates or similar structures
  if (rawData._embedded?.dates && Array.isArray(rawData._embedded.dates)) {
    for (const dateObj of rawData._embedded.dates) {
      if (dateObj.start?.dateTime) {
        dates.push(dateObj.start.dateTime);
      } else if (dateObj.start?.localDate) {
        dates.push(dateObj.start.localDate + 'T00:00:00Z');
      }
    }
  }

  // Deduplicate
  return [...new Set(dates)];
}

/**
 * Filter dates to only include future dates (today or later)
 */
export function filterFutureDates(dates: string[]): string[] {
  return dates.filter(isDateFutureOrToday).sort();
}

/**
 * Calculate the date range from an array of dates
 * Returns { startDate, endDate } or null if no valid dates
 */
export function calculateDateRange(dates: string[]): { startDate: string; endDate: string } | null {
  if (!dates || dates.length === 0) return null;

  const sortedDates = [...dates].sort();
  return {
    startDate: sortedDates[0],
    endDate: sortedDates[sortedDates.length - 1],
  };
}

/**
 * Check if an event is fully expired (all dates in the past)
 */
export function isEventFullyExpired(startDate: string | null, endDate: string | null): boolean {
  // If no dates, consider it expired
  if (!startDate && !endDate) return true;

  // Use end date if available, otherwise use start date
  const relevantDate = endDate || startDate;

  return isDatePast(relevantDate);
}

/**
 * Clean up a single event's dates
 * Returns updated dates or null if event should be deleted
 */
export function cleanEventDates(event: {
  start_date: string | null;
  end_date: string | null;
  raw_data?: any;
}): { startDate: string; endDate: string } | null {
  // Extract all dates from the event
  const allDates: string[] = [];

  // Add primary dates
  if (event.start_date) {
    allDates.push(event.start_date);
  }
  if (event.end_date && event.end_date !== event.start_date) {
    allDates.push(event.end_date);
  }

  // Add dates from raw_data if available
  if (event.raw_data) {
    const rawDates = extractAllDatesFromRawData(event.raw_data);
    allDates.push(...rawDates);
  }

  // Filter to only future dates
  const futureDates = filterFutureDates([...new Set(allDates)]);

  // If no future dates, event should be deleted
  if (futureDates.length === 0) {
    return null;
  }

  // Calculate new date range from future dates
  return calculateDateRange(futureDates);
}

/**
 * Run cleanup on all events in the database
 * Updates events with past dates and deletes fully expired events
 */
export async function runEventCleanup(supabase: SupabaseClient): Promise<CleanupResult> {
  const result: CleanupResult = {
    eventsProcessed: 0,
    eventsUpdated: 0,
    eventsDeleted: 0,
    errors: [],
  };

  try {
    // Fetch all events
    const { data: events, error: fetchError } = await supabase
      .from('ticketmaster_events')
      .select('id, ticketmaster_id, start_date, end_date, raw_data');

    if (fetchError) {
      result.errors.push(`Failed to fetch events: ${fetchError.message}`);
      return result;
    }

    if (!events || events.length === 0) {
      return result;
    }

    result.eventsProcessed = events.length;

    const toUpdate: Array<{ id: string; start_date: string; end_date: string }> = [];
    const toDelete: string[] = [];

    for (const event of events) {
      const cleanedDates = cleanEventDates({
        start_date: event.start_date,
        end_date: event.end_date,
        raw_data: event.raw_data,
      });

      if (cleanedDates === null) {
        // Event is fully expired, mark for deletion
        toDelete.push(event.id);
      } else {
        // Check if dates need updating
        const needsUpdate =
          event.start_date !== cleanedDates.startDate ||
          event.end_date !== cleanedDates.endDate;

        if (needsUpdate) {
          toUpdate.push({
            id: event.id,
            start_date: cleanedDates.startDate,
            end_date: cleanedDates.endDate,
          });
        }
      }
    }

    // Batch update events with new date ranges
    for (const update of toUpdate) {
      const { error: updateError } = await supabase
        .from('ticketmaster_events')
        .update({
          start_date: update.start_date,
          end_date: update.end_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.id);

      if (updateError) {
        result.errors.push(`Failed to update event ${update.id}: ${updateError.message}`);
      } else {
        result.eventsUpdated++;
      }
    }

    // Delete fully expired events
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('ticketmaster_events')
        .delete()
        .in('id', toDelete);

      if (deleteError) {
        result.errors.push(`Failed to delete expired events: ${deleteError.message}`);
      } else {
        result.eventsDeleted = toDelete.length;
      }
    }

    return result;
  } catch (error: any) {
    result.errors.push(`Unexpected error during cleanup: ${error.message}`);
    return result;
  }
}

/**
 * Filter events to only include those with future dates
 * Used when fetching events to ensure only valid events are returned
 */
export function filterEventsToFuture<T extends { start_date?: string | null; end_date?: string | null }>(
  events: T[]
): T[] {
  const today = getTodayUTC();

  return events.filter(event => {
    // Use end_date if available, otherwise use start_date
    const relevantDate = event.end_date || event.start_date;

    if (!relevantDate) return false;

    try {
      const date = new Date(relevantDate);
      if (isNaN(date.getTime())) return false;

      const dateOnly = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      return dateOnly >= today;
    } catch {
      return false;
    }
  });
}
