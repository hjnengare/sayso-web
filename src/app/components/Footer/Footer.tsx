// src/components/Footer/Footer.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Logo from "../Logo/Logo";

export default function Footer() {
  const [currentYear, setCurrentYear] = useState<number>(2025);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    setMounted(true);
  }, []);

  const links = [
    { name: "About", href: "/about" },
    { name: "Privacy", href: "/privacy/sayso%20privacy%20policy%20%26%20terms%20of%20use.pdf" },
    { name: "Terms", href: "/privacy/sayso%20privacy%20policy%20%26%20terms%20of%20use.pdf" },
    { name: "Contact", href: "/contact" },
    { name: "Support", href: "mailto:info@sayso.com" },
  ];

  return (
    <footer className="relative overflow-hidden bg-charcoal text-off-white rounded-[20px] sm:rounded-[20px] mx-2 md:mb-4 md:mt-20">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-48 w-[520px] -translate-x-1/2 rounded-full bg-sage/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-64 bg-off-white/5 blur-2xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8">
        <div className="border-t border-white/10 py-8 sm:py-10">
          <div className="flex flex-col items-start gap-6">
            {/* Brand */}
            <div className="flex flex-col items-start gap-4 text-left">
              <Link href="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
                <Logo variant="footer" />
              </Link>
              <p className="font-urbanist text-xs sm:text-sm text-off-white/70 text-left">
                Discover trusted local businesses, events, and community favorites.
              </p>
            </div>

            {/* Bottom row */}
            <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <nav aria-label="Footer" className="w-full sm:w-auto">
                <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-center sm:justify-start">
                  {links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="font-urbanist text-xs sm:text-sm text-off-white/70 hover:text-off-white transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <p className="font-urbanist text-xs sm:text-sm text-off-white/80 font-semibold text-center sm:text-right">
                &copy; {mounted ? currentYear : 2025} sayso
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .font-urbanist {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
        }
      `}</style>
    </footer>
  );
}

