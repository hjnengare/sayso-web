import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import EventIcon from "./EventIcon";
import EventBadge from "./EventBadge";

interface EventBannerProps {
  image?: string;
  alt?: string;
  icon?: string;
  title: string;
  rating: number;
  startDate: string;
  endDate?: string;
  eventId?: string;
}

export default function EventBanner({
  image,
  alt,
  icon,
  title,
  rating,
  startDate,
  endDate,
  eventId
}: EventBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-t-lg h-[320px] flex-shrink-0 z-10">
      <div className="relative w-full h-full">
        {image ? (
          <>
            <Image
              src={image}
              alt={alt || title}
              fill
              sizes="(max-width: 768px) 540px, 320px"
              className="object-cover rounded-t-lg"
              priority={false}
            />
            {/* Premium gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-charcoal/5 to-transparent opacity-60" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sage/5 to-sage/10 rounded-t-lg">
            <ImageIcon className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 text-navbar-bg/40" />
          </div>
        )}
      </div>

      {/* Badges */}
      <EventBadge 
        startDate={startDate} 
        endDate={endDate} 
        eventId={eventId}
        // Pass-through optional props for consistency when parent has them
        // These props will be undefined here unless the parent forwards them
      />
    </div>
  );
}
