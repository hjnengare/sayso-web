"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, User, Check, Edit3, Send, ArrowLeft, ChevronRight, Clock, Search } from "react-feather";
import SearchInput from "../components/SearchInput/SearchInput";
import Footer from "../components/Footer/Footer";
import Header from "../components/Header/Header";
import { useAuth } from "../contexts/AuthContext";

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

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

// Modern Chat Item Component
function ChatItem({ chat, index, isSelected, onClick }: { chat: BusinessChat; index: number; isSelected?: boolean; onClick?: () => void }) {
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
        className={`relative flex items-center gap-4 px-4 py-4 transition-all duration-200 rounded-2xl mx-2 my-1 ${
          isSelected
            ? 'bg-white border border-sage/30 shadow-lg ring-1 ring-sage/20'
            : 'bg-white border border-charcoal/10 hover:border-sage/30 hover:shadow-md hover:-translate-y-0.5'
        }`}
      >
        {/* Business Avatar */}
        <div className="relative flex-shrink-0">
          {!imgError && chat.businessImage && chat.businessImage.trim() !== "" ? (
            <div className={`relative w-14 h-14 rounded-xl overflow-hidden ring-2 ring-offset-2 ring-offset-off-white transition-all duration-200 group-hover:ring-sage/30 ${isSelected ? 'ring-sage' : 'ring-transparent'}`}>
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
            <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-sage/20 to-sage/10 text-sage rounded-xl border-2 border-sage/20">
              <User className="w-7 h-7" strokeWidth={2} />
            </div>
          )}

          {/* Verified Badge */}
          {chat.verified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-off-white shadow-sm">
              <Check className="text-white w-3 h-3" strokeWidth={3} />
            </div>
          )}

          {/* Unread Indicator */}
          {chat.unreadCount > 0 && !isSelected && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-sage rounded-full ring-2 ring-off-white" />
          )}
        </div>

        {/* Chat Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1 gap-2">
            <h3 className={`text-base font-semibold truncate transition-colors duration-200 ${isSelected ? 'text-sage' : 'text-charcoal'}`} style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
              {chat.businessName}
            </h3>
            <span className="text-xs text-charcoal/40 font-medium whitespace-nowrap flex-shrink-0" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
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
                className="min-w-[22px] h-5 px-2 bg-gradient-to-br from-sage to-sage/90 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
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
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [chats, setChats] = useState<BusinessChat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const businessId = searchParams?.get('businessId');

  // Fetch conversations from API
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setChatsLoading(true);
        const url = businessId 
          ? `/api/messages/conversations?businessId=${businessId}`
          : '/api/messages/conversations';
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('API Error:', errorData);
          throw new Error(errorData.error || `Failed to fetch conversations: ${response.status}`);
        }
        const result = await response.json();

        const transformedChats: BusinessChat[] = (result.data || []).map((conv: any) => {
          const business = conv.business;
          const lastMessage = conv.last_message;

          return {
            id: conv.owner_id,
            conversationId: conv.id,
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

    if (user) {
      fetchConversations();
    }
  }, [user, businessId]);

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
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    };

    fetchMessages();
  }, [selectedChatId, chats]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
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
      const sendResponse = await fetch(`/api/messages/conversations/${chat.conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message.trim() }),
      });

      if (!sendResponse.ok) throw new Error('Failed to send message');
      const sendResult = await sendResponse.json();

      const newMessage: Message = {
        id: sendResult.data.id,
        senderId: sendResult.data.sender_id,
        text: sendResult.data.content,
        timestamp: 'Just now',
        read: false,
      };

      setMessages([...messages, newMessage]);
      setMessage("");

      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="min-h-dvh bg-off-white font-urbanist relative" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
      {/* Header */}
      <div className={selectedChatId ? 'hidden lg:block' : 'block'}>
      <Header
        showSearch={true}
        variant="frosty"
        backgroundClassName="bg-navbar-bg"
        searchLayout="floating"
        topPosition="top-0"
        reducedPadding={true}
        whiteText={true}
      />
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex pt-20 overflow-hidden h-[calc(100vh-80px)]">
        {/* Left Sidebar - Chat List */}
        <div className="w-[380px] xl:w-[420px] flex flex-col bg-off-white border-r border-charcoal/10 h-full overflow-hidden">
          {/* Sidebar Header */}
          <div className="flex-shrink-0 px-6 py-5 border-b border-charcoal/10 bg-off-white">
            {/* Breadcrumb Navigation */}
            <nav className="mb-4 sm:mb-6" aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm sm:text-base">
                <li>
                  <Link
                    href="/home"
                    className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium"
                    style={{
                      fontFamily:
                        "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                  >
                    Home
                  </Link>
                </li>
                <li className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-charcoal/40" />
                </li>
                <li>
                  <span
                    className="text-charcoal font-semibold"
                    style={{
                      fontFamily:
                        "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                  >
                    Messages
                  </span>
                </li>
              </ol>
            </nav>

            {/* Title Section */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 
                  className="text-h2 sm:text-h1 font-bold text-charcoal"
                  style={{
                    fontFamily:
                      "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                >
                  Messages
                </h1>
                <p
                  className="text-body-sm text-charcoal/60 mt-1"
                  style={{
                    fontFamily:
                      "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                >
                  {chats.length} {chats.length === 1 ? "conversation" : "conversations"}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => router.push('/dm/new')}
                className="w-10 h-10 bg-gradient-to-br from-sage to-sage/90 text-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200"
                aria-label="New conversation"
              >
                <Edit3 className="w-5 h-5" strokeWidth={2.5} />
              </motion.button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-off-white border border-charcoal/10 rounded-full text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-all duration-200"
                style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto py-2">
            {chatsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-sage/20 border-t-sage rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm text-charcoal/60">Loading conversations...</p>
                </div>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex items-center justify-center h-full px-6">
                <div
                  className="text-center max-w-sm w-full"
                  style={{
                    fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                  }}
                >
                  <div className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
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
                      ? 'Try adjusting your search'
                      : 'Start a conversation with business owners'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => router.push('/dm/new')}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-sage text-white text-body font-semibold rounded-full hover:bg-sage/90 transition-all duration-200"
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
              <div className="space-y-1">
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
            )}
          </div>
        </div>

        {/* Right Side - Conversation View */}
        <div className="flex-1 flex flex-col bg-off-white overflow-hidden">
          {selectedChat ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Conversation Header */}
              <div className="flex-shrink-0 px-6 py-4 bg-off-white border-b border-charcoal/10">
                <div className="flex items-center gap-3">
                  {selectedChat.businessImage ? (
                    <div className="relative flex-shrink-0">
                      <Image
                        src={selectedChat.businessImage}
                        alt={selectedChat.businessName}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-offset-2 ring-offset-white ring-sage/20"
                      />
                      {selectedChat.verified && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
                          <Check className="text-white w-2.5 h-2.5" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-sage/20 to-sage/10 text-sage rounded-xl border-2 border-sage/20">
                      <User className="w-6 h-6" strokeWidth={2} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-charcoal truncate" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                      {selectedChat.businessName}
                    </h2>
                    <p className="text-sm text-charcoal/50 truncate" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                      {selectedChat.category}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0 bg-off-white">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-sage/20 border-t-sage rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-sm text-charcoal/60">Loading messages...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div
                      className="text-center max-w-sm w-full"
                      style={{
                        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      }}
                    >
                      <div className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
                      </div>
                      <h3 
                        className="text-h2 font-semibold text-charcoal mb-2"
                        style={{
                          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                        }}
                      >
                        No messages yet
                      </h3>
                      <p 
                        className="text-body-sm text-charcoal/60 max-w-md mx-auto"
                        style={{
                          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                          fontWeight: 500,
                        }}
                      >
                        Start the conversation!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto space-y-4">
                    {messages.map((msg) => {
                      const isCurrentUser = msg.senderId === user?.id;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                              isCurrentUser
                                ? 'bg-gradient-to-br from-coral to-coral/90 text-white'
                                : 'bg-white text-charcoal border border-charcoal/10'
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
                )}
              </div>

              {/* Message Input */}
              <div className="flex-shrink-0 px-6 py-4 bg-off-white border-t border-charcoal/10">
                <form onSubmit={handleSend} className="flex items-end gap-3 max-w-2xl mx-auto">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={message}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full bg-off-white border border-charcoal/10 rounded-2xl px-4 py-3 pr-12 text-sm text-charcoal placeholder:text-charcoal/40 resize-none focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-all duration-200 max-h-[120px] overflow-y-auto"
                      style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", lineHeight: '1.5' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!message.trim()}
                    className="w-12 h-12 bg-gradient-to-br from-sage to-sage/90 hover:from-sage/90 hover:to-sage disabled:from-charcoal/20 disabled:to-charcoal/20 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
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
                transition={{ delay: 0.1 }}
                className="text-center max-w-md"
              >
                <div className="relative mb-8 flex items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <MessageCircle className="w-24 h-24 text-charcoal/20" strokeWidth={1.5} />
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-sage/20 rounded-full blur-2xl" />
                    <div className="absolute bottom-2 right-4 w-16 h-16 bg-coral/20 rounded-full blur-2xl" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-charcoal mb-3" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  Select a conversation
                </h2>
                <p className="text-base text-charcoal/60" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                  Choose a conversation from the list to start messaging
                </p>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <AnimatePresence mode="wait">
          {selectedChatId && selectedChat ? (
            <motion.div
              key="conversation"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.2, ease: 'easeInOut' }}
              className="fixed inset-0 z-50 flex flex-col bg-off-white"
            >
              {/* Mobile Header */}
              <div className="flex-shrink-0 bg-navbar-bg border-b border-charcoal/10 px-4 py-3 flex items-center gap-3 safe-area-inset-top pt-safe">
                <button
                  onClick={() => setSelectedChatId(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors min-h-[44px] min-w-[44px] touch-manipulation"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
                </button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {selectedChat.businessImage ? (
                    <div className="relative flex-shrink-0">
                      <Image
                        src={selectedChat.businessImage}
                        alt={selectedChat.businessName}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-xl object-cover border-2 border-white/50"
                      />
                      {selectedChat.verified && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
                          <Check className="text-white" size={7} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-sage/20 text-sage rounded-xl border-2 border-white/50">
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

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 bg-off-white">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-sage/20 border-t-sage rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-sm text-charcoal/60">Loading messages...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div
                      className="text-center max-w-sm w-full"
                      style={{
                        fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                      }}
                    >
                      <div className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
                      </div>
                      <h3 
                        className="text-h2 font-semibold text-charcoal mb-2"
                        style={{
                          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                        }}
                      >
                        No messages yet
                      </h3>
                      <p 
                        className="text-body-sm text-charcoal/60 max-w-md mx-auto"
                        style={{
                          fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                          fontWeight: 500,
                        }}
                      >
                        Start the conversation!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isCurrentUser = msg.senderId === user?.id;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-3 py-2.5 shadow-sm ${
                              isCurrentUser
                                ? 'bg-gradient-to-br from-coral to-coral/90 text-white'
                                : 'bg-white text-charcoal border border-charcoal/10'
                            }`}
                            style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {msg.text}
                            </p>
                            <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${isCurrentUser ? 'text-white/70' : 'text-charcoal/40'}`}>
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
                      className="w-full bg-off-white border border-charcoal/10 rounded-2xl px-3 py-2.5 pr-10 text-sm text-charcoal placeholder:text-charcoal/40 resize-none focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-all duration-200 max-h-[100px] overflow-y-auto touch-manipulation"
                      style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", lineHeight: '1.5' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!message.trim()}
                    className="w-11 h-11 bg-gradient-to-br from-sage to-sage/90 hover:from-sage/90 hover:to-sage disabled:from-charcoal/20 disabled:to-charcoal/20 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 min-h-[44px] min-w-[44px] touch-manipulation"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.main
              key="list"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2, ease: 'easeInOut' }}
              className="relative z-10 mx-auto w-full max-w-[2000px] px-4 sm:px-6 pt-20 sm:pt-24 flex flex-col h-dvh sm:min-h-[calc(100vh-80px)]"
            >
              {/* Breadcrumb */}
              <nav className="mb-4 sm:mb-6 flex-shrink-0" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-sm sm:text-base">
                  <li>
                    <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                      Home
                    </Link>
                  </li>
                  <li className="flex items-center">
                    <ChevronRight className="w-4 h-4 text-charcoal/40" />
                  </li>
                  <li>
                    <span className="text-charcoal font-semibold" style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}>
                      Messages
                    </span>
                  </li>
                </ol>
              </nav>

              {/* Search */}
              <div className="mb-4 pb-3 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-off-white border border-charcoal/10 rounded-full text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-all duration-200"
                    style={{ fontFamily: 'Urbanist, system-ui, sans-serif' }}
                  />
                </div>
              </div>

              {/* Chat List */}
              {chatsLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-sage/20 border-t-sage rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-charcoal/60">Loading conversations...</p>
                  </div>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="flex-1 flex items-center justify-center w-full px-2">
                  <div
                    className="text-center w-full max-w-md mx-auto"
                    style={{
                      fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                    }}
                  >
                    <div className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
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
                        ? 'Try adjusting your search'
                        : 'Start a conversation with business owners'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => router.push('/dm/new')}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-sage text-white text-body font-semibold rounded-full hover:bg-sage/90 transition-all duration-300 touch-manipulation"
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
                <div className="flex-1 overflow-y-auto space-y-1">
                  {filteredChats.map((chat, index) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      index={index}
                      onClick={() => setSelectedChatId(chat.id)}
                    />
                  ))}
                </div>
              )}

              {/* Mobile Compose Button */}
              {!selectedChatId && (
                <div className="fixed bottom-4 right-4 sm:right-6 z-50">
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => router.push('/dm/new')}
                    className="w-14 h-14 bg-gradient-to-br from-sage to-sage/90 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200"
                    aria-label="New conversation"
                  >
                    <Edit3 className="w-6 h-6" strokeWidth={2.5} />
                  </motion.button>
                </div>
              )}
            </motion.main>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}
