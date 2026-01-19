"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Check,
  Send,
  ChevronRight,
  Search,
  MoreVertical,
} from "lucide-react";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

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

function ChatItem({
  chat,
  isSelected,
  onClick,
}: {
  chat: BusinessChat;
  isSelected?: boolean;
  onClick?: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      className="w-full text-left"
      whileHover={{ scale: 1.01 }}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          isSelected
            ? "bg-sage/20 border border-sage/40"
            : "hover:bg-white/50 border border-transparent"
        }`}
      >
        {/* Avatar */}
        {!imgError && chat.businessImage ? (
          <div className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
            <Image
              src={chat.businessImage}
              alt={chat.businessName}
              width={48}
              height={48}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
            {chat.verified && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center ring-1 ring-white">
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
            )}
          </div>
        ) : (
          <div className="w-12 h-12 flex items-center justify-center bg-sage/20 text-sage rounded-lg flex-shrink-0">
            <MessageCircle className="w-6 h-6" strokeWidth={1.5} />
          </div>
        )}

        {/* Chat info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold text-charcoal text-sm truncate">{chat.businessName}</h3>
            <span className="text-xs text-charcoal/50 flex-shrink-0">{chat.timestamp}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-charcoal/60 truncate flex-1">{chat.lastMessage}</p>
            {chat.unreadCount > 0 && (
              <span className="flex-shrink-0 w-5 h-5 bg-coral text-white text-xs font-bold rounded-full flex items-center justify-center">
                {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export default function DMPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // URL state
  const conversationParam = searchParams?.get("conversation");

  // Data state
  const [chats, setChats] = useState<BusinessChat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const formatTimestamp = (isoDate: string): string => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (daysDiff === 1) return "Yesterday";
    if (daysDiff < 7) return `${daysDiff}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Fetch chats
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;

      try {
        setChatsLoading(true);
        const response = await fetch("/api/messages/conversations", { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Failed to fetch conversations`);
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

    if (user) fetchConversations();
  }, [user]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversationParam) {
        setMessages([]);
        return;
      }

      try {
        setMessagesLoading(true);
        const response = await fetch(`/api/messages/conversations/${conversationParam}`, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }

        const result = await response.json();
        setMessages(
          (result.data?.messages || []).map((msg: any) => ({
            id: msg.id,
            senderId: msg.sender_id,
            text: msg.content,
            timestamp: formatTimestamp(msg.created_at),
            read: msg.read,
          }))
        );

        // Mark as read
        await fetch(`/api/messages/conversations/${conversationParam}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }).catch(() => {});
      } catch (error) {
        console.error("Error fetching messages:", error);
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessages();
  }, [conversationParam]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || !conversationParam) return;

    try {
      const response = await fetch(`/api/messages/conversations/${conversationParam}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const result = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          id: result.data.id,
          senderId: user?.id || "",
          text: result.data.content,
          timestamp: "Just now",
          read: true,
        },
      ]);

      setMessage("");
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
        inputRef.current.focus();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      showToast("Failed to send message", "sage");
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  const openConversation = (conversationId: string) => {
    const qs = new URLSearchParams(searchParams?.toString() || "");
    qs.set("conversation", conversationId);
    router.replace(`/dm?${qs.toString()}`, { scroll: false });
  };

  const filteredChats = useMemo(
    () => chats.filter((chat) => chat.businessName.toLowerCase().includes(searchQuery.toLowerCase())),
    [chats, searchQuery]
  );

  const selectedChat = useMemo(() => {
    if (!conversationParam) return null;
    return chats.find((c) => c.conversationId === conversationParam) || null;
  }, [conversationParam, chats]);

  return (
    <div className="min-h-dvh bg-off-white flex flex-col overflow-hidden" style={{ fontFamily: "'Urbanist', system-ui, sans-serif" }}>
      <div className="flex-shrink-0">
        <Header
          showSearch={false}
          variant="white"
          backgroundClassName="bg-navbar-bg"
          topPosition="top-0"
          reducedPadding={true}
          whiteText={true}
        />
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 pt-16 sm:pt-20 md:pt-20">
        {/* LEFT: Conversation list */}
        <div className="w-full md:w-[400px] lg:w-[480px] flex flex-col bg-off-white md:border-r border-white/60 overflow-hidden min-h-0">
          {/* Header */}
          <div className="flex-shrink-0 px-6 pt-4 sm:pt-6 pb-4 bg-off-white">
            <nav className="mb-4" aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm">
                <li>
                  <Link href="/home" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium">
                    Home
                  </Link>
                </li>
                <li className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-charcoal/60" />
                </li>
                <li>
                  <span className="text-charcoal font-semibold">Messages</span>
                </li>
              </ol>
            </nav>

            <h1 className="text-3xl font-bold text-charcoal mb-1">Messages</h1>
            <p className="text-sm text-charcoal/60 font-medium">
              {chats.length} {chats.length === 1 ? "conversation" : "conversations"}
            </p>
          </div>

          {/* Search */}
          <div className="flex-shrink-0 px-6 pb-4 border-b border-white/60">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/60" />
              <input
                type="text"
                placeholder="Discover & connect"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/80 backdrop-blur-sm border border-charcoal/20 rounded-full text-sm text-charcoal placeholder:text-charcoal/70 focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/40 transition-all duration-200"
              />
            </div>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-8">
            {chatsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-10 h-10 border-2 border-sage/20 border-t-sage rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-charcoal/60 font-medium">Loading...</p>
                </div>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 py-12">
                <MessageCircle className="w-12 h-12 text-charcoal/20 mb-4" />
                <h3 className="text-base font-semibold text-charcoal mb-1">
                  {searchQuery ? "No chats found" : "No messages"}
                </h3>
                <p className="text-sm text-charcoal/60 text-center">
                  {searchQuery ? "Try adjusting your search" : "Start messaging with a business"}
                </p>
              </div>
            ) : (
              <div className="space-y-1 py-2">
                {filteredChats.map((chat) => (
                  <ChatItem
                    key={chat.conversationId}
                    chat={chat}
                    isSelected={selectedChat?.conversationId === chat.conversationId}
                    onClick={() => openConversation(chat.conversationId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Message view */}
        <AnimatePresence mode="wait">
          {selectedChat ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="hidden md:flex flex-1 flex-col bg-off-white overflow-hidden min-h-0"
            >
              {/* Chat header */}
              <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-b border-white/60">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {selectedChat.businessImage ? (
                      <div className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
                        <Image
                          src={selectedChat.businessImage}
                          alt={selectedChat.businessName}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                        {selectedChat.verified && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center ring-1 ring-white">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-12 h-12 flex items-center justify-center bg-sage/20 text-sage rounded-lg">
                        <MessageCircle className="w-6 h-6" strokeWidth={1.5} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-charcoal text-sm truncate">{selectedChat.businessName}</h2>
                      <p className="text-xs text-charcoal/60 truncate">{selectedChat.category || "Business"}</p>
                    </div>
                  </div>

                  <button className="p-2 hover:bg-white/50 rounded-lg transition-colors text-charcoal/60 hover:text-charcoal">
                    <MoreVertical className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 bg-off-white">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-10 h-10 border-2 border-sage/20 border-t-sage rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-charcoal/60 font-medium">Loading...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 text-charcoal/20 mx-auto mb-3" />
                      <p className="text-sm text-charcoal/60 font-medium">Start the conversation</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-2xl">
                    {messages.map((msg) => {
                      const isCurrentUser = msg.senderId === user?.id;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isCurrentUser
                                ? "bg-gradient-to-br from-coral via-coral to-coral/90 text-white shadow-md shadow-coral/20"
                                : "bg-white border border-charcoal/10 text-charcoal"
                            }`}
                          >
                            <p className="break-words">{msg.text}</p>
                            <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${isCurrentUser ? "text-white/70" : "text-charcoal/50"}`}>
                              <span>{msg.timestamp}</span>
                              {isCurrentUser && msg.read && <Check className="w-3 h-3" strokeWidth={3} />}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-t border-white/60">
                <form onSubmit={handleSend} className="flex items-end gap-2.5">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={message}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full bg-white/80 backdrop-blur-sm border border-charcoal/20 rounded-lg px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/70 resize-none focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage/40 transition-all duration-200 max-h-[120px] overflow-y-auto"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!message.trim()}
                    className="flex-shrink-0 w-9 h-9 bg-sage hover:bg-sage/90 disabled:bg-charcoal/20 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center shadow-md shadow-sage/20 hover:shadow-lg transition-all duration-200 disabled:shadow-none"
                  >
                    <Send className="w-4 h-4" strokeWidth={2} />
                  </button>
                </form>
              </div>
            </motion.div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center bg-off-white">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <MessageCircle className="w-16 h-16 text-charcoal/10 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-charcoal mb-1">Select a conversation</h2>
                <p className="text-sm text-charcoal/60">Choose from the list to start messaging</p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
