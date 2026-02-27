-- ============================================
-- Disable legacy reply trigger notification fanout
-- ============================================
-- API fanout in POST /api/reviews/[id]/replies is now the source of truth.
-- Keep review-created owner notifications intact by dropping only the
-- reply trigger on public.review_replies.

DROP TRIGGER IF EXISTS trigger_notify_on_new_reply ON public.review_replies;
