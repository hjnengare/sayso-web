// src/components/SpecialDetail/SpecialDescription.tsx
"use client";

import { m } from "framer-motion";

interface SpecialDescriptionProps {
    description: string;
}

export default function SpecialDescription({ description }: SpecialDescriptionProps) {
    return (
        <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-5 sm:p-6"
        >
            <h2
                className="text-lg font-bold text-charcoal mb-3"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
                About This Special
            </h2>
            <p
                className="text-sm text-charcoal/80 leading-relaxed whitespace-pre-wrap"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
                {description || "Don't miss out on this amazing special offer! This limited-time deal provides incredible value and a fantastic experience. Perfect for trying something new or treating yourself to something special."}
            </p>
        </m.div>
    );
}
