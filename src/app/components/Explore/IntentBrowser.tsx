"use client";

import Link from "next/link";
import { Utensils, Coffee, Activity, Heart, PartyPopper, ShoppingBag, Wrench } from "lucide-react";
import { Fontdiner_Swanky } from "next/font/google";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const INTENTS = [
  { id: 'eat', label: 'Eat', icon: Utensils, color: 'from-coral/20 to-coral/10' },
  { id: 'drink', label: 'Drink', icon: Coffee, color: 'from-sage/20 to-sage/10' },
  { id: 'move', label: 'Move', icon: Activity, color: 'from-blue-400/20 to-blue-400/10' },
  { id: 'relax', label: 'Relax', icon: Heart, color: 'from-purple-400/20 to-purple-400/10' },
  { id: 'celebrate', label: 'Celebrate', icon: PartyPopper, color: 'from-yellow-400/20 to-yellow-400/10' },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, color: 'from-pink-400/20 to-pink-400/10' },
  { id: 'fix', label: 'Fix something', icon: Wrench, color: 'from-gray-400/20 to-gray-400/10' },
];

interface IntentBrowserProps {
  onIntentClick?: (intentId: string) => void;
}

export default function IntentBrowser({ onIntentClick }: IntentBrowserProps) {
  const handleClick = (intentId: string, e: React.MouseEvent) => {
    if (onIntentClick) {
      e.preventDefault();
      onIntentClick(intentId);
    }
  };

  return (
    <div className="space-y-4">
      <WavyTypedTitle
        text="Browse by Intent"
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
      
      <div className="flex flex-wrap gap-3">
        {INTENTS.map((intent) => {
          const IconComponent = intent.icon;
          return (
            <Link
              key={intent.id}
              href={`/explore/intent/${intent.id}`}
              onClick={(e) => handleClick(intent.id, e)}
              className="group relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-full overflow-hidden backdrop-blur-md border border-white/60 ring-1 ring-white/30 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 px-5 py-3 flex items-center gap-2.5"
            >
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${intent.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <IconComponent className="w-4 h-4 text-charcoal" />
              </div>
              <span 
                className="text-body-sm font-semibold text-charcoal group-hover:text-navbar-bg transition-colors duration-300"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                {intent.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

