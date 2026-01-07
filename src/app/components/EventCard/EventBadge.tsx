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

interface EventBadgeProps {
  startDate: string;
  endDate?: string;
  eventId?: string;
}

export default function EventBadge({ startDate, endDate, eventId }: EventBadgeProps) {
  return (
    <div className="absolute left-0 top-0 z-20 overflow-hidden" style={{ width: '150px', height: '120px' }}>
      <div 
        className="absolute text-white px-5 py-2.5 shadow-md bg-navbar-bg/90"
        style={{
          transform: 'rotate(-50deg)',
          transformOrigin: 'center',
          left: '-40px',
          top: '20px',
          width: '250px',
          textAlign: 'center',
          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          fontWeight: 600,
          fontSize: '0.75rem',
          letterSpacing: '0.025em',
        }}
      >
        {endDate ? `${startDate} - ${endDate}` : startDate}
      </div>
    </div>
  );
}
