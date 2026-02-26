// Generate a unique color for each event based on its ID
// This ensures every event badge has a different color
const getUniqueEventColor = (eventId: string): string => {
  // Create a simple hash from the event ID
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    const char = eventId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get a consistent index
  const index = Math.abs(hash) % 12;
  
  // Palette of distinct solid colors for badges (using Tailwind color values)
  const colorPalette = [
    '#FF6B6B',  // 0 - Coral/Red
    '#4ECDC4',  // 1 - Teal
    '#95E1D3',  // 2 - Mint
    '#F38181',  // 3 - Pink
    '#AA96DA',  // 4 - Purple
    '#FCBAD3',  // 5 - Light Pink
    '#FFD93D',  // 6 - Yellow
    '#6BCB77',  // 7 - Green
    '#4D96FF',  // 8 - Blue
    '#FF9F43',  // 9 - Orange
    '#A29BFE',  // 10 - Indigo
    '#FD79A8',  // 11 - Rose
  ];
  
  return colorPalette[index];
};

/**
 * Format date range for display
 * Examples:
 * - "Dec 15" -> "Dec 15"
 * - "Dec 15" + "Dec 22" -> "Dec 15-22"
 * - "Dec 15" + "Jan 5" -> "Dec 15 - Jan 5"
 * - "Every Tue" -> "Every Tue"
 * - "Daily 5-7pm" -> "Daily 5-7pm"
 */
const formatDateRange = (startDate: string, endDate?: string): string => {
  // Don't format if it's already a recurring pattern
  if (startDate.includes('Every') || startDate.includes('Daily') || startDate.includes('-')) {
    return startDate;
  }

  if (!endDate) {
    return startDate;
  }

  // For multi-day events, highlight when it ends
  if (!endDate.includes('Every') && !endDate.includes('Daily')) {
    return `Ends ${endDate}`;
  }

  // Don't format if end date is also a pattern
  if (endDate.includes('Every') || endDate.includes('Daily') || endDate.includes('-')) {
    return `${startDate} - ${endDate}`;
  }

  // Both are dates, try to format nicely
  // If start and end have the same month prefix, just show day range
  const startMonth = startDate.split(' ')[0]; // e.g., "Dec"
  const endMonth = endDate.split(' ')[0]; // e.g., "Dec"
  
  if (startMonth === endMonth) {
    // Same month: "Dec 15-22"
    const startDay = startDate.split(' ')[1]; // e.g., "15"
    const endDay = endDate.split(' ')[1]; // e.g., "22"
    return `${startMonth} ${startDay}-${endDay}`;
  } else {
    // Different months: "Dec 15 - Jan 5"
    return `${startDate} - ${endDate}`;
  }
};

interface EventBadgeProps {
  startDate: string;
  endDate?: string;
  startDateISO?: string;
  endDateISO?: string;
  occurrences?: Array<{ startDate: string; endDate?: string; bookingUrl?: string }>;
  eventId?: string;
  position?: "corner" | "middle";
}

const EN_DASH = '–';

const formatCompact = (start: Date, end?: Date): string => {
  const dayFormatter = new Intl.DateTimeFormat('en-US', { day: 'numeric' });
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });

  if (!end || (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate())) {
    return `${dayFormatter.format(start)} ${monthFormatter.format(start)}`;
  }

  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${dayFormatter.format(start)}${EN_DASH}${dayFormatter.format(end)} ${monthFormatter.format(start)}`;
  }
  return `${dayFormatter.format(start)} ${monthFormatter.format(start)}${EN_DASH}${dayFormatter.format(end)} ${monthFormatter.format(end)}`;
};

const tryParse = (value?: string): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const parseFormatted = (value?: string): { day: string | null; month: string | null } => {
  if (!value) return { day: null, month: null };
  const parts = value.split(' ');
  if (parts.length < 2) return { day: null, month: null };
  // Expect format like "Dec 15"
  const month = parts[0];
  const day = parts[1];
  return { day, month };
};

const formatFallbackCompact = (start?: string, end?: string): string => {
  // If recurring patterns, return the original string
  if (start && (start.includes('Every') || start.includes('Daily'))) return start;
  if (!start) return '';

  const s = parseFormatted(start);
  const e = parseFormatted(end);

  if (!end || !e.day || !e.month || (s.day === e.day && s.month === e.month)) {
    return `${s.day} ${s.month}`;
  }

  if (s.month === e.month) {
    return `${s.day}${EN_DASH}${e.day} ${s.month}`;
  }
  return `${s.day} ${s.month}${EN_DASH}${e.day} ${e.month}`;
};

export default function EventBadge({
  startDate,
  endDate,
  startDateISO,
  endDateISO,
  occurrences,
  eventId,
  position = "corner",
}: EventBadgeProps) {
  // Determine earliest and latest using occurrences or ISO
  let earliest: string | undefined = startDateISO;
  let latest: string | undefined = endDateISO;

  if (occurrences && occurrences.length > 0) {
    const starts = occurrences.map(o => o.startDate).filter(Boolean).sort();
    const ends = occurrences.map(o => o.endDate || o.startDate).filter(Boolean).sort();
    earliest = starts[0] || startDateISO;
    latest = ends[ends.length - 1] || endDateISO;
  }

  const startParsed = tryParse(earliest);
  const endParsed = tryParse(latest);
  const dateText = startParsed ? formatCompact(startParsed, endParsed || undefined) : formatFallbackCompact(startDate, endDate);

  if (position === "middle") {
    return (
      <div className="absolute left-1/2 bottom-0 z-20 -translate-x-1/2 translate-y-1/2">
        <div
          className="inline-flex items-center justify-center rounded-full bg-coral px-5 py-2.5 text-white shadow-md"
          style={{
            minWidth: "160px",
            textAlign: "center",
            fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: "0.015em",
            lineHeight: 1,
          }}
        >
          {dateText}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute -left-1 -top-1 z-20 overflow-hidden" style={{ width: '150px', height: '120px' }}>
      <div
        className="absolute text-white px-5 py-2.5 shadow-md bg-navbar-bg/90"
        style={{
          transform: 'rotate(-50deg)',
          transformOrigin: 'center',
          left: '-40px',
          top: '22px',
          width: '250px',
          textAlign: 'center',
          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          fontWeight: 600,
          fontSize: '0.75rem',
          letterSpacing: '0.025em',
        }}
      >
        {dateText}
      </div>
    </div>
  );
}
