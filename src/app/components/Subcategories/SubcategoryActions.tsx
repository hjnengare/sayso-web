"use client";

interface SubcategoryActionsProps {
  canProceed: boolean;
  isNavigating: boolean;
  isLoading: boolean;
  selectedCount: number;
  onContinue: () => void;
}

export default function SubcategoryActions({ 
  canProceed, 
  isNavigating, 
  isLoading, 
  selectedCount, 
  onContinue
}: SubcategoryActionsProps) {
  const sfPro = {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    fontWeight: 600,
  };

  return (
    <>
      <div className="pt-6">
        <button
          className={`w-full text-sm font-600 py-4 px-4 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press shadow-md ${
            canProceed
              ? 'bg-gradient-to-r from-coral to-coral/80 text-white hover:from-coral/90 hover:to-coral'
              : 'bg-charcoal/10 text-charcoal/40 cursor-not-allowed'
          }`}
          onClick={onContinue}
          disabled={!canProceed}
          style={sfPro}
        >
          {(isLoading || isNavigating) ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Continuing...
            </>
          ) : (
            `Continue ${selectedCount > 0 ? `(${selectedCount} selected)` : ''}`
          )}
        </button>
      </div>
    </>
  );
}
