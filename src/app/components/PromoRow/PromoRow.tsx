"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { IoArrowForward } from "react-icons/io5";

interface PromoCard {
  title: string;
  subtitle: string;
  imageUrl: string;
  href: string;
  cta: string;
  gradient: string;
}

const PROMO_CARDS: PromoCard[] = [
  {
    title: "Trending Reviews",
    subtitle: "See what's hot right now",
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop&auto=format",
    href: "/trending",
    cta: "Read Reviews",
    gradient: "from-coral/10 to-coral/5",
  },
  {
    title: "New This Week",
    subtitle: "Fresh picks for you",
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop&auto=format",
    href: "/discover/reviews",
    cta: "Discover Now",
    gradient: "from-sage/10 to-sage/5",
  },
  {
    title: "Top Rated",
    subtitle: "Community favourites",
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&auto=format",
    href: "/top-rated",
    cta: "View All",
    gradient: "from-charcoal/5 to-charcoal/3",
  },
];

function PromoRow() {
  return (
    <section
      className="py-1 sm:py-2 bg-off-white  relative"
      aria-label="promotional highlights"
      data-section
    >
      {/* Subtle background decoration */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-gradient-to-br from-sage/20 to-transparent rounded-full blur-lg" />
        <div className="absolute bottom-1/4 right-1/3 w-32 h-32 bg-gradient-to-br from-coral/15 to-transparent rounded-full blur-lg" />
      </div>

      <div className="container mx-auto max-w-[1300px] px-0 md:px-4 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {PROMO_CARDS.map((card, index) => (
            <Link
              key={index}
              href={card.href}
              className="group relative h-64 sm:h-80 shadow-2 rounded-6 overflow-hidden transition-all duration-300 hover:shadow-1 hover:-translate-y-1"
            >
              {/* Background Image */}
              <Image
                src={card.imageUrl}
                alt={card.title}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                priority={index === 0}
                loading={index === 0 ? "eager" : "lazy"}
                quality={80}
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10 transition-opacity duration-300 group-hover:opacity-80" />

              {/* Glassy Overlay */}
              <div className="absolute inset-0 backdrop-blur-[0.5px] bg-off-white  /3 transition-all duration-300 group-hover:backdrop-blur-0 group-hover:bg-off-white  /0" />

              {/* Silver Shine Effect on Hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              </div>

              {/* Content */}
              <div className="relative h-full p-6 flex flex-col justify-between z-10">
                <div>
                  <h3 className="font-urbanist text-lg sm:text-lg font-800 text-white mb-2">
                    {card.title}
                  </h3>
                  <p className="font-urbanist text-sm sm:text-base text-white/90">
                    {card.subtitle}
                  </p>
                </div>

                {/* CTA */}
                <div className="flex items-center justify-between">
                  <span className="font-urbanist text-sm sm:text-base font-700 text-white/90 transition-colors duration-300 group-hover:text-white">
                    {card.cta}
                  </span>
                  <IoArrowForward className="text-white/90 text-lg transition-all duration-300 group-hover:text-white group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default memo(PromoRow);
