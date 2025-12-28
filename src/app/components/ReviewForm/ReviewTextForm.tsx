"use client";

interface ReviewTextFormProps {
  reviewTitle: string;
  reviewText: string;
  onTitleChange: (title: string) => void;
  onTextChange: (text: string) => void;
}

export default function ReviewTextForm({ 
  reviewTitle, 
  reviewText, 
  onTitleChange, 
  onTextChange 
}: ReviewTextFormProps) {
  return (
    <>
      {/* Review Title */}
      <div className="mb-3 px-4">
        <h3 className="text-body-sm font-semibold text-charcoal mb-3 text-center md:text-left" style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}>
          Review Title (Optional)
        </h3>
        <input
          type="text"
          value={reviewTitle}
          onChange={(e) => {
            const value = e.target.value;
            // Enforce max length of 200 characters
            if (value.length <= 200) {
              onTitleChange(value);
            }
          }}
          placeholder="Summarize your experience in a few words..."
          maxLength={200}
          className="w-full bg-off-white backdrop-blur-sm border border-sage/20 rounded-full px-4 md:px-6 py-3 md:py-4 text-body md:text-lg text-charcoal placeholder:text-sm sm:text-xs placeholder-charcoal/50 focus:outline-none focus:ring-2 focus:ring-sage/50 focus:border-sage transition-all duration-300 input-mobile"
        />
      </div>

      {/* Review Text */}
      <div className="mb-3 px-4">
        <h3 className="text-body-sm font-semibold text-charcoal mb-3 text-center md:text-left" style={{ fontFamily: '"Urbanist", system-ui, sans-serif' }}>
          Tell us about your experience
        </h3>
        <textarea
          value={reviewText}
          onChange={(e) => {
            const value = e.target.value;
            // Enforce max length of 5000 characters
            if (value.length <= 5000) {
              // Ensure immediate state update for validation
              onTextChange(value);
            }
          }}
          onInput={(e) => {
            // Fallback for mobile devices - onInput fires immediately as user types
            // This ensures state updates on mobile even if onChange has issues
            const value = (e.target as HTMLTextAreaElement).value;
            // Enforce max length
            const truncated = value.length > 5000 ? value.substring(0, 5000) : value;
            if (truncated !== reviewText) {
              onTextChange(truncated);
            }
          }}
          placeholder="Share your thoughts and help other locals... (10-5000 characters)"
          maxLength={5000}
          rows={4}
          className="w-full bg-off-white backdrop-blur-sm border border-sage/20 rounded-[20px] px-4 md:px-6 py-3 md:py-4 text-body md:text-xl text-charcoal placeholder:text-sm sm:text-xs placeholder-charcoal/50 focus:outline-none focus:ring-2 focus:ring-sage/50 focus:border-sage transition-all duration-300 resize-none flex-1 min-h-[120px] md:min-h-0 input-mobile"
        />
        {/* Character counter */}
        <div className="text-right px-4 mt-1">
          <span className={`text-xs ${
            reviewText.length < 10 
              ? 'text-charcoal/60' 
              : reviewText.length > 4500 
                ? 'text-coral' 
                : 'text-charcoal/50'
          }`}>
            {reviewText.length} / 5000 {reviewText.length < 10 && '(minimum 10 characters)'}
          </span>
        </div>
      </div>
    </>
  );
}
