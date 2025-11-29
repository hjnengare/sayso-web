"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Search, User, Check, Edit3 } from "react-feather";
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
          className={`relative flex items-center gap-4 px-4 py-3 transition-all duration-200 ${
            isSelected 
              ? 'bg-sage/5 border-l-2 border-sage' 
              : 'hover:bg-charcoal/5 border-l-2 border-transparent'
          }`}
        >
          {/* Profile Picture - Larger Instagram style */}
          <div className="relative flex-shrink-0">
            {!imgError && chat.user.profilePicture && chat.user.profilePicture.trim() !== "" ? (
              <div className="relative w-14 h-14 rounded-full overflow-hidden">
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
              <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-sage/30 to-sage/20 text-sage rounded-full">
                <User className="text-sage w-7 h-7" strokeWidth={2} />
              </div>
            )}

            {/* Online Status */}
            {chat.online && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"
              />
            )}

            {/* Verified Badge */}
            {chat.user.badge === "verified" && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
                <Check className="text-white w-3 h-3" strokeWidth={3} />
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

export default function DMChatListPage() {
  const router = useRouter();
  const [chats] = useState<Chat[]>(generateDummyChats());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const filteredChats = chats.filter((chat) =>
    chat.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedChat = selectedChatId ? chats.find(c => c.id === selectedChatId) : null;

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
        <div className="flex h-[calc(100vh-80px)] lg:h-[calc(100vh-96px)] pt-20 lg:pt-20 overflow-hidden">

          {/* Left Sidebar - Chat List */}
          <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col bg-off-white border-r border-charcoal/10 lg:border-r h-full overflow-hidden relative">
            {/* Search Bar - Instagram style */}
            <div className="px-4 sm:px-6 py-4 border-b border-charcoal/10 flex-shrink-0 bg-off-white">
              <form onSubmit={(e) => e.preventDefault()} className="w-full">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-charcoal/5 rounded-lg px-4 py-2.5 pl-10 text-body-sm placeholder:text-body-sm placeholder:text-charcoal/40 font-normal text-charcoal focus:outline-none focus:bg-charcoal/10 focus:ring-2 focus:ring-sage/20 transition-all duration-200 pr-10 touch-manipulation"
                    style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                    }}
                    aria-label="Search conversations"
                  />
                  {searchQuery ? (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-charcoal/60 hover:text-charcoal transition-colors z-10"
                      aria-label="Clear search"
                      type="button"
                    >
                      <span className="text-charcoal/60 text-lg">×</span>
                    </motion.button>
                  ) : (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="w-4 h-4 text-charcoal/40" strokeWidth={2} />
                    </div>
                  )}
                </div>
              </form>
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
          <div className="hidden lg:flex flex-1 flex-col bg-off-white border-l border-charcoal/10">
            {selectedChat ? (
              <div className="flex-1 flex flex-col">
               
                {/* Conversation content - redirect to detail page for now */}
                <div className="flex-1 flex items-center justify-center bg-off-white">
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => router.push(`/dm/${selectedChat.id}`)}
                    className="px-6 py-3 bg-sage text-white rounded-full text-body-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                  >
                    Open Conversation
                  </motion.button>
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
                    <div className="relative w-32 h-32">
                      {/* Envelope */}
                      <svg width="128" height="96" viewBox="0 0 128 96" className="absolute inset-0">
                        <rect x="16" y="32" width="96" height="64" rx="6" fill="white" stroke="#9BA19B" strokeWidth="2.5" />
                        <path d="M16 32 L64 64 L112 32" stroke="#9BA19B" strokeWidth="2.5" fill="none" />
                        <path d="M24 44 Q36 56 48 44 T72 56 T96 44 T112 56" stroke="#1a1a1a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      </svg>
                      {/* Pen - positioned diagonally over envelope */}
                      <svg width="48" height="48" viewBox="0 0 48 48" className="absolute -top-2 right-4 transform rotate-12">
                        <path d="M10 38 L36 12 L32 8 L8 32 Z" fill="#1a1a1a" />
                        <circle cx="36" cy="12" r="4" fill="white" />
                      </svg>
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
          <main className="relative z-10 mx-auto w-full max-w-[2000px] px-4 sm:px-6 pt-24 sm:pt-28 pb-8">
            {/* Search Bar */}
            <div className="mb-4 pb-3">
              <div className="relative">
                <form onSubmit={(e) => e.preventDefault()} className="w-full">
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-charcoal/5 rounded-lg px-4 py-2.5 text-body-sm placeholder:text-charcoal/40 font-normal text-charcoal focus:outline-none focus:bg-charcoal/10 focus:ring-2 focus:ring-sage/20 transition-all duration-200 pr-10 touch-manipulation"
                    style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                    }}
                    aria-label="Search conversations"
                  />
                  {searchQuery ? (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-2 flex items-center text-charcoal/60 hover:text-charcoal transition-colors z-10"
                      aria-label="Clear search"
                      type="button"
                    >
                      <span className="text-charcoal/60 text-lg">×</span>
                    </motion.button>
                  ) : (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="w-4 h-4 text-charcoal/40" strokeWidth={2} />
                    </div>
                  )}
                </form>
              </div>
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
                className="flex flex-col items-center justify-center py-20 sm:py-24 text-center px-4"
              >
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-card-bg/20 to-navbar-bg/20 rounded-full blur-3xl" />
                  <MessageCircle className="relative w-20 h-20 sm:w-24 sm:h-24 text-charcoal/20" strokeWidth={1.5} />
                </div>
                <h2 className="text-h3 font-bold text-charcoal mb-3" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  No messages yet
                </h2>
                <p className="text-body text-charcoal/60 max-w-md mb-6" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  Start a conversation with reviewers and community members to get started!
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-sage text-white rounded-full font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                  style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                >
                  Start New Conversation
                </motion.button>
              </motion.div>
            )}
          </main>
        </div>

        <Footer />
      </motion.div>
    </AnimatePresence>
  );
}
