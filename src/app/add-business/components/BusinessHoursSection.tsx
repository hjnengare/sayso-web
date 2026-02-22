"use client";

import React, { useState, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Clock, Sun, Moon, Copy, Sparkles, Coffee, Store, Zap } from "lucide-react";
import { BusinessFormData } from "./types";

interface BusinessHoursSectionProps {
    formData: BusinessFormData;
    onHoursChange: (day: string, value: string) => void;
}

// Preset configurations
const presets = [
    { id: 'standard', label: 'Standard', icon: Store, hours: { open: '09:00', close: '17:00' }, description: '9 AM – 5 PM' },
    { id: 'retail', label: 'Retail', icon: Coffee, hours: { open: '09:00', close: '18:00' }, description: '9 AM – 6 PM' },
    { id: 'restaurant', label: 'Restaurant', icon: Sun, hours: { open: '11:00', close: '22:00' }, description: '11 AM – 10 PM' },
    { id: 'extended', label: 'Extended', icon: Moon, hours: { open: '08:00', close: '21:00' }, description: '8 AM – 9 PM' },
];

const daysConfig = [
    { key: 'monday', label: 'Mon', fullLabel: 'Monday', isWeekday: true },
    { key: 'tuesday', label: 'Tue', fullLabel: 'Tuesday', isWeekday: true },
    { key: 'wednesday', label: 'Wed', fullLabel: 'Wednesday', isWeekday: true },
    { key: 'thursday', label: 'Thu', fullLabel: 'Thursday', isWeekday: true },
    { key: 'friday', label: 'Fri', fullLabel: 'Friday', isWeekday: true },
    { key: 'saturday', label: 'Sat', fullLabel: 'Saturday', isWeekday: false },
    { key: 'sunday', label: 'Sun', fullLabel: 'Sunday', isWeekday: false },
] as const;

