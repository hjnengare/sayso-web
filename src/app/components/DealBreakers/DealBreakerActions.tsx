"use client";

interface DealBreakerActionsProps {
  canProceed: boolean;
  isNavigating: boolean;
  selectedCount: number;
  onComplete: () => void;
}

export default function DealBreakerActions({ 
  canProceed, 
  isNavigating, 
  selectedCount, 
  onComplete
}: DealBreakerActionsProps) {
  const sfPro = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 600,
  };

  return (
    <>
      <div className="pt-2">
        <button
          className={`w-full text-sm font-600 py-4 px-4 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press ${
            canProceed
              ? 'bg-gradient-to-r from-sage to-sage/80 text-white hover:from-sage/90 hover:to-sage'
              : 'bg-charcoal/10 text-charcoal/40 cursor-not-allowed'
          }`}
          onClick={onComplete}
          disabled={!canProceed}
          style={sfPro}
        >
          {isNavigating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Completing...
            </>
          ) : (
            `Complete Setup ${selectedCount > 0 ? `(${selectedCount} selected)` : ''}`
          )}
        </button>
      </div>
    </>
  );
}
