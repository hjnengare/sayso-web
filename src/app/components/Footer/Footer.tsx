// src/components/Footer/Footer.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Logo from "../Logo/Logo";

export default function Footer() {
  // Use useState and useEffect to set year only on client to avoid hydration mismatch
  const [currentYear, setCurrentYear] = useState<number>(2025);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const footerLinks = {
    company: [
      { name: "About", href: "/about" }
    ],
    support: [
      { name: "Help Center", href: "/help" },
      { name: "Safety", href: "/safety" },
      { name: "Contact", href: "/contact" }
    ],
    legal: [
      { name: "Privacy", href: "/privacy" },
      { name: "Terms", href: "/terms" },
      { name: "Cookies", href: "/cookies" },
      { name: "Accessibility", href: "/accessibility" }
    ]
  };


  return (
    <footer className="relative overflow-hidden pb-safe-area-bottom bg-gradient-to-b from-charcoal via-charcoal to-charcoal/95 text-off-white rounded-[20px] p-4 m-4 shadow-md">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-5 rounded-[20px] overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-sage rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-coral rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02] rounded-[20px]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />
   
      <div className="relative z-10 mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 md:pt-20">
        {/* Main footer content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 md:gap-12 mb-10 md:mb-16">
          {/* Brand section */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Link href="/" className="inline-block group">
                <div className="mb-6 group-hover:scale-105 transition-all duration-300">
                  <Logo variant="footer" />
                </div>
              </Link>
              <p className="font-urbanist text-sm sm:text-base text-off-white/80 leading-relaxed max-w-sm">
                Discover trusted local businesses and authentic experiences in your community.
              </p>
            </motion.div>
          </div>

          {/* Links sections */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              {/* Company */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <h3 className="font-urbanist text-base sm:text-lg font-semibold text-off-white mb-5 relative inline-block">
                  Company
                </h3>
                <ul className="space-y-3.5">
                  {footerLinks.company.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="font-urbanist text-sm sm:text-base text-off-white/70 hover:text-off-white transition-all duration-300 group inline-block"
                      >
                        <span className="relative">
                          {link.name}
                          <span className="absolute inset-x-0 -bottom-1 h-px bg-sage scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Support */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <h3 className="font-urbanist text-base sm:text-lg font-semibold text-off-white mb-5 relative inline-block">
                  Support
                </h3>
                <ul className="space-y-3.5">
                  {footerLinks.support.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="font-urbanist text-sm sm:text-base text-off-white/70 hover:text-off-white transition-all duration-300 group inline-block"
                      >
                        <span className="relative">
                          {link.name}
                          <span className="absolute inset-x-0 -bottom-1 h-px bg-sage scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Legal */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <h3 className="font-urbanist text-base sm:text-lg font-semibold text-off-white mb-5 relative inline-block">
                  Legal
                </h3>
                <ul className="space-y-3.5">
                  {footerLinks.legal.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="font-urbanist text-sm sm:text-base text-off-white/70 hover:text-off-white transition-all duration-300 group inline-block"
                      >
                        <span className="relative">
                          {link.name}
                          <span className="absolute inset-x-0 -bottom-1 h-px bg-sage scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="pt-8 md:pt-10 border-t border-off-white/10"
        >
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-between space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 text-center md:text-left">
              <p className="font-urbanist text-xs sm:text-sm text-off-white/70">
                © {currentYear} sayso. All rights reserved.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
       {/* ✅ SF Pro font setup */}
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