const BusinessHoursSection: React.FC<BusinessHoursSectionProps> = ({
    formData,
    onHoursChange,
}) => {
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [showCustomize, setShowCustomize] = useState(false);

    // Parse hours for a day
    const parseHours = (day: string) => {
        const value = formData.hours[day as keyof typeof formData.hours];
        if (!value) return { open: '', close: '', isClosed: true };
        const [open, close] = value.split(' - ');
        return { open: open || '', close: close || '', isClosed: false };
    };

    // Format time for display (convert 24h to 12h)
    const formatTimeDisplay = (time: string) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    // Apply preset to all weekdays
    const applyPreset = useCallback((presetId: string) => {
        const preset = presets.find(p => p.id === presetId);
        if (!preset) return;

        setSelectedPreset(presetId);
        const hoursValue = `${preset.hours.open} - ${preset.hours.close}`;

        // Apply to weekdays
        daysConfig.filter(d => d.isWeekday).forEach(day => {
            onHoursChange(day.key, hoursValue);
        });

        // Leave weekends closed by default for most presets
        if (presetId !== 'restaurant') {
            onHoursChange('saturday', '');
            onHoursChange('sunday', '');
        } else {
            // Restaurants often open on weekends
            onHoursChange('saturday', hoursValue);
            onHoursChange('sunday', hoursValue);
        }
    }, [onHoursChange]);

    // Toggle day open/closed
    const toggleDay = useCallback((day: string) => {
        const current = parseHours(day);
        if (current.isClosed) {
            // Open with default hours
            onHoursChange(day, '09:00 - 17:00');
        } else {
            // Close
            onHoursChange(day, '');
        }
    }, [onHoursChange, formData.hours]);

    // Copy hours to other days
    const copyToWeekdays = useCallback((sourceDay: string) => {
        const source = formData.hours[sourceDay as keyof typeof formData.hours];
        if (!source) return;

        daysConfig.filter(d => d.isWeekday && d.key !== sourceDay).forEach(day => {
            onHoursChange(day.key, source);
        });
    }, [formData.hours, onHoursChange]);

    const copyToAll = useCallback((sourceDay: string) => {
        const source = formData.hours[sourceDay as keyof typeof formData.hours];
        if (!source) return;

        daysConfig.filter(d => d.key !== sourceDay).forEach(day => {
            onHoursChange(day.key, source);
        });
    }, [formData.hours, onHoursChange]);

    // Update time for a specific day
    const updateTime = useCallback((day: string, type: 'open' | 'close', value: string) => {
        const current = parseHours(day);
        const newOpen = type === 'open' ? value : current.open || '09:00';
        const newClose = type === 'close' ? value : current.close || '17:00';

        if (newOpen && newClose) {
            onHoursChange(day, `${newOpen} - ${newClose}`);
        } else if (newOpen) {
            onHoursChange(day, newOpen);
        } else {
            onHoursChange(day, '');
        }
    }, [onHoursChange, formData.hours]);

    // Check if any hours are set
    const hasAnyHours = Object.values(formData.hours).some(h => h && h.trim());

    // Count open days
    const openDaysCount = Object.values(formData.hours).filter(h => h && h.trim()).length;

    return (
        <m.div
            className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden border-none backdrop-blur-xl shadow-md px-4 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-coral/10 to-transparent rounded-full blur-lg pointer-events-none"></div>
            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-urbanist text-base font-semibold text-charcoal flex items-center gap-3" style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}>
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-navbar-bg/20 to-navbar-bg/10">
                            <Clock className="w-5 h-5 text-navbar-bg" />
                        </span>
                        Business Hours
                    </h3>
                    {hasAnyHours && (
                        <m.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-xs text-charcoal/60 bg-charcoal/5 px-3 py-1 rounded-full"
                            style={{ fontFamily: 'Urbanist, sans-serif' }}
                        >
                            {openDaysCount} day{openDaysCount !== 1 ? 's' : ''} open
                        </m.span>
                    )}
                </div>

                {/* Quick Presets */}
                <div className="mb-6">
                    <p className="text-sm text-white mb-3 flex items-center gap-2" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                        Quick setup
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {presets.map((preset) => {
                            const Icon = preset.icon;
                            const isSelected = selectedPreset === preset.id;
                            return (
                                <m.button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => applyPreset(preset.id)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`relative p-3 rounded-2xl border-2 transition-all duration-200 text-left ${
                                        isSelected
                                            ? 'bg-gradient-to-br from-coral/20 to-coral/10 border-coral'
                                            : 'bg-white/60 border-charcoal/10 hover:border-charcoal/20 hover:bg-white/80'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon className={`w-4 h-4 ${isSelected ? 'text-coral' : 'text-charcoal/60'}`} />
                                        <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-white/80'}`} style={{ fontFamily: 'Urbanist, sans-serif' }}>
                                            {preset.label}
                                        </span>
                                    </div>
                                    <span className="text-xs text-charcoal/50" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                                        {preset.description}
                                    </span>
                                    {isSelected && (
                                        <m.div
                                            layoutId="preset-indicator"
                                            className="absolute top-2 right-2 w-2 h-2 rounded-full bg-coral"
                                            initial={false}
                                        />
                                    )}
                                </m.button>
                            );
                        })}
                    </div>
                </div>

                {/* Days Schedule - Visual Grid */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-white" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                            Customize schedule
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowCustomize(!showCustomize)}
                            className="text-xs text-coral hover:text-coral/80 transition-colors flex items-center gap-1"
                            style={{ fontFamily: 'Urbanist, sans-serif' }}
                        >
                            <Zap className="w-3 h-3" />
                            {showCustomize ? 'Simple view' : 'Edit times'}
                        </button>
                    </div>

                    <div className="grid gap-2">
                        {daysConfig.map((day, index) => {
                            const hours = parseHours(day.key);
                            const isOpen = !hours.isClosed;

                            return (
                                <m.div
                                    key={day.key}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2, delay: index * 0.03 }}
                                    className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                                        isOpen
                                            ? 'bg-gradient-to-r from-white/60 to-white/40'
                                            : 'bg-white/30 opacity-60'
                                    }`}
                                >
                                    {/* Day Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => toggleDay(day.key)}
                                        className={`w-12 h-8 rounded-full flex items-center transition-all duration-300 ${
                                            isOpen
                                                ? 'bg-gradient-to-r from-sage to-sage/80 justify-end pr-1'
                                                : 'bg-charcoal/20 justify-start pl-1'
                                        }`}
                                    >
                                        <m.div
                                            layout
                                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                                isOpen ? 'bg-white' : 'bg-white/80'
                                            }`}
                                        >
                                            {isOpen ? (
                                                <Sun className="w-3.5 h-3.5 text-sage" />
                                            ) : (
                                                <Moon className="w-3.5 h-3.5 text-charcoal/60" />
                                            )}
                                        </m.div>
                                    </button>

                                    {/* Day Label */}
                                    <div className="w-20 flex-shrink-0">
                                        <span className={`text-sm font-semibold ${isOpen ? 'text-charcoal' : 'text-charcoal/50'}`} style={{ fontFamily: 'Urbanist, sans-serif' }}>
                                            {day.fullLabel}
                                        </span>
                                    </div>

                                    {/* Hours Display / Edit */}
                                    <div className="flex-1">
                                        <AnimatePresence mode="wait">
                                            {isOpen ? (
                                                showCustomize ? (
                                                    <m.div
                                                        key="edit"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <input
                                                            type="time"
                                                            value={hours.open}
                                                            onChange={(e) => updateTime(day.key, 'open', e.target.value)}
                                                            className="bg-white border border-charcoal/20 rounded-full px-3 py-1.5 text-sm text-charcoal font-semibold focus:outline-none focus:border-coral/50 focus:ring-2 focus:ring-coral/30 w-[100px] hover:border-sage/50 transition-all duration-200"
                                                            style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
                                                        />
                                                        <span className="text-charcoal/40">–</span>
                                                        <input
                                                            type="time"
                                                            value={hours.close}
                                                            onChange={(e) => updateTime(day.key, 'close', e.target.value)}
                                                            className="bg-white border border-charcoal/20 rounded-full px-3 py-1.5 text-sm text-charcoal font-semibold focus:outline-none focus:border-coral/50 focus:ring-2 focus:ring-coral/30 w-[100px] hover:border-sage/50 transition-all duration-200"
                                                            style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
                                                        />
                                                    </m.div>
                                                ) : (
                                                    <m.div
                                                        key="display"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <span className="text-sm text-charcoal/80 font-medium" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                                                            {formatTimeDisplay(hours.open)} – {formatTimeDisplay(hours.close)}
                                                        </span>
                                                    </m.div>
                                                )
                                            ) : (
                                                <m.span
                                                    key="closed"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="text-sm text-white/40 italic"
                                                    style={{ fontFamily: 'Urbanist, sans-serif' }}
                                                >
                                                    Closed
                                                </m.span>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Copy Actions (shown on hover) */}
                                    {isOpen && (
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => copyToWeekdays(day.key)}
                                                className="p-1.5 rounded-lg bg-charcoal/5 hover:bg-charcoal/10 transition-colors"
                                                title="Copy to weekdays"
                                            >
                                                <Copy className="w-3.5 h-3.5 text-charcoal/60" />
                                            </button>
                                        </div>
                                    )}
                                </m.div>
                            );
                        })}
                    </div>
                </div>

                {/* Smart Actions */}
                {hasAnyHours && (
                    <m.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 pt-4 border-t border-charcoal/10 flex flex-wrap gap-2"
                    >
                        <button
                            type="button"
                            onClick={() => {
                                const firstOpen = daysConfig.find(d => !parseHours(d.key).isClosed);
                                if (firstOpen) copyToWeekdays(firstOpen.key);
                            }}
                            className="text-xs text-white/70 hover:text-white bg-charcoal/5 hover:bg-charcoal/10 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                            style={{ fontFamily: 'Urbanist, sans-serif' }}
                        >
                            <Copy className="w-3 h-3" />
                            Apply to weekdays
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const firstOpen = daysConfig.find(d => !parseHours(d.key).isClosed);
                                if (firstOpen) copyToAll(firstOpen.key);
                            }}
                            className="text-xs text-white/70 hover:text-white bg-charcoal/5 hover:bg-charcoal/10 px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                            style={{ fontFamily: 'Urbanist, sans-serif' }}
                        >
                            <Sparkles className="w-3 h-3" />
                            Apply to all days
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                daysConfig.forEach(d => onHoursChange(d.key, ''));
                                setSelectedPreset(null);
                            }}
                            className="text-xs text-white/40 hover:text-coral/80 px-3 py-1.5 rounded-full transition-all"
                            style={{ fontFamily: 'Urbanist, sans-serif' }}
                        >
                            Clear all
                        </button>
                    </m.div>
                )}

                {/* Helper text */}
                {!hasAnyHours && (
                    <p className="text-xs text-white/40 mt-4 text-center" style={{ fontFamily: 'Urbanist, sans-serif' }}>
                        Select a preset above or customize each day individually
                    </p>
                )}
            </div>
        </m.div>
    );
};

export default BusinessHoursSection;
