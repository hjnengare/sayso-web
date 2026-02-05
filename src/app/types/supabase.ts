/**
 * Supabase Database type for typed createClient<Database>().
 * Generate full types with: npx supabase gen types typescript --project-id <ref> --schema public > src/app/types/supabase.ts
 * This file provides a minimal type so service client .from() and .rpc() are typed (avoids `never`).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      email_subscribers: {
        Row: {
          email: string;
          source: string | null;
          created_at: string;
          [key: string]: unknown;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      business_claims: {
        Row: {
          id: string;
          business_id: string;
          claimant_user_id: string;
          status: string;
          method_attempted: string | null;
          verification_data: Json;
          created_at: string;
          updated_at: string;
          submitted_at: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          admin_notes: string | null;
          rejection_reason: string | null;
          last_notified_at: string | null;
          [key: string]: unknown;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      business_claim_otp: {
        Row: {
          id: string;
          claim_id: string;
          phone_e164: string;
          code_hash: string;
          expires_at: string;
          attempts: number;
          last_sent_at: string;
          verified_at: string | null;
          created_at: string;
          [key: string]: unknown;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      business_claim_documents: {
        Row: {
          id: string;
          claim_id: string;
          storage_path: string;
          doc_type: string;
          status: string;
          uploaded_at: string;
          delete_after: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          reject_reason: string | null;
          [key: string]: unknown;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          claim_id: string | null;
          type: string;
          title: string;
          message: string;
          link: string | null;
          read: boolean;
          read_at: string | null;
          created_at: string;
          updated_at: string;
          [key: string]: unknown;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      profiles: {
        Row: { user_id: string; role: string | null; [key: string]: unknown };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      businesses: {
        Row: { id: string; name: string; phone: string | null; email: string | null; [key: string]: unknown };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Functions: {
      verify_business_claim: {
        Args: {
          p_claim_id: string;
          p_admin_user_id: string;
          p_approved: boolean;
          p_rejection_reason: string | null;
          p_admin_notes: string | null;
        };
        Returns: Json;
      };
      start_business_claim: {
        Args: { p_business_id: string; p_claimant_user_id: string };
        Returns: Json;
      };
      complete_claim_verification: {
        Args: { p_claim_id: string; p_method: string };
        Returns: Json;
      };
      cleanup_expired_business_claim_otp: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: Record<string, string>;
  };
}
