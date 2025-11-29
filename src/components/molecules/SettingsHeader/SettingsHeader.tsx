'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'react-feather';

export interface SettingsHeaderProps {
  title: string;
  backHref: string;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  title,
  backHref,
}) => {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-navbar-bg backdrop-blur-sm border-b border-charcoal/10"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      }}
    >
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 md:px-8 pt-2 pb-4">
        <div className="flex items-center justify-between">
          <Link href={backHref} className="group flex items-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20 hover:border-white/40 mr-3 sm:mr-4">
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-white transition-colors duration-300" />
            </div>
            <h3 className="font-urbanist text-base sm:text-xl font-700 text-white transition-all duration-300 group-hover:text-white/80 relative">
              {title}
            </h3>
          </Link>
        </div>
      </div>
    </header>
  );
};

