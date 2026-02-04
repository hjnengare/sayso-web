// src/components/Footer/Footer.tsx
"use client";

import Link from "next/link";
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
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
        { name: "Badges", href: "/badges" },
        { name: "For You", href: "/for-you" },
        { name: "Saved", href: "/saved" },
        { name: "Messages", href: "/dm" },
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
        { name: "Privacy Policy", href: "/privacy" },
        { name: "Terms of Use", href: "/terms" },
        { name: "Badge Definitions", href: "/badges" },
      ],
    },
  ];

  const socialLinks = [
    { name: "Instagram", href: "https://www.instagram.com", Icon: Instagram },
    { name: "Facebook", href: "https://www.facebook.com", Icon: Facebook },
    { name: "X", href: "https://x.com", Icon: Twitter },
    { name: "LinkedIn", href: "https://www.linkedin.com", Icon: Linkedin },
    { name: "YouTube", href: "https://www.youtube.com", Icon: Youtube },
  ];

  const linkColumns = [
    [linkSections[0], linkSections[1]],
    [linkSections[2], linkSections[3]],
    [linkSections[4]],
  ];

  return (
    <footer className="relative overflow-hidden bg-charcoal text-off-white mt-16 sm:mt-24 lg:mt-32">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-48 w-[520px] -translate-x-1/2 rounded-full bg-sage/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-64 bg-off-white/5 blur-2xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8">
        <div className="border-t border-white/10 py-10 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_1fr_1fr] gap-10 lg:gap-12 items-start">
            {/* Brand */}
            <div className="flex flex-col items-start gap-4 text-left">
              <Link href="/" className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity">
                <Logo variant="footer" />
              </Link>
              <p className="font-urbanist text-sm sm:text-base text-off-white/80 font-normal text-left max-w-[46ch]">
                Discover trusted local businesses, events, and community favourites.
              </p>
            </div>

            {/* Link columns */}
            {linkColumns.map((column, columnIndex) => (
              <nav
                key={`footer-column-${columnIndex}`}
                aria-label={`Footer column ${columnIndex + 1}`}
                className="flex flex-col gap-8"
              >
                {column.map((section) => (
                    <div key={section.title} className="flex flex-col gap-2">
                    <p className="font-urbanist text-off-white font-700">
                      {section.title}
                    </p>
                    <ul className="flex flex-col gap-2">
                      {section.links.map((link) => (
                        <li key={link.name}>
                          <Link
                            href={link.href}
                            className="font-urbanist text-sm sm:text-base text-off-white/80 hover:text-off-white transition-colors font-normal"
                          >
                            {link.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            ))}
          </div>

          <div className="mt-12 border-t border-white/10 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-center gap-4">
              <div className="flex items-center justify-center sm:justify-start gap-3">
                {socialLinks.map(({ name, href, Icon }) => (
                  <Link
                    key={name}
                    href={href}
                    aria-label={name}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 text-off-white/80 hover:text-off-white flex items-center justify-center transition-colors"
                  >
                    <Icon className="w-4 h-4" strokeWidth={2} />
                  </Link>
                ))}
              </div>
              <div />
              <p className="font-urbanist text-xs sm:text-sm text-off-white/80 text-center sm:text-right">
                &copy; {mounted ? currentYear : 2026} Sayso Reviews (Pty) Ltd 
              </p>
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
}
