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
  ];

  return (
    <footer className="bg-charcoal text-off-white rounded-full mx-2 mb-2 px-4 py-3 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
          <Logo variant="footer" />
        </Link>

        {/* Links */}
        <nav className="flex items-center gap-4 sm:gap-6">
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
        <p className="font-urbanist text-xs text-off-white/50">
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
