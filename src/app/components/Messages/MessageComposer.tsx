"use client";

import { Send } from "react-feather";

interface MessageComposerProps {
  message: string;
  onMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: (e: React.FormEvent) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  disabled?: boolean;
}

export default function MessageComposer({
  message,
  onMessageChange,
  onKeyDown,
  onSend,
  inputRef,
  disabled = false,
}: MessageComposerProps) {
  return (
    <div className="flex-shrink-0 px-6 py-4 bg-off-white border-t border-charcoal/10">
      <form onSubmit={onSend} className="flex items-end gap-3 max-w-3xl mx-auto">
        {/* Attachment Button */}
        <button
          type="button"
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl hover:bg-charcoal/5 text-charcoal/60 hover:text-charcoal transition-colors mb-0.5"
          aria-label="Attach file"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        {/* Message Input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={onMessageChange}
            onKeyDown={onKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={disabled}
            className="w-full bg-off-white/50 border border-charcoal/10 rounded-xl px-4 py-3 text-sm text-charcoal placeholder:text-charcoal/40 resize-none focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/40 focus:bg-off-white transition-all duration-200 max-h-[120px] overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", lineHeight: '1.5' }}
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-sage via-sage to-sage/95 hover:from-sage/95 hover:to-sage disabled:from-charcoal/20 disabled:to-charcoal/20 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center shadow-md shadow-sage/20 hover:shadow-lg hover:shadow-sage/30 transition-all duration-200 disabled:shadow-none mb-0.5"
          aria-label="Send message"
        >
          <Send className="w-4.5 h-4.5" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
