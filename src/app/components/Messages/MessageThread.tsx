"use client";

import { motion } from "framer-motion";
import { MessageCircle, Check } from "react-feather";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

interface MessageThreadProps {
  messages: Message[];
  messagesLoading: boolean;
  currentUserId?: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export default function MessageThread({
  messages,
  messagesLoading,
  currentUserId,
  messagesEndRef,
}: MessageThreadProps) {
  if (messagesLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0 bg-off-white">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-sage/20 border-t-sage rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-charcoal/60">Loading messages...</p>
          </div>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0 bg-off-white">
        <div className="flex items-center justify-center h-full">
          <div
            className="text-center max-w-sm w-full"
            style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
            </div>
            <h3
              className="text-h2 font-semibold text-charcoal mb-2"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
            >
              No messages yet
            </h3>
            <p
              className="text-body-sm text-charcoal/60 max-w-md mx-auto"
              style={{ fontFamily: 'Urbanist, system-ui, sans-serif', fontWeight: 500 }}
            >
              Start the conversation!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0 bg-off-white">
      <div className="max-w-2xl mx-auto space-y-4">
        {messages.map((msg) => {
          const isCurrentUser = msg.senderId === currentUserId;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  isCurrentUser
                    ? 'bg-gradient-to-br from-coral via-coral to-coral/95 text-white shadow-lg shadow-coral/20'
                    : 'bg-off-white text-charcoal border border-charcoal/10 shadow-md shadow-charcoal/5'
                }`}
                style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {msg.text}
                </p>
                <div className={`flex items-center gap-1.5 mt-2 text-xs ${isCurrentUser ? 'text-white/70' : 'text-charcoal/40'}`}>
                  <span>{msg.timestamp}</span>
                  {isCurrentUser && msg.read && (
                    <Check className="w-3 h-3" strokeWidth={2.5} />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
