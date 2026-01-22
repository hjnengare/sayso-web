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
    { name: "Privacy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
    { name: "Contact", href: "/contact" },
    { name: "Support", href: "mailto:info@sayso.com" },
  ];

  return (
    <footer className="bg-charcoal text-off-white rounded-xl mx-2 mb-2 px-3 py-4 sm:px-4 sm:py-3 shadow-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-3">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
          <Logo variant="footer" />
        </Link>

        {/* Links */}
        <nav className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 order-3 md:order-2 w-full md:w-auto">
          {links.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="font-urbanist text-xs sm:text-sm text-off-white/70 hover:text-off-white transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Copyright */}
        <p className="font-urbanist text-xs text-off-white/50 order-2 md:order-3">
          © {mounted ? currentYear : 2025} sayso
        </p>
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
