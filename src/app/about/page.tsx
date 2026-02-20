"use client";
import React from "react";
// Import existing design tokens/styles
import "../globals.css";
import { Urbanist } from "next/font/google";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

// Animation utility (simple fade/translate, GPU-friendly)
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div
      style={{
        opacity: 0,
        transform: "translateY(24px)",
        animation: `fadeInUp 0.7s cubic-bezier(.4,0,.2,1) ${delay}s forwards`,
        willChange: "opacity, transform",
      }}
      className="reveal"
    >
      {children}
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className={`${urbanist.className} bg-off-white text-charcoal min-h-screen flex flex-col items-center px-4 sm:px-6 lg:px-0`}>
      <div className="pt-10 flex flex-col items-center space-y-2">
        <img
          src="/logos/logo.png"
          alt="Sayso logo"
          className="h-12 w-auto drop-shadow-sm"
          loading="lazy"
          decoding="async"
        />
        <span
          className="text-2xl font-semibold tracking-tight text-charcoal"
        >
          sayso
        </span>
      </div>
      {/* Hero Section */}
      <section className="w-full max-w-3xl pt-16 pb-10 text-center">
        <Reveal>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">Who We Are</h1>
          <p className="text-lg sm:text-xl text-muted mb-6 max-w-2xl mx-auto">
            Sayso is your trusted guide to discovering the best local businesses, events, and experiences—powered by real community voices.
          </p>
        </Reveal>
      </section>

      {/* Mission */}
      <section className="w-full max-w-2xl mb-12">
        <Reveal delay={0.1}>
          <h2 className="text-2xl font-semibold mb-2">Our Mission</h2>
          <p className="text-base sm:text-lg text-muted">
            To empower people to explore their city with confidence—connecting them to authentic, community-driven reviews and trusted local recommendations.
          </p>
        </Reveal>
      </section>

      {/* Vision */}
      <section className="w-full max-w-2xl mb-12">
        <Reveal delay={0.2}>
          <h2 className="text-2xl font-semibold mb-2">Our Vision</h2>
          <p className="text-base sm:text-lg text-muted">
            A world where every local business thrives on trust, and every user finds real value in shared experiences.
          </p>
        </Reveal>
      </section>

      {/* Why Sayso Exists */}
      <section className="w-full max-w-2xl mb-12">
        <Reveal delay={0.3}>
          <h2 className="text-2xl font-semibold mb-2">Why Sayso Exists</h2>
          <p className="text-base sm:text-lg text-muted">
            We believe local discovery should be transparent, reliable, and shaped by real people—not algorithms or ads. Sayso was created to put authentic voices at the center of every recommendation.
          </p>
        </Reveal>
      </section>

      {/* How It Works */}
      <section className="w-full max-w-2xl mb-12">
        <Reveal delay={0.4}>
          <h2 className="text-2xl font-semibold mb-2">How It Works</h2>
          <ul className="list-disc list-inside text-base sm:text-lg text-muted space-y-2">
            <li>Discover businesses, events, and specials curated by your community</li>
            <li>Read honest, detailed reviews from real users</li>
            <li>Share your own experiences to help others</li>
            <li>Support local businesses and see their impact grow</li>
          </ul>
        </Reveal>
      </section>

      {/* Impact */}
      <section className="w-full max-w-2xl mb-12">
        <Reveal delay={0.5}>
          <h2 className="text-2xl font-semibold mb-2">Our Impact</h2>
          <p className="text-base sm:text-lg text-muted mb-2">
            For users: Find hidden gems, avoid disappointments, and make every outing count.
          </p>
          <p className="text-base sm:text-lg text-muted">
            For businesses: Build trust, grow your reputation, and connect with a loyal local audience.
          </p>
        </Reveal>
      </section>

      {/* Closing CTA */}
      <section className="w-full max-w-2xl mb-20 text-center">
        <Reveal delay={0.6}>
          <h2 className="text-2xl font-semibold mb-4">Join the Sayso Community</h2>
          <p className="text-base sm:text-lg text-muted mb-6">
            Experience local discovery the way it should be—real, trustworthy, and community-powered.
          </p>
          <a
            href="/signup"
            className="inline-block bg-primary text-charcoal/90 font-semibold px-6 py-3 rounded-lg shadow-md hover:bg-primary-dark transition-colors duration-200"
          >
            Get Started
          </a>
        </Reveal>
      </section>

      {/* Keyframes for fadeInUp animation */}
      <style>{`
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}
