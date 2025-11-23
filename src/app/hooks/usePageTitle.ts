/**
 * Hook to dynamically update page title for client components
 * Format: SAYSO (Page Name) | Description
 */

import { useEffect } from 'react';
import { generatePageTitle, PageTitles } from '../lib/utils/pageTitle';

/**
 * Update the browser page title dynamically
 * Format: SAYSO (Page Name) | Description
 * 
 * @param pageName - The page name (e.g., "Home", "Profile", "Business Name")
 * @param description - The page description (optional)
 * 
 * @example
 * // "SAYSO (Home) | Discover trusted local gems near you"
 * usePageTitle("Home", "Discover trusted local gems near you")
 * 
 * @example
 * // "SAYSO (The Green Table) | Read reviews and see photos"
 * usePageTitle("The Green Table", "Read reviews and see photos")
 * 
 * @example
 * // Use predefined titles
 * usePageTitle(PageTitles.home)
 */
export function usePageTitle(
  pageName: string,
  description?: string
): void {
  useEffect(() => {
    // If title already includes "SAYSO", use as-is, otherwise format it
    const formattedTitle = pageName.includes('SAYSO') || pageName.includes('sayso')
      ? pageName
      : generatePageTitle(pageName, description);

    document.title = formattedTitle;

    // Cleanup: restore default title on unmount (optional)
    return () => {
      document.title = PageTitles.home;
    };
  }, [pageName, description]);
}

/**
 * Convenience hook for using predefined page titles
 */
export function usePredefinedPageTitle(titleKey: keyof typeof PageTitles): void {
  useEffect(() => {
    document.title = PageTitles[titleKey];
    
    return () => {
      document.title = PageTitles.home;
    };
  }, [titleKey]);
}

