"use client";

import { ArrowLeft } from "react-feather";
import { useRouter } from "next/navigation";

interface OnboardingBackButtonProps {
  href?: string;
  className?: string;
  label?: string;
}

export default function OnboardingBackButton({
  href,
  className = "",
  label = "Back",
}: OnboardingBackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full
        text-white hover:text-white
        bg-navbar-bg/90 hover:bg-navbar-bg
        transition-all duration-200
        font-medium text-sm
        ${className}
      `}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}
