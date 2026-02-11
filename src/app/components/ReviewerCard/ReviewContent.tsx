import Image from "next/image";
import { Heart } from "lucide-react";

interface ReviewContentProps {
  businessName: string;
  businessType: string;
  reviewText: string;
  date: string;
  likes: number;
  images?: string[];
}

export default function ReviewContent({
  businessName,
  businessType,
  reviewText,
  date,
  likes,
  images,
}: ReviewContentProps) {

  return (
    <div className="flex-1 text-center px-2 pb-2">
      <div className="mb-1">
        <div className="flex items-center justify-center mb-0.5">
          <h4 className="font-urbanist text-[10px] font-600 text-charcoal truncate">{businessName}</h4>
        </div>
        <div className="flex items-center justify-center mb-0.5">
          <span className="text-[12px] text-charcoal/60 font-urbanist">{date}</span>
        </div>

        <div className="flex items-center justify-center gap-1 mb-0.5">
          <span className="text-[10px] text-charcoal/70 font-urbanist">
            {businessType}
          </span>
        </div>
      </div>

      <p className="font-urbanist text-[10px] text-charcoal/80 leading-relaxed mb-2 line-clamp-2">
        {reviewText}
      </p>

      {images && images.length > 0 && (
        <div className="mb-2">
          <Image
            src={images[0]}
            alt="Review image"
            width={200}
            height={60}
            className="w-full h-16 object-cover rounded-lg"
            sizes="(max-width: 768px) 100vw, 200px"
          />
        </div>
      )}

      <div className="flex items-center justify-center gap-0.5 text-charcoal/70">
        <Heart
          size={10}
          className="text-charcoal/70"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="text-[10px] font-urbanist">{likes}</span>
      </div>
    </div>
  );
}
