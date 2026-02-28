/**
 * Client-side .ics (iCalendar) file generator.
 * No dependencies — works in all modern browsers.
 */

interface ICSEvent {
  id: string;
  title: string;
  startDateISO?: string;
  endDateISO?: string;
  location?: string;
  description?: string;
  url?: string;
}

function fmtICS(iso: string): string {
  // Convert ISO 8601 → YYYYMMDDTHHMMSSZ
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace(/Z$/, 'Z');
}

function escapeICS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function downloadICS(event: ICSEvent): void {
  const now = fmtICS(new Date().toISOString());
  const start = event.startDateISO
    ? fmtICS(new Date(event.startDateISO).toISOString())
    : now;
  const end = event.endDateISO
    ? fmtICS(new Date(event.endDateISO).toISOString())
    : fmtICS(new Date(+new Date(event.startDateISO || new Date()) + 2 * 3_600_000).toISOString());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//sayso//sayso Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@sayso.app`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(event.title)}`,
  ];

  if (event.location) lines.push(`LOCATION:${escapeICS(event.location)}`);
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICS(event.description.slice(0, 500))}`);
  }
  if (event.url) lines.push(`URL:${event.url}`);

  lines.push('END:VEVENT', 'END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const filename = `${event.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 60)}.ics`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
