"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useEffect } from "react";

interface OptimizedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  [key: string]: any;
}

export default function OptimizedLink({ 
  href, 
  children, 
  className, 
  prefetch = true,
  onClick,
  ...props 
}: OptimizedLinkProps) {
  const router = useRouter();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Prefetch on hover with debouncing
  const handleMouseEnter = useCallback(() => {
    if (!prefetch) return;
    
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Prefetch after a short delay
    hoverTimeoutRef.current = setTimeout(() => {
      router.prefetch(href);
    }, 100);
  }, [href, router, prefetch]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
      // If onClick prevents default, don't navigate
      if (e.defaultPrevented) {
        return;
      }
    }
    
    // Add a small delay for better UX
    e.preventDefault();
    setTimeout(() => {
      router.push(href);
    }, 50);
  }, [href, router, onClick]);

  return (
    <Link
      ref={linkRef}
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
}
