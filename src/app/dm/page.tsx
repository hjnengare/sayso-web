"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  User,
  Check,
  Edit3,
  Send,
  ArrowLeft,
  ChevronRight,
  Clock,
  Search,
  MoreVertical,
  Info,
  Phone,
  Video,
} from "react-feather";
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
function ChatItem({
  chat,
  index,
  isSelected,
  onClick,
}: {
  chat: BusinessChat;
  index: number;
  isSelected?: boolean;
  onClick?: () => void;
}) {
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
        className={`relative flex items-center gap-3 px-4 py-3 transition-all duration-300 rounded-[20px] mx-2 my-1 ${
          isSelected
            ? "bg-gradient-to-br from-white to-sage/5 border border-sage/40 shadow-md shadow-sage/10 ring-1 ring-sage/20"
            : "bg-off-white border border-charcoal/8 hover:border-sage/25 hover:shadow-sm hover:shadow-sage/5 hover:-translate-y-0.5"
        }`}
      >
        {/* Business Avatar */}
        <div className="relative flex-shrink-0">
          {!imgError && chat.businessImage && chat.businessImage.trim() !== "" ? (
            <div
              className={`relative w-14 h-14 rounded-[20px] overflow-hidden ring-2 ring-offset-2 ring-offset-off-white transition-all duration-300 group-hover:ring-sage/40 group-hover:scale-105 ${
                isSelected ? "ring-sage shadow-md shadow-sage/20" : "ring-transparent"
              }`}
            >
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
            <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-sage/25 to-sage/10 text-sage rounded-[20px] border-2 border-sage/30 shadow-sm">
              <User className="w-7 h-7" strokeWidth={2} />
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
            <h3
              className={`text-base font-bold truncate transition-colors duration-300 ${
                isSelected ? "text-sage" : "text-charcoal group-hover:text-charcoal/90"
              }`}
              style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
            >
              {chat.businessName}
            </h3>
            <span
              className="text-xs text-charcoal/50 font-semibold whitespace-nowrap flex-shrink-0"
              style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
            >
              {chat.timestamp}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p
              className="text-sm text-charcoal/60 truncate leading-snug flex-1"
              style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
            >
              {chat.lastMessage}
            </p>
            {chat.unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="min-w-[24px] h-6 px-2.5 bg-gradient-to-br from-sage via-sage to-sage/95 text-white text-xs font-black rounded-full flex items-center justify-center flex-shrink-0 shadow-md shadow-sage/30"
                style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
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

  const businessId = searchParams?.get("businessId");

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string): string => {
    if (!timestamp) return "Just now";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Fetch conversations from API
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setChatsLoading(true);
        const url = businessId
          ? `/api/messages/conversations?businessId=${businessId}`
          : "/api/messages/conversations";
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          console.error("API Error:", errorData);
          throw new Error(errorData.error || `Failed to fetch conversations: ${response.status}`);
        }
        const result = await response.json();

        const transformedChats: BusinessChat[] = (result.data || []).map((conv: any) => {
          const business = conv.business;
          const lastMessage = conv.last_message;

          return {
            id: conv.owner_id,
            conversationId: conv.id,
            businessId: business?.id || "",
            businessName: business?.name || "Business",
            businessImage: business?.image_url || "",
            category: business?.category || "",
            lastMessage: lastMessage?.content || "No messages yet",
            timestamp: formatTimestamp(lastMessage?.created_at || conv.last_message_at),
            unreadCount: conv.unread_count || 0,
            verified: business?.verified || false,
          };
        });

        setChats(transformedChats);
      } catch (error) {
        console.error("Error fetching conversations:", error);
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

  const selectedChat = selectedChatId ? chats.find((c) => c.id === selectedChatId) : null;

  // Load messages when chat is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChatId) {
        setMessages([]);
        return;
      }

      try {
        setMessagesLoading(true);
        const chat = chats.find((c) => c.id === selectedChatId);
        if (!chat) {
          setMessages([]);
          return;
        }

        const messagesResponse = await fetch(`/api/messages/conversations/${chat.conversationId}`);
        if (messagesResponse.ok) {
          const messagesResult = await messagesResponse.json();
          const transformedMessages: Message[] = (messagesResult.data.messages || []).map(
            (msg: any) => ({
              id: msg.id,
              senderId: msg.sender_id,
              text: msg.content,
              timestamp: formatTimestamp(msg.created_at),
              read: msg.read,
            })
          );
          setMessages(transformedMessages);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
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

    const chat = chats.find((c) => c.id === selectedChatId);
    if (!chat) return;

    try {
      const sendResponse = await fetch(
        `/api/messages/conversations/${chat.conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: message.trim() }),
        }
      );

      if (!sendResponse.ok) throw new Error("Failed to send message");
      const sendResult = await sendResponse.json();

      const newMessage: Message = {
        id: sendResult.data.id,
        senderId: sendResult.data.sender_id,
        text: sendResult.data.content,
        timestamp: "Just now",
        read: false,
      };

      setMessages([...messages, newMessage]);
      setMessage("");

      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Error sending message:", error);
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
    <>
      {/* APPLICATION_SHELL - Desktop */}
      <div
        className="hidden lg:flex lg:flex-col lg:h-screen bg-off-white overflow-hidden"
        style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
      >
        {/* TopNav - Fixed */}
        <div className="flex-shrink-0">
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

        {/* MainArea - Fills Remaining Viewport Height */}
        <div className="flex-1 flex overflow-hidden min-h-0 md:pt-20">
          {/* ConversationListPanel - Left, Fixed Width */}
          <div className="w-[380px] xl:w-[420px] flex flex-col bg-off-white border-r border-charcoal/10 overflow-hidden min-h-0">
            {/* Header - Static */}
            <div className="flex-shrink-0 px-5 pt-4 pb-3 bg-off-white">
              {/* Breadcrumb Navigation */}
              <nav className="mb-4" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-sm">
                  <li>
                    <Link
                      href="/home"
                      className="text-charcoal/60 hover:text-charcoal transition-colors duration-200 font-medium"
                      style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
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
                      style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                    >
                      Messages
                    </span>
                  </li>
                </ol>
              </nav>

              {/* App Brand / Title + Action Icons */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1
                    className="text-2xl font-bold text-charcoal leading-tight"
                    style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                  >
                    Messages
                  </h1>
                  <p
                    className="text-sm text-charcoal/60 mt-1"
                    style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                  >
                    {chats.length} {chats.length === 1 ? "conversation" : "conversations"}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push("/dm/new")}
                  className="w-10 h-10 bg-gradient-to-br from-sage via-sage to-sage/95 text-white rounded-[20px] flex items-center justify-center shadow-md shadow-sage/20 hover:shadow-lg hover:shadow-sage/30 transition-all duration-200"
                  aria-label="New conversation"
                >
                  <Edit3 className="w-4.5 h-4.5" strokeWidth={2.5} />
                </motion.button>
              </div>
            </div>

            {/* SearchBar - Static */}
            <div className="flex-shrink-0 px-5 pb-3 border-b border-charcoal/5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-charcoal/10 rounded-[20px] text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/40 transition-all duration-200"
                  style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                />
              </div>
            </div>

            {/* ConversationList - Scrollable ONLY */}
            <div className="flex-1 overflow-y-auto px-1.5 min-h-0">
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
                  <div className="text-center max-w-xs" style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}>
                    {/* Icon */}
                    <div className="w-16 h-16 mx-auto mb-4 bg-charcoal/5 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-charcoal/40" strokeWidth={1.5} />
                    </div>

                    {/* Text Group */}
                    <h3 className="text-lg font-bold text-charcoal mb-2">
                      {searchQuery ? "No conversations found" : "No messages yet"}
                    </h3>
                    <p className="text-sm text-charcoal/60 mb-8">
                      {searchQuery ? "Try adjusting your search" : "Start a conversation with business owners"}
                    </p>

                    {/* CTA - Anchored to empty state */}
                    {!searchQuery && (
                      <button
                        onClick={() => router.push("/dm/new")}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-sage via-sage to-sage/95 text-white text-sm font-semibold rounded-[20px] hover:from-sage/95 hover:to-sage shadow-md shadow-sage/20 hover:shadow-lg hover:shadow-sage/30 transition-all duration-200"
                      >
                        <Edit3 className="w-4 h-4" strokeWidth={2.5} />
                        Start New Conversation
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
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

          {/* ChatPanel - Right, Flexible Width */}
          <div className="flex-1 flex flex-col bg-off-white overflow-hidden min-h-0">
            {selectedChat ? (
              <>
                {/* ChatHeader - Fixed */}
                <div className="flex-shrink-0 px-6 py-4 bg-off-white border-b border-charcoal/10">
                  <div className="flex items-center justify-between gap-4">
                    {/* Avatar and Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {selectedChat.businessImage ? (
                        <div className="relative flex-shrink-0">
                          <Image
                            src={selectedChat.businessImage}
                            alt={selectedChat.businessName}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-[20px] object-cover ring-2 ring-sage/20"
                          />
                          {selectedChat.verified && (
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
                          <h2
                            className="text-lg font-bold text-charcoal truncate"
                            style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                          >
                            {selectedChat.businessName}
                          </h2>
                          {selectedChat.verified && (
                            <span
                              className="flex-shrink-0 px-2 py-0.5 bg-blue-500/10 text-blue-600 text-xs font-semibold rounded-md"
                              style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                            >
                              Verified
                            </span>
                          )}
                        </div>
                        <p
                          className="text-sm text-charcoal/60 truncate"
                          style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                        >
                          {selectedChat.category || "Business Owner"}
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

                {/* MessageThread - Scrollable, Flexible Height */}
                <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 bg-off-white">
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
                          fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                        }}
                      >
                        <div className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center">
                          <MessageCircle className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
                        </div>
                        <h3
                          className="text-h2 font-semibold text-charcoal mb-2"
                          style={{
                            fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                          }}
                        >
                          No messages yet
                        </h3>
                        <p
                          className="text-body-sm text-charcoal/60 max-w-md mx-auto"
                          style={{
                            fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                            fontWeight: 500,
                          }}
                        >
                          Start the conversation!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-2xl mx-auto space-y-3">
                      {messages.map((msg) => {
                        const isCurrentUser = msg.senderId === user?.id;
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-full px-3.5 py-2.5 ${
                                isCurrentUser
                                  ? "bg-gradient-to-br from-coral via-coral to-coral/95 text-white shadow-lg shadow-coral/20"
                                  : "bg-off-white text-charcoal border border-charcoal/10 shadow-md shadow-charcoal/5"
                              }`}
                              style={{
                                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                              }}
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                              <div
                                className={`flex items-center gap-1.5 mt-1.5 text-xs ${
                                  isCurrentUser ? "text-white/70" : "text-charcoal/40"
                                }`}
                              >
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

                {/* MessageComposer - Fixed to Bottom of ChatPanel */}
                <div className="flex-shrink-0 px-6 py-3 bg-off-white border-t border-charcoal/10">
                  <form onSubmit={handleSend} className="flex items-end gap-2.5 max-w-3xl mx-auto">
                    {/* Attachment Button */}
                    <button
                      type="button"
                      className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-[20px] hover:bg-charcoal/5 text-charcoal/60 hover:text-charcoal transition-colors mb-0.5"
                      aria-label="Attach file"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                    </button>

                    {/* Message Input */}
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={message}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full bg-off-white/50 border border-charcoal/10 rounded-[20px] px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40 resize-none focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/40 focus:bg-off-white transition-all duration-200 max-h-[120px] overflow-y-auto"
                        style={{
                          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                          lineHeight: "1.5",
                        }}
                      />
                    </div>

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={!message.trim()}
                      className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-sage via-sage to-sage/95 hover:from-sage/95 hover:to-sage disabled:from-charcoal/20 disabled:to-charcoal/20 disabled:cursor-not-allowed text-white rounded-[20px] flex items-center justify-center shadow-md shadow-sage/20 hover:shadow-lg hover:shadow-sage/30 transition-all duration-200 disabled:shadow-none mb-0.5"
                      aria-label="Send message"
                    >
                      <Send className="w-4.5 h-4.5" strokeWidth={2.5} />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              // CenteredEmptyState - No Conversation Selected
              <div className="flex-1 flex items-center justify-center p-8 bg-off-white">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center max-w-md"
                >
                  <div className="relative mb-8 flex items-center justify-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-sage/10 to-coral/10 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-12 h-12 text-charcoal/30" strokeWidth={1.5} />
                    </div>
                  </div>
                  <h2
                    className="text-2xl font-bold text-charcoal mb-2"
                    style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                  >
                    Select a conversation
                  </h2>
                  <p
                    className="text-base text-charcoal/60 mb-6"
                    style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                  >
                    Choose a conversation from the list to start messaging
                  </p>
                 
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* APPLICATION_SHELL - Mobile */}
      <div
        className="lg:hidden flex flex-col h-screen bg-off-white overflow-hidden"
        style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
      >
        {/* TopNav - Fixed */}
        <div className={selectedChatId ? "hidden" : "flex-shrink-0"}>
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

        {/* MainArea - Fills Remaining Viewport Height */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <AnimatePresence mode="wait">
            {selectedChatId && selectedChat ? (
              <motion.div
                key="conversation"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.2, ease: "easeInOut" }}
                className="fixed inset-0 z-50 flex flex-col bg-off-white overflow-hidden"
              >
                {/* ChatHeader - Fixed (Mobile) */}
                <div className="flex-shrink-0 bg-navbar-bg border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3 safe-area-inset-top pt-safe">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => setSelectedChatId(null)}
                      className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-[20px] bg-off-white/10 hover:bg-off-white/20 active:bg-off-white/30 transition-colors min-h-[44px] min-w-[44px] touch-manipulation"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </button>
                    {selectedChat.businessImage ? (
                      <div className="relative flex-shrink-0">
                        <Image
                          src={selectedChat.businessImage}
                          alt={selectedChat.businessName}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-[20px] object-cover border-2 border-white/30"
                        />
                        {selectedChat.verified && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-navbar-bg">
                            <Check className="text-white w-2 h-2" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center bg-off-white/10 text-white rounded-xl">
                        <User className="w-5 h-5" strokeWidth={2} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2
                        className="text-base font-bold text-white truncate"
                        style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                      >
                        {selectedChat.businessName}
                      </h2>
                      <p
                        className="text-xs text-white/70 truncate"
                        style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                      >
                        {selectedChat.category || "Business Owner"}
                      </p>
                    </div>
                  </div>
                  <button
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-[20px] hover:bg-off-white/10 text-white/80 hover:text-white transition-colors min-h-[44px] min-w-[44px] touch-manipulation"
                    aria-label="More options"
                  >
                    <MoreVertical className="w-5 h-5" strokeWidth={2} />
                  </button>
                </div>

                {/* MessageThread - Scrollable (Mobile) */}
                <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0 bg-off-white">
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
                          fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                        }}
                      >
                        <div className="w-20 h-20 mx-auto mb-6 bg-charcoal/10 rounded-full flex items-center justify-center">
                          <MessageCircle className="w-10 h-10 text-charcoal/60" strokeWidth={1.5} />
                        </div>
                        <h3
                          className="text-h2 font-semibold text-charcoal mb-2"
                          style={{
                            fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                          }}
                        >
                          No messages yet
                        </h3>
                        <p
                          className="text-body-sm text-charcoal/60 max-w-md mx-auto"
                          style={{
                            fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
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
                            className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-full px-3 py-2 ${
                                isCurrentUser
                                  ? "bg-gradient-to-br from-coral via-coral to-coral/95 text-white shadow-lg shadow-coral/20"
                                  : "bg-off-white text-charcoal border border-charcoal/10 shadow-md shadow-charcoal/5"
                              }`}
                              style={{
                                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                              }}
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                              <div
                                className={`flex items-center gap-1.5 mt-1.5 text-xs ${
                                  isCurrentUser ? "text-white/70" : "text-charcoal/40"
                                }`}
                              >
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

                {/* MessageComposer - Fixed to Bottom (Mobile) */}
                <div className="flex-shrink-0 bg-off-white border-t border-charcoal/10 px-4 py-2 safe-area-inset-bottom">
                  <form onSubmit={handleSend} className="flex items-end gap-2">
                    {/* Attachment Button */}
                    <button
                      type="button"
                      className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-[20px] hover:bg-charcoal/5 active:bg-charcoal/10 text-charcoal/60 transition-colors min-h-[44px] min-w-[44px] touch-manipulation"
                      aria-label="Attach file"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                    </button>

                    {/* Message Input */}
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={message}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full bg-off-white/50 border border-charcoal/10 rounded-[20px] px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40 resize-none focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/40 focus:bg-off-white transition-all duration-200 max-h-[100px] overflow-y-auto touch-manipulation"
                        style={{
                          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                          lineHeight: "1.5",
                        }}
                      />
                    </div>

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={!message.trim()}
                      className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-sage via-sage to-sage/95 hover:from-sage/95 hover:to-sage disabled:from-charcoal/20 disabled:to-charcoal/20 disabled:cursor-not-allowed text-white rounded-[20px] flex items-center justify-center shadow-md shadow-sage/20 active:shadow-lg active:shadow-sage/30 transition-all duration-200 disabled:shadow-none active:scale-95 min-h-[44px] min-w-[44px] touch-manipulation"
                      aria-label="Send message"
                    >
                      <Send className="w-4.5 h-4.5" strokeWidth={2.5} />
                    </button>
                  </form>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.2, ease: "easeInOut" }}
                className="flex-1 flex flex-col overflow-hidden min-h-0"
              >
                {/* ConversationListPanel - Mobile */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  {/* Header - Static */}
                  <div className="flex-shrink-0 pt-20 sm:pt-24 pb-0 bg-off-white">
                    <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6">
                      {/* Breadcrumb Navigation */}
                      <nav className="mb-4" aria-label="Breadcrumb">
                        <ol className="flex items-center gap-2 text-sm">
                          <li>
                            <Link
                              href="/home"
                              className="text-charcoal/60 hover:text-charcoal transition-colors duration-200 font-medium"
                              style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
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
                              style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                            >
                              Messages
                            </span>
                          </li>
                        </ol>
                      </nav>

                      {/* App Brand / Title */}
                      <div className="mb-4">
                        <h1
                          className="text-2xl font-bold text-charcoal leading-tight"
                          style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                        >
                          Messages
                        </h1>
                        <p
                          className="text-sm text-charcoal/60 mt-1"
                          style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                        >
                          {chats.length} {chats.length === 1 ? "conversation" : "conversations"}
                        </p>
                      </div>
                    </div>

                    {/* SearchBar - Static */}
                    <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 pb-3 border-b border-charcoal/5">
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                        <input
                          type="text"
                          placeholder="Search conversations..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white border border-charcoal/10 rounded-[20px] text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/40 transition-all duration-200"
                          style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ConversationList - Scrollable ONLY */}
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {/* Chat List */}
                    {chatsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-sage/20 border-t-sage rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-sm text-charcoal/60">Loading conversations...</p>
                        </div>
                      </div>
                    ) : filteredChats.length === 0 ? (
                      // Empty State Group - Centered (Mobile)
                      <div className="flex items-center justify-center min-h-[60vh]">
                        <div
                          className="text-center w-full max-w-xs mx-auto px-4"
                          style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
                        >
                          {/* Icon */}
                          <div className="w-16 h-16 mx-auto mb-4 bg-charcoal/5 rounded-full flex items-center justify-center">
                            <MessageCircle className="w-8 h-8 text-charcoal/40" strokeWidth={1.5} />
                          </div>

                          {/* Text Group */}
                          <h3 className="text-lg font-bold text-charcoal mb-2">
                            {searchQuery ? "No conversations found" : "No messages yet"}
                          </h3>
                          <p className="text-sm text-charcoal/60 mb-8">
                            {searchQuery ? "Try adjusting your search" : "Start a conversation with business owners"}
                          </p>

                          {/* CTA - Anchored to empty state */}
                          {!searchQuery && (
                            <button
                              onClick={() => router.push("/dm/new")}
                              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-sage via-sage to-sage/95 text-white text-sm font-semibold rounded-[20px] hover:from-sage/95 hover:to-sage shadow-md shadow-sage/20 hover:shadow-lg hover:shadow-sage/30 transition-all duration-200 touch-manipulation"
                            >
                              <Edit3 className="w-4 h-4" strokeWidth={2.5} />
                              Start New Conversation
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 pb-6">
                        <div className="space-y-0.5">
                          {filteredChats.map((chat, index) => (
                            <ChatItem
                              key={chat.id}
                              chat={chat}
                              index={index}
                              onClick={() => setSelectedChatId(chat.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mobile Compose Button - Fixed Position */}
                    {!selectedChatId && (
                      <div className="fixed bottom-6 right-4 sm:right-6 z-50 safe-area-inset-bottom">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => router.push("/dm/new")}
                          className="w-14 h-14 bg-gradient-to-br from-sage via-sage to-sage/95 text-white rounded-full flex items-center justify-center shadow-2xl shadow-sage/40 active:shadow-sage/50 transition-all duration-200 touch-manipulation"
                          aria-label="New conversation"
                        >
                          <Edit3 className="w-5 h-5" strokeWidth={2.5} />
                        </motion.button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
