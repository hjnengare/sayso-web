"use client";

interface SubmitButtonProps {
  disabled: boolean;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function SubmitButton({ disabled, isSubmitting, onSubmit }: SubmitButtonProps) {
  return (
    <div className="pt-4 flex justify-center">
      <div className="w-full">
        <button
          type="submit"
          disabled={disabled}
          onClick={onSubmit}
          style={{ fontFamily: '"Livvic", sans-serif', fontWeight: 600 }}
          className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-sm font-600 py-4 px-4 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </>
          ) : (
            "Create account"
          )}
        </button>
      </div>
    </div>
  );
}
