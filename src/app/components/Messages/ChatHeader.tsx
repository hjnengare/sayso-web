"use client";

import Image from "next/image";
import { User, Check, Search, Info, MoreVertical } from "react-feather";

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

interface ChatHeaderProps {
  chat: BusinessChat;
}

export default function ChatHeader({ chat }: ChatHeaderProps) {
  return (
    <div className="flex-shrink-0 px-6 py-4 bg-off-white border-b border-charcoal/10">
      <div className="flex items-center justify-between gap-4">
        {/* Avatar and Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {chat.businessImage ? (
            <div className="relative flex-shrink-0">
              <Image
                src={chat.businessImage}
                alt={chat.businessName}
                width={48}
                height={48}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-sage/20"
              />
              {chat.verified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center ring-2 ring-white">
                  <Check className="text-white w-2.5 h-2.5" strokeWidth={3} />
                </div>
              )}
            </div>
          ) : (
            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-sage/20 to-sage/10 text-sage rounded-xl">
              <User className="w-6 h-6" strokeWidth={2} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-charcoal truncate" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                {chat.businessName}
              </h2>
              {chat.verified && (
                <span className="flex-shrink-0 px-2 py-0.5 bg-blue-500/10 text-blue-600 text-xs font-semibold rounded-md" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  Verified
                </span>
              )}
            </div>
            <p className="text-sm text-charcoal/60 truncate" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {chat.category || 'Business Owner'}
            </p>
          </div>
        </div>

        {/* Chat Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-charcoal/5 text-charcoal/60 hover:text-charcoal transition-colors"
            aria-label="Search conversation"
          >
            <Search className="w-4.5 h-4.5" strokeWidth={2} />
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-charcoal/5 text-charcoal/60 hover:text-charcoal transition-colors"
            aria-label="Conversation info"
          >
            <Info className="w-4.5 h-4.5" strokeWidth={2} />
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-charcoal/5 text-charcoal/60 hover:text-charcoal transition-colors"
            aria-label="More options"
          >
            <MoreVertical className="w-4.5 h-4.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
