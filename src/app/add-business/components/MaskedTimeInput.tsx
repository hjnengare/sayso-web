"use client";

import React, { useState, useEffect } from "react";
import { m } from "framer-motion";

interface MaskedTimeInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const MaskedTimeInput: React.FC<MaskedTimeInputProps> = ({
    value,
    onChange,
    placeholder = "09:00"
}) => {
    const [inputValue, setInputValue] = useState(value || '');
    const [isFocused, setIsFocused] = useState(false);
    const [isValid, setIsValid] = useState(true);

    // Format time input with mask (HH:MM)
    const formatTimeInput = (input: string): string => {
        // Remove all non-numeric characters
        const digits = input.replace(/\D/g, '');

        if (digits.length === 0) return '';
        if (digits.length <= 2) {
            const hours = parseInt(digits, 10);
            if (hours > 23) return '23';
            return digits;
        }

        // Format as HH:MM
        const hours = digits.substring(0, 2);
        const minutes = digits.substring(2, 4);

        let formattedHours = parseInt(hours, 10);
        if (formattedHours > 23) formattedHours = 23;

        let formattedMinutes = parseInt(minutes || '0', 10);
        if (formattedMinutes > 59) formattedMinutes = 59;

        const hoursStr = formattedHours.toString().padStart(2, '0');
        const minutesStr = minutes ? formattedMinutes.toString().padStart(2, '0') : '';

        return minutesStr ? `${hoursStr}:${minutesStr}` : hoursStr;
    };

    // Validate time format
    const validateTime = (time: string): boolean => {
        if (!time) return true;
        const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
        return timeRegex.test(time);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatTimeInput(e.target.value);
        setInputValue(formatted);
        setIsValid(validateTime(formatted));
    };

    const handleBlur = () => {
        setIsFocused(false);
        // Pad incomplete time on blur
        if (inputValue && !inputValue.includes(':')) {
            const padded = inputValue.padStart(2, '0') + ':00';
            setInputValue(padded);
            onChange(padded);
            setIsValid(validateTime(padded));
        } else if (inputValue) {
            onChange(inputValue);
        } else {
            onChange('');
        }
    };

    // Sync with external value
    useEffect(() => {
        if (value !== inputValue && !isFocused) {
            setInputValue(value || '');
        }
    }, [value, isFocused]);

    return (
        <m.div
            className="relative flex-1"
            whileFocus={{ scale: 1.01 }}
        >
            <input
                type="text"
                value={inputValue}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                placeholder={placeholder}
                maxLength={5}
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                className={`w-full rounded-full bg-white border px-4 py-2.5 text-sm font-semibold text-charcoal placeholder-charcoal/40 focus:outline-none focus:ring-2 transition-all duration-200 text-center ${
                    !isValid
                        ? 'border-coral focus:ring-coral/30 focus:border-coral'
                        : 'border-white/60 focus:ring-sage/30 focus:border-sage hover:border-sage/50'
                }`}
            />
            {isFocused && (
                <m.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-5 left-0 right-0 text-center text-xs text-white/90"
                >
                    24h format
                </m.span>
            )}
        </m.div>
    );
};

export default MaskedTimeInput;
