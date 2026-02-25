"use client";

import { useId, type ReactNode } from "react";

interface ProfileBadgeRibbonProps {
  children?: ReactNode;
  className?: string;
  label?: string;
}

export function ProfileBadgeRibbon({ children, className, label }: ProfileBadgeRibbonProps) {
  const uid = useId().replace(/:/g, "");
  const ids = {
    body: `${uid}-body`,
    tailL: `${uid}-tail-l`,
    tailR: `${uid}-tail-r`,
    foldL: `${uid}-fold-l`,
    foldR: `${uid}-fold-r`,
    sheen: `${uid}-sheen`,
    gloss: `${uid}-gloss`,
    shadow: `${uid}-shadow`,
  };

  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      className={["relative w-full select-none", className].filter(Boolean).join(" ")}
    >
      <svg
        viewBox="0 0 320 130"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={ids.body} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#9a6f1f" />
            <stop offset="18%" stopColor="#b88a2e" />
            <stop offset="50%" stopColor="#f3e6bf" />
            <stop offset="82%" stopColor="#b88a2e" />
            <stop offset="100%" stopColor="#9a6f1f" />
          </linearGradient>

          <linearGradient id={ids.tailL} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#7d5816" />
            <stop offset="55%" stopColor="#c49738" />
            <stop offset="100%" stopColor="#a27422" />
          </linearGradient>

          <linearGradient id={ids.tailR} x1="100%" y1="50%" x2="0%" y2="50%">
            <stop offset="0%" stopColor="#7d5816" />
            <stop offset="55%" stopColor="#c49738" />
            <stop offset="100%" stopColor="#a27422" />
          </linearGradient>

          <linearGradient id={ids.foldL} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5c3f0d" />
            <stop offset="100%" stopColor="#8b611a" />
          </linearGradient>

          <linearGradient id={ids.foldR} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5c3f0d" />
            <stop offset="100%" stopColor="#8b611a" />
          </linearGradient>

          <radialGradient id={ids.sheen} cx="50%" cy="42%" r="56%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          <linearGradient id={ids.gloss} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
            <stop offset="38%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
          </linearGradient>

          <filter id={ids.shadow} x="-7%" y="-30%" width="114%" height="180%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.8" result="blur" />
            <feOffset in="blur" dy="4" result="offset" />
            <feFlood floodColor="#000000" floodOpacity="0.22" result="color" />
            <feComposite in="color" in2="offset" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter={`url(#${ids.shadow})`}>
          {/* Tails */}
          <polygon points="53,24 32,24 9,65 32,106 53,106" fill={`url(#${ids.tailL})`} />
          <polygon points="267,24 288,24 311,65 288,106 267,106" fill={`url(#${ids.tailR})`} />

          {/* Center band */}
          <rect x="53" y="24" width="214" height="82" fill={`url(#${ids.body})`} />

          {/* Folded edges */}
          <polygon points="53,24 32,24 43,40 53,40" fill={`url(#${ids.foldL})`} />
          <polygon points="53,106 32,106 43,90 53,90" fill={`url(#${ids.foldL})`} />
          <polygon points="267,24 288,24 277,40 267,40" fill={`url(#${ids.foldR})`} />
          <polygon points="267,106 288,106 277,90 267,90" fill={`url(#${ids.foldR})`} />

          {/* Light and bevel overlays */}
          <rect x="53" y="24" width="214" height="82" fill={`url(#${ids.sheen})`} />
          <rect x="53" y="24" width="214" height="82" fill={`url(#${ids.gloss})`} />

          {/* Edge definition */}
          <line x1="53" y1="24" x2="53" y2="106" stroke="rgba(0,0,0,0.16)" strokeWidth="1" />
          <line x1="267" y1="24" x2="267" y2="106" stroke="rgba(0,0,0,0.16)" strokeWidth="1" />
          <line x1="53" y1="25" x2="267" y2="25" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
        </g>
      </svg>

      {children ? (
        <div className="relative aspect-[320/130] w-full">
          <div className="absolute inset-y-[18%] left-[15%] right-[15%] flex items-center justify-center">
            {children}
          </div>
        </div>
      ) : (
        <div className="aspect-[320/130] w-full" />
      )}
    </div>
  );
}
