// src/components/BusinessDetail/BusinessDescription.tsx
"use client";

type Description = 
  | string 
  | { raw: string; friendly: string }
  | null 
  | undefined;

interface BusinessDescriptionProps {
  description: Description;
}

export default function BusinessDescription({ description }: BusinessDescriptionProps) {
  // Extract the text to display - handle both string and object shapes
  const getDescriptionText = (): string => {
    if (!description) {
      return "Discover this exceptional business offering quality services and experiences. Visit us to see what makes us special!";
    }
    
    if (typeof description === "string") {
      return description || "Discover this exceptional business offering quality services and experiences. Visit us to see what makes us special!";
    }
    
    // Handle object shape { raw, friendly }
    if (typeof description === "object" && description !== null) {
      const descObj = description as { raw?: string; friendly?: string };
      const friendly = descObj.friendly?.trim();
      const raw = descObj.raw?.trim();
      if (friendly) return friendly;
      if (raw) return raw;
      return "Discover this exceptional business offering quality services and experiences. Visit us to see what makes us special!";
    }
    
    return "Discover this exceptional business offering quality services and experiences. Visit us to see what makes us special!";
  };

  const descriptionText = getDescriptionText();

  return (
    <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[12px] ring-1 ring-white/30 p-4 sm:p-6 relative overflow-hidden">
      {/* Gradient overlays matching user profile */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg"></div>
      
      <div className="relative z-10">
        <h2
          className="text-h3 font-semibold text-charcoal mb-3"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          About This Business
        </h2>
        <p
          className="text-body text-charcoal/70 leading-relaxed"
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
        >
          {descriptionText}
        </p>
      </div>
    </div>
  );
}

