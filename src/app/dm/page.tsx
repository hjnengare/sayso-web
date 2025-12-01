"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Search, User, Check, Edit3, MessageSquare, Send, MoreVertical, Trash2, AlertTriangle, UserX, ArrowLeft, ChevronRight } from "react-feather";
import { createPortal } from "react-dom";
import SearchInput from "../components/SearchInput/SearchInput";
import { TOP_REVIEWERS, type Reviewer } from "../data/communityHighlightsData";
import Footer from "../components/Footer/Footer";
import Header from "../components/Header/Header";
import StaggeredContainer from "../components/Animations/StaggeredContainer";
import AnimatedElement from "../components/Animations/AnimatedElement";

interface Chat {
  id: string;
  user: Reviewer;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  online: boolean;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

// Instagram-like Chat Item Component
function ChatItem({ chat, index, isSelected, onClick }: { chat: Chat; index: number; isSelected?: boolean; onClick?: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <AnimatedElement index={index} direction="bottom">
      <motion.button
        onClick={onClick}
        className="group relative block w-full text-left"
        whileHover={{ x: 2 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className={`relative flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 transition-all duration-200 border-b border-charcoal/10 ${
            isSelected 
              ? 'bg-sage/5 border-l-2 border-sage' 
              : 'hover:bg-charcoal/5 border-l-2 border-transparent'
          }`}
        >
          {/* Profile Picture - Larger Instagram style */}
          <div className="relative flex-shrink-0">
            {!imgError && chat.user.profilePicture && chat.user.profilePicture.trim() !== "" ? (
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden">
                <Image
                  src={chat.user.profilePicture}
                  alt={chat.user.name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              </div>
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-gradient-to-br from-sage/30 to-sage/20 text-sage rounded-full">
                <User className="text-sage w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
              </div>
            )}

            {/* Online Status */}
            {chat.online && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white"
              />
            )}

            {/* Verified Badge */}
            {chat.user.badge === "verified" && (
              <div className="absolute -top-1 -right-1 w-4.5 h-4.5 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
                <Check className="text-white w-2.5 h-2.5 sm:w-3 sm:h-3" strokeWidth={3} />
              </div>
            )}
          </div>

          {/* Chat Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5 gap-2">
              <h3 className={`text-body font-semibold truncate transition-colors duration-200 ${isSelected ? 'text-sage' : 'text-charcoal'}`} style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                {chat.user.name}
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
    </AnimatedElement>
  );
}

// Generate dummy chat data from reviewers
const generateDummyChats = (): Chat[] => {
  const lastMessages = [
    "Hey! Thanks for reaching out. I'd love to chat!",
    "Hi! I really enjoyed reading your reviews.",
    "Thank you so much! That means a lot.",
    "Great to hear from you! How can I help?",
    "I saw your review about that restaurant. I totally agree!",
    "Thanks for the recommendation! I'll check it out.",
    "That's a great point. I had a similar experience.",
    "Looking forward to chatting more about this!",
  ];

  const timestamps = [
    "Just now",
    "2 min ago",
    "15 min ago",
    "1 hr ago",
    "2 hrs ago",
    "Yesterday",
    "2 days ago",
    "Last week",
  ];

  return TOP_REVIEWERS.slice(0, 8).map((reviewer, index) => ({
    id: reviewer.id,
    user: reviewer,
    lastMessage: lastMessages[index % lastMessages.length],
    timestamp: timestamps[index % timestamps.length],
    unreadCount: index < 3 ? (index % 3) + 1 : 0,
    online: index < 4,
  }));
};

// Generate mock messages for a chat
const generateMockMessages = (chatId: string): Message[] => {
  return [
    {
      id: "1",
      senderId: chatId,
      text: "Hey! Thanks for reaching out. I'd love to chat about your recent review!",
      timestamp: "2 hours ago",
      read: true,
    },
    {
      id: "2",
      senderId: "current-user",
      text: "Hi! I really enjoyed reading your reviews. You have great insights!",
      timestamp: "1 hour ago",
      read: true,
    },
    {
      id: "3",
      senderId: chatId,
      text: "Thank you so much! That means a lot. I try to be thorough and honest in my reviews.",
      timestamp: "45 minutes ago",
      read: true,
    },
  ];
};

export default function DMChatListPage() {
  const router = useRouter();
  const [chats] = useState<Chat[]>(generateDummyChats());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuButtonRef = useRef<HTMLDivElement>(null);

  const filteredChats = chats.filter((chat) =>
    chat.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedChat = selectedChatId ? chats.find(c => c.id === selectedChatId) : null;

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChatId) {
      const mockMessages = generateMockMessages(selectedChatId);
      setMessages(mockMessages);
    } else {
      setMessages([]);
    }
  }, [selectedChatId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle send message
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChatId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "current-user",
      text: message.trim(),
      timestamp: "Just now",
      read: false,
    };

    setMessages([...messages, newMessage]);
    setMessage("");

    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
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

  // Handle block user
  const handleBlockUser = () => {
    if (selectedChat && confirm(`Are you sure you want to block ${selectedChat.user.name}? You will no longer receive messages from them.`)) {
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
        
        {/* Main Header */}
        <Header
          showSearch={false}
          variant="white"
          backgroundClassName="bg-navbar-bg"
          topPosition="top-0"
          reducedPadding={true}
          whiteText={true}
        />
         
        {/* Split Layout for Larger Screens */}
        <div className="hidden lg:flex pt-20 overflow-hidden h-[calc(100vh-80px)]">

          {/* Left Sidebar - Chat List */}
          <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col bg-off-white border-r border-charcoal/10 lg:border-r h-full overflow-hidden relative">
            {/* Search Bar */}
            <div className="px-4 sm:px-6 py-4 border-b border-charcoal/10 flex-shrink-0 bg-off-white">
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
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-card-bg/15 rounded-full blur-2xl" />
                    <MessageCircle className="relative w-16 h-16 text-charcoal/20" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-body font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                    No conversations found
                  </h3>
                  <p className="text-body-sm text-charcoal/60 max-w-md" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                    Try adjusting your search
                  </p>
                </motion.div>
              ) : (
                <StaggeredContainer>
                  <div className="space-y-0">
                    {filteredChats.map((chat, index) => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        index={index}
                        isSelected={selectedChatId === chat.id}
                        onClick={() => setSelectedChatId(chat.id)}
                      />
                    ))}
                  </div>
                </StaggeredContainer>
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
                            className={`max-w-[65%] lg:max-w-[60%] rounded-xl sm:rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 ${
                              isCurrentUser
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
                            <div className={`flex items-center gap-1 mt-1.5 sm:mt-2 text-xs sm:text-caption ${
                              isCurrentUser ? 'text-white/70' : 'text-charcoal/50'
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
                        className="w-full bg-white border border-charcoal/10 rounded-2xl sm:rounded-[20px] px-4 py-3 pr-12 text-sm sm:text-body-sm md:text-body text-charcoal placeholder:text-sm sm:placeholder:text-body-sm md:placeholder:text-body placeholder-charcoal/40 resize-none focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-all duration-300 max-h-[120px] overflow-y-auto"
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
          {/* Mobile Main Content */}
          <main className="relative z-10 mx-auto w-full max-w-[2000px] px-4 sm:px-6 pt-20 sm:pt-24 pb-20 sm:pb-8">
            {/* Breadcrumb Navigation */}
            <nav className="mb-4 sm:mb-6 px-2" aria-label="Breadcrumb">
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
            <div className="mb-4 pb-3">
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
            {filteredChats.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4"
              >
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-card-bg/15 rounded-full blur-2xl" />
                  <MessageCircle className="relative w-16 h-16 sm:w-20 sm:h-20 text-charcoal/20" strokeWidth={1.5} />
                </div>
                <h3 className="text-body font-semibold text-charcoal mb-2" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  No conversations found
                </h3>
                <p className="text-body-sm text-charcoal/60 max-w-md" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  Try adjusting your search or start a new conversation
                </p>
              </motion.div>
            ) : (
              <StaggeredContainer>
                <div className="space-y-0">
                  {filteredChats.map((chat, index) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      index={index}
                      onClick={() => router.push(`/dm/${chat.id}`)}
                    />
                  ))}
                </div>
              </StaggeredContainer>
            )}

            {/* Empty State for No Chats */}
            {chats.length === 0 && filteredChats.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 sm:py-24 text-center px-4"
              >
                <div className="relative mb-6 sm:mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-card-bg/20 to-navbar-bg/20 rounded-full blur-3xl" />
                  <MessageCircle className="relative w-16 h-16 sm:w-24 sm:h-24 text-charcoal/20" strokeWidth={1.5} />
                </div>
                <h2 className="text-h3 font-bold text-charcoal mb-2 sm:mb-3" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  No messages yet
                </h2>
                <p className="text-body-sm sm:text-body text-charcoal/60 max-w-md mb-4 sm:mb-6" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  Start a conversation with reviewers and community members to get started!
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-sage text-white rounded-full text-body-sm sm:text-body font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                  style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                >
                  Start New Conversation
                </motion.button>
              </motion.div>
            )}

            {/* Mobile Compose Button - Floating */}
            <div className="fixed bottom-20 right-4 sm:right-6 z-50 lg:hidden">
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
          </main>
        </div>

        <div className="hidden lg:block">
          <Footer />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
