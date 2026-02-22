"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { m } from "framer-motion";

interface CustomDropdownProps {
    id?: string;
    name?: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    placeholder: string;
    options: Array<{ value: string; label: string }>;
    className?: string;
    disabled?: boolean;
    searchable?: boolean;
    searchPlaceholder?: string;
    noOptionsText?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
    id,
    name,
    value,
    onChange,
    onBlur,
    placeholder,
    options,
    className = 'flex-1',
    disabled = false,
    searchable = true,
    searchPlaceholder = 'Search...',
    noOptionsText = 'No options found',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

    const filteredOptions = options.filter((option) => {
        if (!searchTerm.trim()) return true;
        const needle = searchTerm.trim().toLowerCase();
        return option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle);
    });

    const closeDropdown = () => {
        setIsOpen(false);
        setSearchTerm('');
    };

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedButton = buttonRef.current?.contains(target);
            const clickedDropdown = dropdownRef.current?.contains(target);
            if (!clickedButton && !clickedDropdown) {
                closeDropdown();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Position dropdown using portal
    useEffect(() => {
        const updatePosition = () => {
            if (!buttonRef.current) return;

            const rect = buttonRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const edgePadding = 12;

            const width = Math.min(rect.width, viewportWidth - edgePadding * 2);
            const left = Math.max(edgePadding, Math.min(rect.left, viewportWidth - width - edgePadding));

            const spaceBelow = viewportHeight - rect.bottom - edgePadding;
            const spaceAbove = rect.top - edgePadding;
            const prefersTop = spaceBelow < 220 && spaceAbove > spaceBelow;
            const maxHeight = Math.max(180, Math.min(360, Math.floor((prefersTop ? spaceAbove : spaceBelow) - 8)));
            const top = prefersTop
                ? Math.max(edgePadding, rect.top - maxHeight - 8)
                : Math.min(viewportHeight - edgePadding, rect.bottom + 8);

            setDropdownPos({
                top,
                left,
                width,
                maxHeight,
            });
        };

        if (isOpen) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        } else {
            setDropdownPos(null);
        }

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !searchable) return;
        const timer = window.setTimeout(() => {
            searchInputRef.current?.focus();
        }, 40);

        return () => {
            window.clearTimeout(timer);
        };
    }, [isOpen, searchable]);

    useEffect(() => {
        if (!disabled) return;
        if (isOpen) {
            closeDropdown();
        }
    }, [disabled, isOpen]);

    const displayValue = options.find(opt => opt.value === value)?.label || placeholder;

    return (
        <div className={`relative ${className}`}>
            <m.button
                ref={buttonRef}
                type="button"
                id={id}
                name={name}
                onClick={() => {
                    if (disabled) return;
                    setIsOpen((prev) => !prev);
                }}
                onBlur={onBlur}
                disabled={disabled}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                className={`w-full bg-off-white rounded-[12px] border-none shadow-[0_8px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-xl pl-4 pr-10 py-3 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-navbar-bg/30 focus:border-navbar-bg transition-colors duration-200 hover:shadow-[0_8px_40px_rgba(0,0,0,0.15)] text-left flex items-center justify-between ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={id ? `${id}-dropdown` : undefined}
            >
                <span className={value ? 'text-charcoal' : 'text-charcoal/70'}>{displayValue}</span>
                <m.div
                    animate={{ rotate: isOpen && !disabled ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown size={16} />
                </m.div>
            </m.button>

            {isOpen && dropdownPos && typeof window !== 'undefined' && createPortal(
                <m.div
                    ref={dropdownRef}
                    id={id ? `${id}-dropdown` : undefined}
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="fixed z-[10000] bg-off-white rounded-[12px] border-none shadow-[0_16px_48px_rgba(0,0,0,0.18),0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl overflow-hidden"
                    style={{
                        top: dropdownPos.top,
                        left: dropdownPos.left,
                        width: dropdownPos.width,
                        maxHeight: dropdownPos.maxHeight,
                        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                    }}
                    onClick={(e) => e.stopPropagation()}
                    role="listbox"
                >
                    {searchable && (
                        <div className="sticky top-0 z-10 bg-off-white/95 backdrop-blur-xl border-b border-charcoal/10 p-3">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full rounded-[10px] border border-charcoal/10 bg-white/90 px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-navbar-bg/20"
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                            />
                        </div>
                    )}
                    <div
                        className="overflow-y-auto overscroll-contain touch-pan-y"
                        style={{ maxHeight: searchable ? dropdownPos.maxHeight - 64 : dropdownPos.maxHeight }}
                    >
                        {filteredOptions.length === 0 && (
                            <div className="px-4 py-3 text-sm text-charcoal/70" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                {noOptionsText}
                            </div>
                        )}
                        {filteredOptions.map((option, index) => (
                            <m.button
                                key={`${option.value}-${index}`}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    closeDropdown();
                                }}
                                whileHover={{ backgroundColor: 'rgba(139, 169, 139, 0.1)' }}
                                className={`w-full px-4 py-3 text-left text-sm font-semibold transition-colors duration-150 ${
                                    option.value === value
                                        ? 'bg-gradient-to-r from-sage/10 to-sage/5 text-charcoal'
                                        : 'text-charcoal'
                                }`}
                                style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
                                role="option"
                                aria-selected={option.value === value}
                            >
                                {option.label}
                            </m.button>
                        ))}
                    </div>
                </m.div>,
                document.body
            )}
        </div>
    );
};

export default CustomDropdown;
