// src/components/SpecialDetail/SpecialDetailsCard.tsx
"use client";

import { Calendar, Percent, Clock, Users } from "lucide-react";
import { motion } from "framer-motion";

interface SpecialDetailsCardProps {
    special: {
        startDate?: string;
        endDate?: string;
        price?: string | null;
    };
}

export default function SpecialDetailsCard({ special }: SpecialDetailsCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border border-white/60 rounded-[20px] shadow-md p-5 sm:p-6"
        >
            <h2
                className="text-lg font-bold text-charcoal mb-4"
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
            >
                Special Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {special.startDate && (
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 bg-coral/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <Calendar className="text-coral w-5 h-5" />
                        </div>
                        <div>
                            <p
                                className="text-xs text-charcoal/60"
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            >
                                Valid From
                            </p>
                            <p
                                className="text-sm font-semibold text-charcoal"
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            >
                                {special.startDate}
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-sage/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Percent className="text-sage w-5 h-5" />
                    </div>
                    <div>
                        <p
                            className="text-xs text-charcoal/60"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                            Discount
                        </p>
                        <p
                            className="text-sm font-semibold text-charcoal"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                            {special.price || "Special Price"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-coral/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="text-coral w-5 h-5" />
                    </div>
                    <div>
                        <p
                            className="text-xs text-charcoal/60"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                            Available
                        </p>
                        <p
                            className="text-sm font-semibold text-charcoal"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                            Limited Time
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-sage/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="text-sage w-5 h-5" />
                    </div>
                    <div>
                        <p
                            className="text-xs text-charcoal/60"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                            Terms
                        </p>
                        <p
                            className="text-sm font-semibold text-charcoal"
                            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                            See venue for details
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
