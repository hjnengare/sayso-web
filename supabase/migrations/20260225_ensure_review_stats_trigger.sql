-- Ensure business_stats is recomputed when reviews change (insert/update/delete).
-- Trigger calls update_business_stats(p_business_id) so review_count, average_rating, and percentiles stay in sync.
-- If this trigger is missing, new reviews will not update Performance Insights or percentile chips.

DROP TRIGGER IF EXISTS update_business_stats_on_review_insert ON public.reviews;
CREATE TRIGGER update_business_stats_on_review_insert
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_stats_on_review_change();
