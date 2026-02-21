"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ChevronUp } from "lucide-react";
import { BADGE_MAPPINGS } from "../../lib/badgeMappings";

const GROUP_LABELS: Record<string, string> = {
  explorer: "Category Explorer Badges",
  specialist: "Category Specialist Badges",
  milestone: "Activity & Milestone Badges",
  community: "Community & Personality Badges",
};

const CATEGORY_LABELS: Record<string, string> = {
  "food-drink": "Food & Drink",
  "beauty-wellness": "Beauty & Wellness",
  "arts-culture": "Arts & Culture",
  "outdoors-adventure": "Outdoors & Adventure",
  "shopping-lifestyle": "Shopping & Lifestyle",
  "family-pets": "Family & Pets",
  "experiences-entertainment": "Experiences & Entertainment",
  "professional-services": "Professional Services",
};

export default function BadgeDefinitionsPage() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const badgesByGroup: Record<string, typeof BADGE_MAPPINGS[string][]> = {};

  Object.values(BADGE_MAPPINGS).forEach((badge) => {
    const group = badge.badgeGroup;
    if (!badgesByGroup[group]) badgesByGroup[group] = [];
    badgesByGroup[group].push(badge);
  });

  // For specialist badges, further group by categoryKey
  const specialistByCategory: Record<string, typeof BADGE_MAPPINGS[string][]> = {};
  if (badgesByGroup.specialist) {
    badgesByGroup.specialist.forEach((badge) => {
      const cat = badge.categoryKey || "other";
      if (!specialistByCategory[cat]) specialistByCategory[cat] = [];
      specialistByCategory[cat].push(badge);
    });
  }

  const groupOrder = ["explorer", "specialist", "milestone", "community"];

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className="min-h-dvh bg-off-white font-urbanist"
      style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm text-charcoal/60 hover:text-charcoal transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-charcoal mb-2">Badge Definitions</h1>
        <p className="text-base text-charcoal/70 mb-8 max-w-2xl">
          Earn badges by exploring businesses, writing reviews, uploading photos, and being an
          active member of the Sayso community. Here are all the badges you can earn.
        </p>

        <div className="space-y-10">
          {groupOrder.map((group) => {
            if (!badgesByGroup[group]) return null;

            return (
              <section key={group}>
                <h2 className="text-lg sm:text-xl font-bold text-charcoal mb-4 border-b border-charcoal/10 pb-2">
                  {GROUP_LABELS[group] || group}
                </h2>

                {group === "specialist" ? (
                  <div className="space-y-6">
                    {Object.entries(specialistByCategory).map(([catKey, badges]) => (
                      <div key={catKey}>
                        <h3 className="text-base font-semibold text-charcoal/80 mb-3">
                          {CATEGORY_LABELS[catKey] || catKey}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {badges.map((badge) => (
                            <BadgeItem key={badge.id} badge={badge} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {badgesByGroup[group].map((badge) => (
                      <BadgeItem key={badge.id} badge={badge} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-navbar-bg hover:bg-navbar-bg/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/20 transition-all duration-300"
          aria-label="Scroll to top"
        >
          <ChevronUp className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

function BadgeItem({ badge }: { badge: typeof BADGE_MAPPINGS[string] }) {
  return (
    <div className="flex flex-col items-center text-center p-3 bg-card-bg border-none rounded-[12px] shadow-sm">
      <div className="w-14 h-14 sm:w-16 sm:h-16 relative mb-2">
        <Image
          src={badge.pngPath}
          alt={badge.name}
          fill
          className="object-contain"
          sizes="64px"
        />
      </div>
      <span className="text-sm font-semibold text-charcoal leading-tight">{badge.name}</span>
      {badge.description && (
        <span className="text-sm text-charcoal/60 mt-0.5 leading-snug">{badge.description}</span>
      )}
    </div>
  );
}
