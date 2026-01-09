"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Search, Edit3, MessageCircle } from "react-feather";
import ConversationItem from "./ConversationItem";

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

interface ConversationListPanelProps {
  chats: BusinessChat[];
  chatsLoading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewConversation: () => void;
}

export default function ConversationListPanel({
  chats,
  chatsLoading,
  searchQuery,
  onSearchChange,
  selectedChatId,
  onChatSelect,
  onNewConversation,
}: ConversationListPanelProps) {
  const filteredChats = chats.filter((chat) =>
    chat.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-[380px] xl:w-[420px] flex flex-col bg-off-white border-r border-charcoal/10 overflow-hidden min-h-0">
      {/* Header - Static */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 bg-off-white">
        {/* Breadcrumb Navigation */}
        <nav className="mb-5" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link
                href="/home"
                className="text-charcoal/60 hover:text-charcoal transition-colors duration-200 font-medium"
                style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
              >
                Home
              </Link>
            </li>
            <li className="flex items-center">
              <ChevronRight className="w-4 h-4 text-charcoal/30" />
            </li>
            <li>
              <span
                className="text-charcoal font-semibold"
                style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
              >
                Messages
              </span>
            </li>
          </ol>
        </nav>

        {/* App Brand / Title + Action Icons */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-charcoal leading-tight" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              Messages
            </h1>
            <p className="text-sm text-charcoal/60 mt-1" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {chats.length} {chats.length === 1 ? "conversation" : "conversations"}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNewConversation}
            className="w-10 h-10 bg-gradient-to-br from-sage via-sage to-sage/95 text-white rounded-xl flex items-center justify-center shadow-md shadow-sage/20 hover:shadow-lg hover:shadow-sage/30 transition-all duration-200"
            aria-label="New conversation"
          >
            <Edit3 className="w-4.5 h-4.5" strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>

      {/* SearchBar - Static */}
      <div className="flex-shrink-0 px-5 pb-4 border-b border-charcoal/5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-charcoal/10 rounded-xl text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/40 transition-all duration-200"
            style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
          />
        </div>
      </div>

      {/* ConversationList - Scrollable ONLY */}
      <div className="flex-1 overflow-y-auto px-2 min-h-0">
        {chatsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-sage/20 border-t-sage rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-charcoal/60">Loading conversations...</p>
            </div>
          </div>
        ) : filteredChats.length === 0 ? (
          // Empty State Group - Centered
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="text-center max-w-xs" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {/* Icon */}
              <div className="w-16 h-16 mx-auto mb-4 bg-charcoal/5 rounded-2xl flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-charcoal/40" strokeWidth={1.5} />
              </div>

              {/* Text Group */}
              <h3 className="text-lg font-bold text-charcoal mb-2">
                {searchQuery ? 'No conversations found' : 'No messages yet'}
              </h3>
              <p className="text-sm text-charcoal/60 mb-8">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Start a conversation with business owners'}
              </p>

              {/* CTA - Anchored to empty state */}
              {!searchQuery && (
                <button
                  onClick={onNewConversation}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-sage via-sage to-sage/95 text-white text-sm font-semibold rounded-xl hover:from-sage/95 hover:to-sage shadow-md shadow-sage/20 hover:shadow-lg hover:shadow-sage/30 transition-all duration-200"
                >
                  <Edit3 className="w-4 h-4" strokeWidth={2.5} />
                  Start New Conversation
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredChats.map((chat, index) => (
              <ConversationItem
                key={chat.id}
                chat={chat}
                index={index}
                isSelected={selectedChatId === chat.id}
                onClick={() => onChatSelect(chat.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
