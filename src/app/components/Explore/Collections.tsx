"use client";

import Link from "next/link";
import { ArrowRight } from "react-feather";
import { Laptop, Heart, DollarSign, Moon } from "lucide-react";
import { Fontdiner_Swanky } from "next/font/google";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// Map collection IDs to Lucide React icons
const COLLECTION_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'remote-work': Laptop,
  'date-spots': Heart,
  'budget-eats': DollarSign,
  'late-night': Moon,
};

// Editorial collections - can be made dynamic/curated later
const COLLECTIONS = [
  {
    id: 'remote-work',
    title: 'Best places to work remotely',
    description: 'Quiet cafes and co-working spaces',
    count: 12
  },
  {
    id: 'date-spots',
    title: 'Quiet date spots',
    description: 'Romantic and intimate venues',
    count: 8
  },
  {
    id: 'budget-eats',
    title: 'Budget-friendly eats',
    description: 'Great food without breaking the bank',
    count: 15
  },
  {
    id: 'late-night',
    title: 'Late-night food',
    description: 'Open after midnight',
    count: 10
  },
];

interface CollectionsProps {
  onCollectionClick?: (collectionId: string) => void;
}

export default function Collections({ onCollectionClick }: CollectionsProps) {
  const handleClick = (collectionId: string, e: React.MouseEvent) => {
    if (onCollectionClick) {
      e.preventDefault();
      onCollectionClick(collectionId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <WavyTypedTitle
          text="Curated Collections"
          as="h2"
          className={`${swanky.className} text-h2 sm:text-h1 font-bold text-charcoal px-3 sm:px-4 py-1 rounded-lg cursor-default`}
          typingSpeedMs={40}
          startDelayMs={300}
          waveVariant="subtle"
          loopWave={true}
          enableScrollTrigger={true}
          disableWave={true}
          style={{ 
            fontFamily: swanky.style.fontFamily,
          }}
        />
        <Link
          href="/explore/collections"
          className="text-body-sm text-sage hover:text-sage/80 font-semibold transition-colors flex items-center gap-1"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          See all
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {COLLECTIONS.map((collection) => (
          <Link
            key={collection.id}
            href={`/explore/collection/${collection.id}`}
            onClick={(e) => handleClick(collection.id, e)}
            className="group relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden backdrop-blur-md border border-white/60 ring-1 ring-white/30 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-[16px] bg-off-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 p-2">
                {COLLECTION_ICON_MAP[collection.id] ? (
                  (() => {
                    const IconComponent = COLLECTION_ICON_MAP[collection.id];
                    return <IconComponent className="w-7 h-7 text-charcoal" />;
                  })()
                ) : (
                  <span className="text-2xl">📍</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 
                  className="text-body font-semibold text-charcoal mb-2 group-hover:text-navbar-bg transition-colors duration-300"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  {collection.title}
                </h3>
                <p 
                  className="text-body-sm text-charcoal/60 mb-3"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  {collection.description}
                </p>
                <div className="flex items-center gap-2 text-caption text-charcoal/50">
                  <span style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                    {collection.count} places
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

