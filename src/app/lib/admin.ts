import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/app/types/supabase';

let serviceClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Get Supabase client with service role (server-only).
 * Typed with Database so .from() and .rpc() are properly typed (avoids `never`).
 * Use for: business_claim_otp, storage uploads, admin-only reads.
 * Never expose to client.
 */
export function getServiceSupabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Service Supabase not configured');
  }
  if (!serviceClient) {
    serviceClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return serviceClient;
}

/**
 * Check if user has admin role (profiles.role = 'admin').
 * Uses service role to read profiles. Call from server only.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (data === null || data === undefined) return false;
  const profile = data as { role: string | null };
  return profile.role === 'admin';
}
