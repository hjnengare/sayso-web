"use client";

interface MobileMenuToggleIconProps {
  isOpen: boolean;
  className?: string;
}

export default function MobileMenuToggleIcon({
  isOpen,
  className = "",
}: MobileMenuToggleIconProps) {
  return (
    <span className={`relative block h-4 w-7 ${className}`.trim()} aria-hidden="true">
      <span
        className={`absolute left-0 top-1/2 block h-[1px] w-7 rounded-full bg-current transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
          isOpen ? "translate-y-0 rotate-45" : "-translate-y-[4px] rotate-0"
        }`}
      />
      <span
        className={`absolute left-0 top-1/2 block h-[1px] w-7 rounded-full bg-current transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
          isOpen ? "translate-y-0 -rotate-45" : "translate-y-[4px] rotate-0"
        }`}
      />
    </span>
  );
}
