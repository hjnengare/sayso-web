// src/components/Footer/Footer.tsx
"use client";

import Link from "next/link";
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import Logo from "../Logo/Logo";
import { useToast } from "../../contexts/ToastContext";

export default function Footer() {
  const [currentYear, setCurrentYear] = useState<number>(2025);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [subscribeMessage, setSubscribeMessage] = useState<string>("");
  const { showToast } = useToast();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    setMounted(true);
  }, []);

  const submitSubscription = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setSubscribeStatus("loading");
    setSubscribeMessage("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source: "footer" }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!res.ok || !json?.ok) {
        setSubscribeStatus("error");
        setSubscribeMessage(json?.message || "Couldn’t sign you up. Try again.");
        return;
      }

      setSubscribeStatus("success");
      setSubscribeMessage("You're in. Watch your inbox.");
      setEmail("");
      showToast("You're subscribed! Welcome aboard.", "success", 5000);

      // Confetti burst from bottom-center
      const duration = 2500;
      const end = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const interval = setInterval(() => {
        const timeLeft = end - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const count = 40 * (timeLeft / duration);
        confetti({ ...defaults, particleCount: count, origin: { x: 0.2 + Math.random() * 0.6, y: 0.9 }, colors: ['#7D9B76', '#E88D67', '#FFFFFF', '#FFD700'] });
      }, 200);
    } catch {
      setSubscribeStatus("error");
      setSubscribeMessage("Couldn’t sign you up. Check your connection.");
    }
  };

  const isValidEmail = (value: string) => {
    const v = value.trim();
    if (!v) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  };


  const linkSections = [
    {
      title: "Discover",
      links: [
        { name: "Home", href: "/home" },
        { name: "Trending", href: "/trending" },
        { name: "Events & Specials", href: "/events-specials" },
        { name: "Leaderboard", href: "/leaderboard" },
      ],
    },
    {
      title: "Community",
      links: [
        { name: "Badges", href: "/badges" },
        { name: "For You", href: "/for-you" },
        { name: "Saved", href: "/saved" },
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
    <footer className="relative overflow-hidden border-t border-charcoal/6 bg-gradient-to-br from-navbar-bg via-navbar-bg/95 to-navbar-bg/90 text-off-white">

      <div className="relative mx-auto w-full max-w-[2000px] px-4 sm:px-6 lg:px-8">
        <div className="border-t border-white/10 py-10 sm:py-12">
          {/* Subscribe */}
          {/* <div className="mb-10 sm:mb-12">
            <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7">
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -top-20 left-10 h-40 w-72 rounded-full bg-off-white/10 blur-3xl" />
                <div className="absolute -bottom-24 right-0 h-44 w-80 rounded-full bg-card-bg/15 blur-3xl" />
              </div>

              <div className="relative flex flex-col gap-4 sm:gap-5">
                <p className="tracking-[0.24em] uppercase text-xs sm:text-sm text-off-white/80 font-semibold">
                  Subscribe to our emails
                </p>

                <form
                  className="w-full"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (subscribeStatus === "loading") return;
                    if (!isValidEmail(email)) {
                      setSubscribeStatus("error");
                      setSubscribeMessage("Enter a valid email address.");
                      return;
                    }
                    submitSubscription();
                  }}
                >
                  <div className="flex items-center gap-2 rounded-full bg-off-white text-charcoal px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.25)] ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-sage/40 transition-[box-shadow,ring]">
                    <label className="sr-only" htmlFor="footer-email">
                      Email address
                    </label>
                    <input
                      id="footer-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (subscribeStatus !== "idle") {
                          setSubscribeStatus("idle");
                          setSubscribeMessage("");
                        }
                      }}
                      className="flex-1 bg-transparent px-3 py-2 text-base sm:text-lg placeholder:text-charcoal/55 outline-none"
                      aria-invalid={subscribeStatus === "error" ? "true" : "false"}
                    />
                    <button
                      type="submit"
                      disabled={subscribeStatus === "loading"}
                      className="shrink-0 rounded-full bg-charcoal px-5 sm:px-7 py-2.5 text-xs sm:text-sm font-bold tracking-[0.16em] uppercase text-off-white transition-colors hover:bg-charcoal/90 disabled:opacity-60 disabled:hover:bg-charcoal"
                    >
                      {subscribeStatus === "loading" ? "Submitting" : "Submit"}
                    </button>
                  </div>

                  <div className="mt-2 min-h-[20px]">
                    {subscribeMessage && (
                      <p
                        className={`text-sm ${
                          subscribeStatus === "success"
                            ? "text-sage"
                            : "text-off-white/80"
                        }`}
                      >
                        {subscribeMessage}
                      </p>
                    )}
                  </div>
                </form>

                <p className="text-xs text-off-white/60">
                  Occasional drops. No spam. Unsubscribe anytime.
                </p>
              </div>
            </div>
          </div> */}

          <div
            className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr_1fr_1fr] gap-10 lg:gap-12 items-start"
          >
            {/* Brand */}
            <div className="flex flex-col items-start gap-4 text-left">
              <Link href="/" className="flex-shrink-0 flex items-center hover:opacity-80 transition-opacity">
                <Logo variant="footer" />
              </Link>
              <p className="font-urbanist text-sm sm:text-base text-off-white/80 font-normal text-left max-w-[46ch]">
                Discover trusted local businesses, events, and community favourites.
              </p>
              <p className="font-urbanist text-sm text-off-white/70 italic text-left">
                Less guessing, more confessing
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
