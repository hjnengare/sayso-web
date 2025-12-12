interface EventBadgeProps {
  startDate: string;
  endDate?: string;
}

export default function EventBadge({ startDate, endDate }: EventBadgeProps) {
  return (
    <div className="absolute left-0 top-0 z-20 overflow-hidden" style={{ width: '150px', height: '120px' }}>
      <div 
        className="absolute bg-coral text-white px-5 py-2.5 shadow-md"
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
