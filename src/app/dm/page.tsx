"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Search, User, Check, Edit3, MessageSquare, Send, MoreVertical, Trash2, AlertTriangle, UserX, ArrowLeft, ChevronRight, X } from "react-feather";
import { createPortal } from "react-dom";
import SearchInput from "../components/SearchInput/SearchInput";
import Footer from "../components/Footer/Footer";
import Header from "../components/Header/Header";
import { useAuth } from "../contexts/AuthContext";

interface BusinessChat {
  id: string; // owner ID (for routing)
  conversationId: string; // conversation ID (for API calls)
  businessId: string;
  businessName: string;
  businessImage: string;
  category: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  verified?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

// Instagram-like Chat Item Component
function ChatItem({ chat, index, isSelected, onClick }: { chat: BusinessChat; index: number; isSelected?: boolean; onClick?: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      className="group relative block w-full text-left"
      whileHover={{ x: 2 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className={`relative flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-200 border-b border-charcoal/10 ${isSelected
            ? 'bg-sage/5 border-l-2 border-sage'
            : 'hover:bg-charcoal/5 border-l-2 border-transparent'
          }`}
      >
        {/* Business Image - Larger Instagram style */}
        <div className="relative flex-shrink-0">
          {!imgError && chat.businessImage && chat.businessImage.trim() !== "" ? (
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden">
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
            <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-gradient-to-br from-sage/30 to-sage/20 text-sage rounded-lg">
              <User className="text-sage w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
            </div>
          )}

          {/* Verified Badge */}
          {chat.verified && (
            <div className="absolute -top-1 -right-1 w-4.5 h-4.5 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
              <Check className="text-white w-2.5 h-2.5 sm:w-3 sm:h-3" strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Chat Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5 gap-2">
            <h3 className={`text-body font-semibold truncate transition-colors duration-200 ${isSelected ? 'text-sage' : 'text-charcoal'}`} style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {chat.businessName}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-caption text-charcoal/40 font-normal whitespace-nowrap" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                {chat.timestamp}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-body-sm text-charcoal/60 truncate leading-snug flex-1" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {chat.lastMessage}
            </p>
            {chat.unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="min-w-[20px] h-5 px-1.5 bg-sage text-white text-caption font-bold rounded-full flex items-center justify-center flex-shrink-0"
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


export default function DMChatListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [chats, setChats] = useState<BusinessChat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuButtonRef = useRef<HTMLDivElement>(null);

  // Fetch conversations from API
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setChatsLoading(true);
        const response = await fetch('/api/messages/conversations');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('API Error:', errorData);
          throw new Error(errorData.error || `Failed to fetch conversations: ${response.status}`);
        }
        const result = await response.json();

        // Transform API data to BusinessChat format
        const transformedChats: BusinessChat[] = (result.data || []).map((conv: any) => {
          const business = conv.business;
          const lastMessage = conv.last_message;

          return {
            id: conv.owner_id, // Use owner_id for routing
            conversationId: conv.id, // Store conversation ID
            businessId: business?.id || '',
            businessName: business?.name || 'Business',
            businessImage: business?.image_url || '',
            category: business?.category || '',
            lastMessage: lastMessage?.content || 'No messages yet',
            timestamp: formatTimestamp(lastMessage?.created_at || conv.last_message_at),
            unreadCount: conv.unread_count || 0,
            verified: business?.verified || false,
          };
        });

        setChats(transformedChats);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setChats([]);
      } finally {
        setChatsLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const filteredChats = chats.filter((chat) =>
    chat.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedChat = selectedChatId ? chats.find(c => c.id === selectedChatId) : null;

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string): string => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Load messages when chat is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChatId) {
        setMessages([]);
        return;
      }

      try {
        setMessagesLoading(true);
        const chat = chats.find(c => c.id === selectedChatId);
        if (!chat) {
          setMessages([]);
          return;
        }

        // Fetch messages using conversation ID
        const messagesResponse = await fetch(`/api/messages/conversations/${chat.conversationId}`);
        if (messagesResponse.ok) {
          const messagesResult = await messagesResponse.json();
          const transformedMessages: Message[] = (messagesResult.data.messages || []).map((msg: any) => ({
            id: msg.id,
            senderId: msg.sender_id,
            text: msg.content,
            timestamp: formatTimestamp(msg.created_at),
            read: msg.read,
          }));
          setMessages(transformedMessages);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
      } finally {
        setMessagesLoading(false);
        // Auto-scroll to bottom when messages load (Instagram behavior)
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    };

    fetchMessages();
  }, [selectedChatId, chats]);

  // Auto-scroll to bottom when new messages arrive (only for new messages, not initial load)
  useEffect(() => {
    // Always scroll to bottom when messages change (Instagram behavior)
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [messages]);

  // Handle send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChatId) return;

    const chat = chats.find(c => c.id === selectedChatId);
    if (!chat) return;

    try {
      // Send message using conversation ID
      const sendResponse = await fetch(`/api/messages/conversations/${chat.conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message.trim() }),
      });

      if (!sendResponse.ok) throw new Error('Failed to send message');
      const sendResult = await sendResponse.json();

      // Add message to local state
      const newMessage: Message = {
        id: sendResult.data.id,
        senderId: sendResult.data.sender_id,
        text: sendResult.data.content,
        timestamp: 'Just now',
        read: false,
      };

      setMessages([...messages, newMessage]);
      setMessage("");

      // Auto-resize textarea
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Optionally show error toast
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // Handle Enter key (Shift+Enter for new line, Enter to send)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // Handle menu toggle
  const handleMenuToggle = () => {
    if (!isMenuOpen && menuButtonRef.current) {
      const button = menuButtonRef.current.querySelector('button');
      if (button) {
        const rect = button.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    }
    setIsMenuOpen(!isMenuOpen);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && menuButtonRef.current && !menuButtonRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Handle clear chat
  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear all messages in this chat? This action cannot be undone.')) {
      setMessages([]);
      setIsMenuOpen(false);
    }
  };

  // Handle block business owner
  const handleBlockUser = () => {
    if (selectedChat && confirm(`Are you sure you want to block ${selectedChat.businessName}? You will no longer receive messages from them.`)) {
      setIsMenuOpen(false);
      setSelectedChatId(null);
    }
  };

  // Handle report user
  const handleReportUser = () => {
    alert('Report functionality coming soon');
    setIsMenuOpen(false);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="dm-list"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-dvh bg-off-white font-urbanist relative overflow-hidden"
        style={{
          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
      >
        {/* Premium Background Orbs with Brand Colors */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-card-bg/8 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-navbar-bg/8 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Main Header - Hidden on mobile when viewing conversation */}
        <div className={selectedChatId ? 'hidden lg:block' : 'block'}>
          <Header
            showSearch={false}
            variant="white"
            backgroundClassName="bg-navbar-bg"
            topPosition="top-0"
            reducedPadding={true}
            whiteText={true}
          />
        </div>

        {/* Split Layout for Larger Screens */}
        <div className="hidden lg:flex pt-20 overflow-hidden h-[calc(100vh-80px)]">

          {/* Left Sidebar - Chat List */}
          <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col bg-off-white border-r border-charcoal/10 lg:border-r h-full overflow-hidden relative">
            {/* Search Bar */}
            <div className="px-4 py-6 flex-shrink-0 bg-off-white">
              <SearchInput
                variant="header"
                placeholder="Search conversations..."
                mobilePlaceholder="Search conversations..."
                onSearch={(q) => {
                  setSearchQuery(q);
                }}
                showFilter={false}
                showSearchIcon={false}
              />
            </div>

            {/* Chat List - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {filteredChats.length === 0 ? (
                <div
                  className="mx-auto w-full max-w-[2000px] px-2 font-urbanist w-full"
                  style={{
                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                  }}
                >
                  <div className="text-center w-full">
                    <div className="w-20 h-20 mx-auto mb-6 bg-sage/10 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-sage" strokeWidth={1.5} />
                    </div>
                    <h3
                      className="text-h2 font-semibold text-charcoal mb-2"
                      style={{
                        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      }}
                    >
                      No conversations found
                    </h3>
                    <p
                      className="text-body-sm text-charcoal/60 mb-6 max-w-md mx-auto"
                      style={{
                        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                        fontWeight: 500,
                      }}
                    >
                      Try adjusting your search
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  {filteredChats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      index={0}
                      isSelected={selectedChatId === chat.id}
                      onClick={() => setSelectedChatId(chat.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Compose Button - Floating Instagram style */}
            <div className="absolute bottom-6 right-6 flex-shrink-0 lg:block hidden">
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  router.push('/dm/new');
                }}
                className="w-14 h-14 bg-sage text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300"
                aria-label="New conversation"
              >
                <Edit3 className="w-6 h-6" strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>

          {/* Right Side - Conversation View */}
          <div className="hidden lg:flex flex-1 flex-col bg-off-white border-l border-charcoal/10 overflow-hidden">
            {selectedChat ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-off-white">
                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0 bg-off-white">
                  <div className="max-w-3xl mx-auto space-y-4">
                    {messages.map((msg) => {
                      const isCurrentUser = msg.senderId === "current-user";
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[65%] lg:max-w-[60%] rounded-[12px] sm:rounded-[12px] px-3 py-2.5 sm:px-4 sm:py-3 ${isCurrentUser
                                ? 'bg-gradient-to-br from-coral to-coral/90 text-white border border-white/30'
                                : 'bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl text-charcoal border border-white/60 ring-1 ring-white/30'
                              }`}
                            style={{
                              fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                            }}
                          >
                            <p className="text-sm sm:text-body-sm md:text-body leading-relaxed whitespace-pre-wrap break-words" style={{
                              fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                            }}>
                              {msg.text}
                            </p>
                            <div className={`flex items-center gap-1 mt-1.5 sm:mt-2 text-xs sm:text-caption ${isCurrentUser ? 'text-white/70' : 'text-charcoal/50'
                              }`} style={{
                                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                              }}>
                              <span>{msg.timestamp}</span>
                              {isCurrentUser && msg.read && (
                                <Check className="w-3 h-3" strokeWidth={2.5} />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Message Input */}
                <div className="flex-shrink-0 bg-off-white border-t border-charcoal/10 px-4 py-3">
                  <form onSubmit={handleSend} className="flex items-end gap-3 max-w-3xl mx-auto">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={message}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full bg-white border border-charcoal/10 rounded-[12px] sm:rounded-[20px] px-4 py-3 pr-12 text-sm sm:text-body-sm md:text-body text-charcoal placeholder:text-sm sm:placeholder:text-body-sm md:placeholder:text-body placeholder-charcoal/40 resize-none focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-all duration-300 max-h-[120px] overflow-y-auto"
                        style={{
                          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                          lineHeight: '1.5',
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!message.trim()}
                      className="w-12 h-12 bg-gradient-to-br from-coral to-coral/90 hover:bg-coral/90 disabled:bg-charcoal/20 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center border border-white/30 transition-all duration-300 hover:scale-110 active:scale-95 min-h-[48px] min-w-[48px]"
                      aria-label="Send message"
                    >
                      <Send className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center max-w-md"
                >
                  {/* Empty State Illustration */}
                  <div className="relative mb-8 flex items-center justify-center">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <MessageSquare className="w-24 h-24 text-navbar-bg" strokeWidth={1.5} />
                      {/* Brand color blobs underneath */}
                      <div className="absolute bottom-0 left-0 w-20 h-20 bg-sage/20 rounded-full blur-2xl"></div>
                      <div className="absolute bottom-2 right-4 w-16 h-16 bg-coral/20 rounded-full blur-2xl"></div>
                    </div>
                  </div>

                  <h2 className="text-h3 font-bold text-charcoal mb-3" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                    This space is feeling a little... empty
                  </h2>
                  <p className="text-body text-charcoal/60 mb-6" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                    Why not be the first to say hi? Hit that pen icon and slide into a new convo.
                  </p>
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Layout - Full Width */}
        <div className="lg:hidden">
          <AnimatePresence mode="wait">
            {/* Show Chat Panel when a chat is selected on mobile */}
            {selectedChatId && selectedChat ? (
              <motion.div
                key="conversation"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
                className="fixed inset-0 z-50 flex flex-col bg-off-white"
              >
                {/* Mobile Chat Header - Fixed at top */}
                <div className="flex-shrink-0 bg-navbar-bg border-b border-charcoal/10 px-4 py-3 flex items-center gap-3 safe-area-inset-top pt-safe">
                  <button
                    onClick={() => setSelectedChatId(null)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors min-h-[44px] min-w-[44px] touch-manipulation"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </button>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {selectedChat.businessImage ? (
                      <div className="relative flex-shrink-0">
                        <Image
                          src={selectedChat.businessImage}
                          alt={selectedChat.businessName}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-lg object-cover border-2 border-white/50"
                        />
                        {selectedChat.verified && (
                          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
                            <Check className="text-white" size={7} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center bg-sage/20 text-sage rounded-lg border-2 border-white/50">
                        <User className="text-sage/70 w-5 h-5" strokeWidth={2} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-white truncate" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                        {selectedChat.businessName}
                      </h2>
                      <p className="text-xs text-white/70 truncate" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                        {selectedChat.category}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 bg-off-white">
                  {messagesLoading ? (
                    <div className="text-center py-8">
                      <p className="text-charcoal/60">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-charcoal/60">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="max-w-3xl mx-auto space-y-3">
                      {messages.map((msg) => {
                        const isCurrentUser = msg.senderId === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-[12px] px-3 py-2.5 ${isCurrentUser
                                  ? 'bg-gradient-to-br from-coral to-coral/90 text-white border border-white/30'
                                  : 'bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl text-charcoal border border-white/60 ring-1 ring-white/30'
                                }`}
                              style={{
                                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                              }}
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{
                                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                              }}>
                                {msg.text}
                              </p>
                              <div className={`flex items-center gap-1 mt-1.5 text-xs ${isCurrentUser ? 'text-white/70' : 'text-charcoal/50'
                                }`} style={{
                                  fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                }}>
                                <span>{msg.timestamp}</span>
                                {isCurrentUser && msg.read && (
                                  <Check className="w-3 h-3" strokeWidth={2.5} />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="flex-shrink-0 bg-off-white border-t border-charcoal/10 px-4 py-3 safe-area-inset-bottom">
                  <form onSubmit={handleSend} className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={message}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full bg-white border border-charcoal/10 rounded-[12px] px-3 py-2.5 pr-10 text-sm text-charcoal placeholder:text-sm placeholder-charcoal/40 resize-none focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-all duration-300 max-h-[100px] overflow-y-auto touch-manipulation"
                        style={{
                          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                          lineHeight: '1.5',
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!message.trim()}
                      className="w-11 h-11 bg-gradient-to-br from-coral to-coral/90 active:bg-coral/90 disabled:bg-charcoal/20 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center border border-white/30 transition-all duration-300 active:scale-95 min-h-[44px] min-w-[44px] touch-manipulation"
                      aria-label="Send message"
                    >
                      <Send className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  </form>
                </div>
              </motion.div>
            ) : (
              /* Show Conversation List when no chat is selected on mobile */
              <motion.main
                key="list"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
                className="relative z-10 mx-auto w-full max-w-[2000px] px-4 sm:px-6 pt-20 sm:pt-24 flex flex-col min-h-[calc(100vh-80px)]"
              >
                {/* Breadcrumb Navigation */}
                <nav className="mb-4 sm:mb-6 px-2 flex-shrink-0" aria-label="Breadcrumb">
                  <ol className="flex items-center gap-2 text-sm sm:text-base">
                    <li>
                      <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        Home
                      </Link>
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="w-4 h-4 text-charcoal/40" />
                    </li>
                    <li>
                      <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        Messages
                      </span>
                    </li>
                  </ol>
                </nav>
                {/* Search Bar */}
                <div className="mb-4 pb-3 flex-shrink-0">
                  <SearchInput
                    variant="header"
                    placeholder="Search conversations..."
                    mobilePlaceholder="Search conversations..."
                    onSearch={(q) => setSearchQuery(q)}
                    showFilter={false}
                    showSearchIcon={false}
                  />
                </div>

                {/* Chat List */}
                {chatsLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-charcoal/60">Loading conversations...</p>
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div
                    className="flex-1 flex items-center justify-center w-full px-2 font-urbanist"
                    style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                    }}
                  >
                    <div className="text-center w-full max-w-md mx-auto">
                      <div className="w-20 h-20 mx-auto mb-6 bg-sage/10 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-8 h-8 text-sage" strokeWidth={1.5} />
                      </div>
                      <h3
                        className="text-h2 font-semibold text-charcoal mb-2"
                        style={{
                          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                        }}
                      >
                        {searchQuery ? 'No conversations found' : 'No messages yet'}
                      </h3>
                      <p
                        className="text-body-sm text-charcoal/60 mb-6 max-w-md mx-auto"
                        style={{
                          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                          fontWeight: 500,
                        }}
                      >
                        {searchQuery
                          ? 'Try adjusting your search or start a new conversation'
                          : 'Start a conversation with business owners to get started!'
                        }
                      </p>
                      {!searchQuery && (
                        <button
                          onClick={() => router.push('/dm/new')}
                          className="inline-flex items-center gap-2 px-6 py-2.5 bg-sage text-white text-body font-semibold rounded-full hover:bg-sage/90 active:bg-sage/80 transition-all duration-300 touch-manipulation"
                          style={{
                            fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                          }}
                        >
                          Start New Conversation
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {filteredChats.map((chat) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        index={0}
                        onClick={() => setSelectedChatId(chat.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Mobile Compose Button - Floating */}
                {!selectedChatId && (
                  <div className="fixed bottom-4 right-4 sm:right-6 z-50 lg:hidden">
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        router.push('/dm/new');
                      }}
                      className="w-12 h-12 sm:w-14 sm:h-14 bg-sage text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300"
                      aria-label="New conversation"
                    >
                      <Edit3 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                    </motion.button>
                  </div>
                )}
              </motion.main>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      <div className="hidden lg:block [&_footer]:pb-safe-area-bottom">
        <Footer />
      </div>
    </AnimatePresence>
  );
}
