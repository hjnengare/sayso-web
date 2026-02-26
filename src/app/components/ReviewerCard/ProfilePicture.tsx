import Image from 'next/image';
import React, { useState } from 'react';
import { User, Trophy, CheckCircle, MapPin } from 'lucide-react';

interface ProfilePictureProps {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  badge?: "top" | "verified" | "local";
}

export default function ProfilePicture({
  src,
  alt,
  size = "md",
  badge
}: ProfilePictureProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10"
  };

  const getSizeNumber = (size: keyof typeof sizeClasses): number => {
    const sizeMap = { sm: 28, md: 32, lg: 40 };
    return sizeMap[size];
  };

  const getBadgeIcon = (badgeType: string) => {
    switch (badgeType) {
      case "top":
        return Trophy;
      case "verified":
        return CheckCircle;
      case "local":
        return MapPin;
      default:
        return User;
    }
  };

  // Generate a unique color for each badge based on alt (user identifier)
  const getUniqueBadgeColor = (userIdentifier: string, badgeType: string): string => {
    // Create a simple hash from the user identifier and badge type
    const combined = `${userIdentifier}-${badgeType}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use absolute value and modulo to get a consistent index
    const index = Math.abs(hash) % 12;
    
    // Palette of distinct colors for variety
    const colorPalette = [
      'from-coral/20 to-coral/10',           // 0 - Coral
      'from-sage/20 to-sage/10',             // 1 - Sage
      'from-purple-400/20 to-purple-400/10', // 2 - Purple
      'from-blue-400/20 to-blue-400/10',     // 3 - Blue
      'from-pink-400/20 to-pink-400/10',     // 4 - Pink
      'from-yellow-400/20 to-yellow-400/10',  // 5 - Yellow
      'from-indigo-400/20 to-indigo-400/10', // 6 - Indigo
      'from-teal-400/20 to-teal-400/10',     // 7 - Teal
      'from-orange-400/20 to-orange-400/10', // 8 - Orange
      'from-rose-400/20 to-rose-400/10',     // 9 - Rose
      'from-cyan-400/20 to-cyan-400/10',     // 10 - Cyan
      'from-emerald-400/20 to-emerald-400/10', // 11 - Emerald
    ];
    
    return colorPalette[index];
  };

  // If no src provided or error occurred, show placeholder
  if (!src || src.trim() === '' || imgError) {
    return (
      <div className="relative inline-block">
        <div className={`${sizeClasses[size]} rounded-full bg-card-bg/10 flex items-center justify-center border-2 border-white ring-2 ring-white/50`}>
          <User
            className={`${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-sage/70`}
          />
        </div>
        {badge && (
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br ${getUniqueBadgeColor(alt, badge)} flex items-center justify-center  `}>
            {React.createElement(getBadgeIcon(badge), {
              className: `w-2.5 h-2.5 text-charcoal/70`,
              strokeWidth: 2.5
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <Image
        src={src}
        alt={alt}
        width={getSizeNumber(size)}
        height={getSizeNumber(size)}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white`}
        unoptimized={src.includes('dicebear.com')}
        onError={() => setImgError(true)}
      />

      {badge && (
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br ${getUniqueBadgeColor(alt, badge)} flex items-center justify-center  `}>
          {React.createElement(getBadgeIcon(badge), {
            className: `w-2.5 h-2.5 text-charcoal/70`,
            strokeWidth: 2.5
          })}
        </div>
      )}
    </div>
  );
}
