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

  const linkSections = [
    {
      title: "Discover",
      links: [
        { name: "Home", href: "/home" },
        { name: "Explore", href: "/explore" },
        { name: "Trending", href: "/trending" },
        { name: "Events & Specials", href: "/events-specials" },
        { name: "Leaderboard", href: "/leaderboard" },
      ],
    },
    {
      title: "Community",
      links: [
        { name: "Reviews", href: "/discover/reviews" },
        { name: "For You", href: "/for-you" },
        { name: "Saved", href: "/saved" },
        { name: "Messages", href: "/messages" },
      ],
    },
    {
      title: "Business",
      links: [
        { name: "Add Business", href: "/add-business" },
        { name: "Claim Business", href: "/claim-business" },
        { name: "Business Login", href: "/business/login" },
        { name: "Business Register", href: "/business/register" },
      ],
    },
    {
      title: "Company",
      links: [
        { name: "About", href: "/about" },
        { name: "Contact", href: "/contact" },
        { name: "Support", href: "mailto:info@sayso.com" },
      ],
    },
    {
      title: "Legal",
      links: [
        { name: "Privacy", href: "/privacy/sayso%20privacy%20policy%20%26%20terms%20of%20use.pdf" },
        { name: "Terms", href: "/privacy/sayso%20privacy%20policy%20%26%20terms%20of%20use.pdf" },
      ],
    },
  ];

  return (
    <footer className="relative overflow-hidden bg-charcoal text-off-white mt-16 sm:mt-24 lg:mt-32">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-48 w-[520px] -translate-x-1/2 rounded-full bg-sage/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-64 bg-off-white/5 blur-2xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8">
        <div className="border-t border-white/10 py-8 sm:py-10">
          <div className="flex flex-col items-start gap-6">
            {/* Brand */}
            <div className="flex flex-col items-start gap-3 text-left">
              <Link href="/" className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity">
                <Logo variant="footer" />
              </Link>
              <p className="font-urbanist text-sm sm:text-base text-off-white/80 font-semibold text-left max-w-[46ch]">
                Discover trusted local businesses, events, and community favorites.
              </p>
            </div>

            {/* Bottom row */}
            <div className="w-full flex flex-col gap-8">
              <nav aria-label="Footer" className="w-full">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8">
                  {linkSections.map((section) => (
                    <div key={section.title} className="flex flex-col gap-2">
                      <p className="font-urbanist text-xs sm:text-sm uppercase tracking-[0.2em] text-off-white/60 font-bold">
                        {section.title}
                      </p>
                      <ul className="flex flex-col gap-2">
                        {section.links.map((link) => (
                          <li key={link.name}>
                            <Link
                              href={link.href}
                              className="font-urbanist text-sm sm:text-base text-off-white/80 hover:text-off-white transition-colors font-semibold"
                            >
                              {link.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </nav>

              <p className="font-urbanist text-xs sm:text-sm text-off-white/80 font-bold text-center sm:text-right">
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
