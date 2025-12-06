"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    Send,
    User,
    Check,
    MoreVertical,
    Trash2,
    AlertTriangle,
    UserX,
    ChevronRight,
} from "react-feather";
import { createPortal } from "react-dom";
import Footer from "../../components/Footer/Footer";
import { TOP_REVIEWERS, type Reviewer } from "../../data/communityHighlightsData";

// CSS animations
const animations = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInFromTop {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideInFromBottom {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.4s ease-out forwards;
  }
  
  .animate-slide-in-top {
    animation: slideInFromTop 0.5s ease-out forwards;
  }
  
  .animate-slide-in-bottom {
    animation: slideInFromBottom 0.3s ease-out forwards;
  }
  
  .animate-delay-100 { animation-delay: 0.1s; opacity: 0; }
  .animate-delay-200 { animation-delay: 0.2s; opacity: 0; }
  .animate-delay-300 { animation-delay: 0.3s; opacity: 0; }
`;

interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
    read: boolean;
}

interface DMUser {
    id: string;
    name: string;
    profilePicture: string;
    badge?: "top" | "verified" | "local";
    location: string;
    online?: boolean;
}

export default function DMPage() {
    const params = useParams();
    const router = useRouter();
    const recipientId = params?.id as string;
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [imgError, setImgError] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const menuButtonRef = useRef<HTMLDivElement>(null);
    const previousMessagesLength = useRef(0);

    // Mock recipient data (replace with API in production)
    const recipient: DMUser = useMemo(() => {
        const reviewer = TOP_REVIEWERS.find(r => r.id === recipientId) || TOP_REVIEWERS[0];
        return {
            id: reviewer.id,
            name: reviewer.name,
            profilePicture: reviewer.profilePicture,
            badge: reviewer.badge,
            location: reviewer.location,
            online: true,
        };
    }, [recipientId]);

    // Mock messages (replace with API in production)
    useEffect(() => {
        const mockMessages: Message[] = [
            {
                id: "1",
                senderId: recipientId,
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
                senderId: recipientId,
                text: "Thank you so much! That means a lot. I try to be thorough and honest in my reviews.",
                timestamp: "45 minutes ago",
                read: true,
            },
        ];
        setMessages(mockMessages);
        // Reset previous messages length when chat changes
        previousMessagesLength.current = mockMessages.length;
        // Scroll to top when chat is opened
        window.scrollTo({ top: 0, behavior: "smooth" });
        const messagesContainer = document.querySelector('.overflow-y-auto');
        if (messagesContainer) {
            messagesContainer.scrollTop = 0;
        }
    }, [recipientId]);

    // Auto-scroll to bottom when new messages arrive (only for new messages, not initial load)
    useEffect(() => {
        // Only scroll to bottom if a new message was added (not on initial load)
        if (messages.length > previousMessagesLength.current && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        previousMessagesLength.current = messages.length;
    }, [messages]);

    // Handle send message
    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

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
        if (confirm(`Are you sure you want to block ${recipient.name}? You will no longer receive messages from them.`)) {
            // In production, this would call an API
            setIsMenuOpen(false);
            router.push('/dm');
        }
    };

    // Handle report user
    const handleReportUser = () => {
        // In production, this would open a report modal or navigate to a report page
        alert('Report functionality coming soon');
        setIsMenuOpen(false);
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: animations }} />
            <style jsx global>{`
                .font-urbanist {
                    font-family: "Urbanist", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, system-ui,
                        sans-serif;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
                }
            `}</style>
            <AnimatePresence mode="wait">
                <motion.div
                    key={recipientId}
                    initial={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -20, scale: 0.98, filter: "blur(8px)" }}
                    transition={{
                        duration: 0.6,
                        ease: [0.16, 1, 0.3, 1],
                        opacity: { duration: 0.5 },
                        filter: { duration: 0.55 }
                    }}
                    className="min-h-dvh bg-off-white relative overflow-hidden font-urbanist flex flex-col"
                    style={{
                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                >
                {/* Fixed Premium Header - Mobile First */}
                <header
                    className="fixed top-0 left-0 right-0 z-50 bg-navbar-bg backdrop-blur-sm border-b border-charcoal/10 animate-slide-in-top"
                    role="banner"
                    style={{
                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                >
                    <div className="mx-auto w-full max-w-[2000px] px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-4">
                        <nav className="flex items-center justify-between gap-2" aria-label="Direct message navigation">
                            <button
                                onClick={() => router.back()}
                                className="group flex items-center focus:outline-none rounded-lg -ml-1 touch-manipulation"
                                aria-label="Go back to previous page"
                            >
                                <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-gradient-to-br from-white/10 to-white/5 active:from-white/20 active:to-white/10 sm:hover:from-white/20 sm:hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 sm:hover:scale-110 border border-white/20 active:border-white/40 sm:hover:border-white/40 mr-2 sm:mr-3" aria-hidden="true">
                                    <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white group-active:text-white sm:group-hover:text-white transition-colors duration-300" strokeWidth={2.5} />
                                </div>
                            </button>

                            {/* Recipient Info */}
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mx-2 sm:mx-4">
                                {!imgError && recipient.profilePicture && recipient.profilePicture.trim() !== '' ? (
                                    <div className="relative flex-shrink-0">
                                        <Image
                                            src={recipient.profilePicture}
                                            alt={recipient.name}
                                            width={40}
                                            height={40}
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white/50 ring-2 ring-white/30"
                                            priority
                                            onError={() => setImgError(true)}
                                        />
                                        {recipient.online && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-green-500 rounded-full border-2 border-white ring-1 ring-white/50"></div>
                                        )}
                                        {recipient.badge === "verified" && (
                                            <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-blue-500 rounded-full flex items-center justify-center ring-2 ring-white">
                                                <Check className="text-white" size={7} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-sage/20 text-sage rounded-full border-2 border-white/50 ring-2 ring-white/30 flex-shrink-0">
                                        <User className="text-sage/70 w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <h1 className="font-urbanist text-base sm:text-lg md:text-h3 lg:text-h2 font-semibold text-white animate-delay-100 animate-fade-in truncate" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                                        {recipient.name}
                                    </h1>
                                    {recipient.online && (
                                        <p className="text-xs sm:text-caption text-white/70 truncate" style={{
                                            fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                        }}>
                                            Online
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="relative flex-shrink-0" ref={menuButtonRef}>
                                <button
                                    onClick={handleMenuToggle}
                                    className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-white/10 to-white/5 active:from-white/20 active:to-white/10 sm:hover:from-white/20 sm:hover:to-white/10 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 sm:hover:scale-110 border border-white/20 active:border-white/40 sm:hover:border-white/40 min-h-[44px] min-w-[44px] touch-manipulation"
                                    aria-label="More options"
                                    aria-expanded={isMenuOpen}
                                >
                                    <MoreVertical className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </button>

                                {/* Dropdown Menu */}
                                {isMenuOpen && menuPosition && createPortal(
                                    <AnimatePresence>
                                        <motion.div
                                            key="menu"
                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="fixed z-[1000] bg-off-white rounded-[12px] sm:rounded-[12px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden min-w-[180px] sm:min-w-[200px] backdrop-blur-xl"
                                            style={{
                                                top: `${menuPosition.top}px`,
                                                right: `${menuPosition.right}px`,
                                                fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="py-1.5 sm:py-2">
                                                <button
                                                    onClick={handleClearChat}
                                                    className="w-full flex items-center gap-2.5 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 active:bg-charcoal/5 sm:hover:bg-charcoal/5 transition-colors text-left group touch-manipulation min-h-[44px]"
                                                >
                                                    <Trash2 className="w-4 h-4 text-charcoal/70 group-active:text-charcoal sm:group-hover:text-charcoal" strokeWidth={2.5} />
                                                    <span className="text-sm sm:text-body-sm font-medium text-charcoal group-active:text-charcoal sm:group-hover:text-charcoal">Clear Chat</span>
                                                </button>
                                                <button
                                                    onClick={handleBlockUser}
                                                    className="w-full flex items-center gap-2.5 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 active:bg-charcoal/5 sm:hover:bg-charcoal/5 transition-colors text-left group touch-manipulation min-h-[44px]"
                                                >
                                                    <UserX className="w-4 h-4 text-charcoal/70 group-active:text-charcoal sm:group-hover:text-charcoal" strokeWidth={2.5} />
                                                    <span className="text-sm sm:text-body-sm font-medium text-charcoal group-active:text-charcoal sm:group-hover:text-charcoal">Block User</span>
                                                </button>
                                                <button
                                                    onClick={handleReportUser}
                                                    className="w-full flex items-center gap-2.5 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 active:bg-charcoal/5 sm:hover:bg-charcoal/5 transition-colors text-left group touch-manipulation min-h-[44px]"
                                                >
                                                    <AlertTriangle className="w-4 h-4 text-coral/70 group-active:text-coral sm:group-hover:text-coral" strokeWidth={2.5} />
                                                    <span className="text-sm sm:text-body-sm font-medium text-charcoal group-active:text-coral sm:group-hover:text-coral">Report</span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>,
                                    document.body
                                )}
                            </div>
                        </nav>
                    </div>
                </header>

                {/* Messages Container - Mobile First */}
                <div className="flex-1 flex flex-col pt-20 sm:pt-24 pb-20 sm:pb-24 md:pb-28 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8">
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
                                    <Link href="/dm" className="text-charcoal/70 hover:text-charcoal transition-colors duration-200 font-medium" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                        Messages
                                    </Link>
                                </li>
                                <li className="flex items-center">
                                    <ChevronRight className="w-4 h-4 text-charcoal/40" />
                                </li>
                                <li>
                                    <span className="text-charcoal font-semibold truncate max-w-[150px] sm:max-w-none" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                                        {recipient.name}
                                    </span>
                                </li>
                            </ol>
                        </nav>
                        <div className="max-w-3xl mx-auto py-4 sm:py-6 space-y-3 sm:space-y-4">
                            {messages.map((msg) => {
                                const isCurrentUser = msg.senderId === "current-user";
                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                                    >
                                        <div
                                            className={`max-w-[85%] sm:max-w-[75%] md:max-w-[65%] lg:max-w-[60%] rounded-[12px] sm:rounded-[12px] px-3 py-2.5 sm:px-4 sm:py-3 ${
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
                </div>

                {/* Message Input - Mobile First */}
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-off-white border-t border-charcoal/10 animate-slide-in-bottom safe-area-inset-bottom">
                    <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
                        <form onSubmit={handleSend} className="flex items-end gap-2 sm:gap-3">
                            <div className="flex-1 relative">
                                <textarea
                                    ref={inputRef}
                                    value={message}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message..."
                                    rows={1}
                                    className="w-full bg-white border border-charcoal/10 rounded-[12px] sm:rounded-[20px] px-3 py-2.5 sm:px-4 sm:py-3 pr-10 sm:pr-12 text-sm sm:text-body-sm md:text-body text-charcoal placeholder:text-sm sm:placeholder:text-body-sm md:placeholder:text-body placeholder-charcoal/40 resize-none focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/50 transition-all duration-300 max-h-[100px] sm:max-h-[120px] overflow-y-auto touch-manipulation"
                                    style={{
                                        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                        lineHeight: '1.5',
                                    }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!message.trim()}
                                className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-coral to-coral/90 active:bg-coral/90 sm:hover:bg-coral/90 disabled:bg-charcoal/20 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center border border-white/30 transition-all duration-300 active:scale-95 sm:hover:scale-110 min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] touch-manipulation"
                                aria-label="Send message"
                            >
                                <Send className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                            </button>
                        </form>
                    </div>
                </div>
                </motion.div>
            </AnimatePresence>
        </>
    );
}

