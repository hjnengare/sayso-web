import { getServiceSupabase } from '@/app/lib/admin';

export type ClaimNotificationType =
  | 'otp_sent'
  | 'otp_verified'
  | 'claim_status_changed'
  | 'docs_requested'
  | 'docs_received';

/**
 * Create in-app notification for a user (claim-related).
 * Uses service role so it works regardless of RLS.
 */
export async function createClaimNotification(params: {
  userId: string;
  claimId: string | null;
  type: ClaimNotificationType;
  title: string;
  message: string;
  link?: string | null;
}): Promise<void> {
  const supabase = getServiceSupabase();
  await (supabase as any).from('notifications').insert({
    user_id: params.userId,
    claim_id: params.claimId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link ?? null,
    read: false,
    read_at: null,
  });
}

/**
 * Update claim's last_notified_at (service role).
 */
export async function updateClaimLastNotified(claimId: string): Promise<void> {
  const supabase = getServiceSupabase();
  await (supabase as any)
    .from('business_claims')
    .update({ last_notified_at: new Date().toISOString() })
    .eq('id', claimId);
}
