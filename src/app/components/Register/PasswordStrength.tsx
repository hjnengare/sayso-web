"use client";

interface PasswordStrengthProps {
  password: string;
  strength: {
    score: number;
    feedback: string;
    checks: {
      length: boolean;
    };
    color?: string;
  };
}

export default function PasswordStrength({ password, strength }: PasswordStrengthProps) {
  if (password.length === 0) return null;

  // Show green if minimum length requirement is met
  const isSuccess = strength.checks.length && strength.score >= 2;

  return (
    <div className="h-5 mt-1 flex items-center gap-2">
      <div className="flex-1 flex gap-1" role="progressbar" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={4}>
        {[1, 2, 3, 4].map((level) => {
          let barColor = 'bg-gray-200';
          if (level <= strength.score) {
            if (isSuccess) {
              barColor = level <= 2 ? 'bg-yellow-400' : 'bg-sage';
            } else {
              barColor = 'bg-error-500';
            }
          }
          return (
            <div
              key={level}
              className={`h-1 flex-1 transition-all duration-300 ${barColor}`}
            />
          );
        })}
      </div>
    </div>
  );
}
