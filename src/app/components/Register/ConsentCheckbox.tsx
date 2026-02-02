"use client";

import Link from 'next/link';

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function ConsentCheckbox({ checked, onChange }: ConsentCheckboxProps) {
  return (
    <div className="pt-2">
      <label className="flex items-start gap-3 text-sm sm:text-xs text-charcoal/70 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-4 h-4 border-gray-300 text-sage focus:ring-sage/30 focus:ring-offset-0"
        />
        <span className="flex-1 leading-relaxed">
          I agree to the{" "}
          <Link href="/terms" className="underline text-sage hover:text-coral transition-colors">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline text-sage hover:text-coral transition-colors">
            Privacy Policy
          </Link>
        </span>
      </label>
    </div>
  );
}

