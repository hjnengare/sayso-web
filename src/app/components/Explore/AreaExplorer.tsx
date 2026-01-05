"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { ArrowRight } from "react-feather";
import { Fontdiner_Swanky } from "next/font/google";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";

const swanky = Fontdiner_Swanky({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// Common neighborhoods/areas - can be made dynamic later
const POPULAR_AREAS = [
  { id: 'woodstock', name: 'Woodstock', description: 'Trendy neighborhood with cafes and art' },
  { id: 'observatory', name: 'Observatory', description: 'Vibrant student area' },
  { id: 'cbd', name: 'CBD', description: 'City center businesses' },
  { id: 'green-point', name: 'Green Point', description: 'Waterfront dining and nightlife' },
  { id: 'sea-point', name: 'Sea Point', description: 'Beachside restaurants' },
  { id: 'camps-bay', name: 'Camps Bay', description: 'Upscale beachfront' },
];

interface AreaExplorerProps {
  onAreaClick?: (areaId: string) => void;
}

export default function AreaExplorer({ onAreaClick }: AreaExplorerProps) {
  const router = useRouter();
  
  const handleClick = (areaId: string, e: React.MouseEvent) => {
    if (onAreaClick) {
      e.preventDefault();
      onAreaClick(areaId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <WavyTypedTitle
          text="Explore by Area"
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
        <button
          onClick={() => router.push("/explore/areas")}
          className="group inline-flex items-center gap-1 text-body-sm sm:text-caption font-normal text-charcoal transition-all duration-300 hover:text-sage focus:outline-none px-4 py-2 -mx-2 relative"
          aria-label="See all: Explore by Area"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
        >
          <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-0.5 text-charcoal group-hover:text-sage" style={{ fontWeight: 600 }}>
            See All
          </span>
          <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 text-charcoal group-hover:text-sage" />
        </button>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {POPULAR_AREAS.map((area) => (
          <Link
            key={area.id}
            href={`/explore/area/${area.id}`}
            onClick={(e) => handleClick(area.id, e)}
            className="group relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-hidden backdrop-blur-md border border-white/60 ring-1 ring-white/30 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-off-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <MapPin className="w-5 h-5 text-charcoal" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 
                  className="text-body-sm font-semibold text-charcoal mb-1 group-hover:text-navbar-bg transition-colors duration-300 truncate"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  {area.name}
                </h3>
                <p 
                  className="text-caption text-charcoal/60 line-clamp-2"
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  {area.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

