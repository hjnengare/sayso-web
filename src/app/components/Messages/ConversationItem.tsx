"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, User, Check } from "react-feather";

interface BusinessChat {
  id: string;
  conversationId: string;
  businessId: string;
  businessName: string;
  businessImage: string;
  category: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  verified?: boolean;
}

interface ConversationItemProps {
  chat: BusinessChat;
  index: number;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function ConversationItem({ chat, index, isSelected, onClick }: ConversationItemProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      className="group relative block w-full text-left"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      whileHover={{ x: 4 }}
    >
      <div
        className={`relative flex items-center gap-4 px-5 py-4 transition-all duration-300 rounded-2xl mx-2 my-1.5 ${
          isSelected
            ? 'bg-gradient-to-br from-white to-sage/5 border border-sage/40 shadow-xl shadow-sage/10 ring-2 ring-sage/20 scale-[1.02]'
            : 'bg-off-white border border-charcoal/8 hover:border-sage/25 hover:shadow-lg hover:shadow-sage/5 hover:-translate-y-1 hover:scale-[1.01]'
        }`}
      >
        {/* Business Avatar */}
        <div className="relative flex-shrink-0">
          {!imgError && chat.businessImage && chat.businessImage.trim() !== "" ? (
            <div className={`relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-offset-2 ring-offset-off-white transition-all duration-300 group-hover:ring-sage/40 group-hover:scale-105 ${isSelected ? 'ring-sage shadow-md shadow-sage/20' : 'ring-transparent'}`}>
              <Image
                src={chat.businessImage}
                alt={chat.businessName}
                width={56}
                height={56}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-sage/25 to-sage/10 text-sage rounded-2xl border-2 border-sage/30 shadow-sm">
              <User className="w-8 h-8" strokeWidth={2} />
            </div>
          )}

          {/* Verified Badge */}
          {chat.verified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center ring-2 ring-off-white shadow-md">
              <Check className="text-white w-3.5 h-3.5" strokeWidth={3} />
            </div>
          )}

          {/* Unread Indicator */}
          {chat.unreadCount > 0 && !isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gradient-to-br from-coral to-coral/90 rounded-full ring-2 ring-off-white shadow-sm"
            />
          )}
        </div>

        {/* Chat Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1 gap-2">
            <h3 className={`text-base font-bold truncate transition-colors duration-300 ${isSelected ? 'text-sage' : 'text-charcoal group-hover:text-charcoal/90'}`} style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {chat.businessName}
            </h3>
            <span className="text-xs text-charcoal/50 font-semibold whitespace-nowrap flex-shrink-0" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {chat.timestamp}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-charcoal/60 truncate leading-snug flex-1" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {chat.lastMessage}
            </p>
            {chat.unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="min-w-[24px] h-6 px-2.5 bg-gradient-to-br from-sage via-sage to-sage/95 text-white text-xs font-black rounded-full flex items-center justify-center flex-shrink-0 shadow-md shadow-sage/30"
                style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
              >
                {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
              </motion.span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
