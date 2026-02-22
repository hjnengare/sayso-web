export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      auth_rate_limits: {
        Row: {
          attempt_count: number | null
          attempt_type: string
          blocked_until: string | null
          created_at: string | null
          id: string
          identifier: string
          last_attempt_at: string | null
          updated_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          attempt_type: string
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier: string
          last_attempt_at?: string | null
          updated_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          attempt_type?: string
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier?: string
          last_attempt_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_group: string
          category_key: string | null
          created_at: string | null
          description: string
          icon_name: string
          id: string
          meta: Json | null
          name: string
          rule_type: string
          threshold: number | null
          updated_at: string | null
        }
        Insert: {
          badge_group: string
          category_key?: string | null
          created_at?: string | null
          description: string
          icon_name: string
          id: string
          meta?: Json | null
          name: string
          rule_type: string
          threshold?: number | null
          updated_at?: string | null
        }
        Update: {
          badge_group?: string
          category_key?: string | null
          created_at?: string | null
          description?: string
          icon_name?: string
          id?: string
          meta?: Json | null
          name?: string
          rule_type?: string
          threshold?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      business_claim_documents: {
        Row: {
          claim_id: string
          delete_after: string
          doc_type: Database["public"]["Enums"]["business_claim_doc_type"]
          id: string
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["business_claim_doc_status"]
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          claim_id: string
          delete_after?: string
          doc_type: Database["public"]["Enums"]["business_claim_doc_type"]
          id?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["business_claim_doc_status"]
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          claim_id?: string
          delete_after?: string
          doc_type?: Database["public"]["Enums"]["business_claim_doc_type"]
          id?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["business_claim_doc_status"]
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_claim_documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "business_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      business_claim_events: {
        Row: {
          claim_id: string
          created_at: string
          created_by: string | null
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          created_by?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          created_by?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_claim_events_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "business_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      business_claim_otp: {
        Row: {
          attempts: number
          claim_id: string
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          last_sent_at: string
          phone_e164: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          claim_id: string
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          last_sent_at?: string
          phone_e164: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          claim_id?: string
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_sent_at?: string
          phone_e164?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_claim_otp_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "business_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      business_claims: {
        Row: {
          admin_notes: string | null
          business_id: string
          claimant_user_id: string
          created_at: string
          failed_attempts_email: number | null
          failed_attempts_phone: number | null
          id: string
          last_attempt_at: string | null
          last_notified_at: string | null
          method_attempted: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          verification_data: Json | null
          verification_level: string | null
        }
        Insert: {
          admin_notes?: string | null
          business_id: string
          claimant_user_id: string
          created_at?: string
          failed_attempts_email?: number | null
          failed_attempts_phone?: number | null
          id?: string
          last_attempt_at?: string | null
          last_notified_at?: string | null
          method_attempted?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          verification_data?: Json | null
          verification_level?: string | null
        }
        Update: {
          admin_notes?: string | null
          business_id?: string
          claimant_user_id?: string
          created_at?: string
          failed_attempts_email?: number | null
          failed_attempts_phone?: number | null
          id?: string
          last_attempt_at?: string | null
          last_notified_at?: string | null
          method_attempted?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          verification_data?: Json | null
          verification_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_claims_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_claims_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_new_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_claims_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_quality_fallback_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_claims_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_top_rated_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_claims_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_trending_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_images: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_primary: boolean | null
          sort_order: number | null
          type: string | null
          updated_at: string
          url: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          sort_order?: number | null
          type?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          sort_order?: number | null
          type?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_images_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_images_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_new_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_images_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_quality_fallback_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_images_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_top_rated_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_images_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_trending_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_owners: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          role: string | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_owners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_owners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_new_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_owners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_quality_fallback_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_owners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_top_rated_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_owners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_trending_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_ownership_requests: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          rejection_reason: string | null
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          verification_data: Json | null
          verification_method: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          rejection_reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          verification_data?: Json | null
          verification_method?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          rejection_reason?: string | null
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          verification_data?: Json | null
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_ownership_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_ownership_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_new_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_ownership_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_quality_fallback_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_ownership_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_top_rated_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_ownership_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_trending_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profile_views: {
        Row: {
          business_id: string
          created_at: string
          id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_profile_views_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profile_views_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_new_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profile_views_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_quality_fallback_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profile_views_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_top_rated_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_profile_views_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_trending_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_stats: {
        Row: {
          average_rating: number | null
          business_id: string
          percentiles: Json | null
          rating_distribution: Json | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          average_rating?: number | null
          business_id: string
          percentiles?: Json | null
          rating_distribution?: Json | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          average_rating?: number | null
          business_id?: string
          percentiles?: Json | null
          rating_distribution?: Json | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_stats_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_stats_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "mv_new_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_stats_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "mv_quality_fallback_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_stats_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "mv_top_rated_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_stats_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "mv_trending_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          badge: string | null
          category_raw: string | null
          created_at: string | null
          description: string | null
          email: string | null
          geo_point: unknown
          hours: Json | null
          id: string
          image_url: string | null
          is_chain: boolean
          is_hidden: boolean
          is_system: boolean
          last_activity_at: string | null
          lat: number | null
          lng: number | null
          location: string
          name: string
          normalized_name: string | null
          owner_id: string | null
          owner_verification_method: string | null
          owner_verification_notes: string | null
          owner_verification_requested_at: string | null
          owner_verified: boolean | null
          owner_verified_at: string | null
          phone: string | null
          price_range: string | null
          primary_category_slug: string | null
          primary_subcategory_label: string | null
          primary_subcategory_slug: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          search_vector: unknown
          slug: string | null
          source: string | null
          source_id: string | null
          status: string | null
          updated_at: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          badge?: string | null
          category_raw?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          geo_point?: unknown
          hours?: Json | null
          id?: string
          image_url?: string | null
          is_chain?: boolean
          is_hidden?: boolean
          is_system?: boolean
          last_activity_at?: string | null
          lat?: number | null
          lng?: number | null
          location: string
          name: string
          normalized_name?: string | null
          owner_id?: string | null
          owner_verification_method?: string | null
          owner_verification_notes?: string | null
          owner_verification_requested_at?: string | null
          owner_verified?: boolean | null
          owner_verified_at?: string | null
          phone?: string | null
          price_range?: string | null
          primary_category_slug?: string | null
          primary_subcategory_label?: string | null
          primary_subcategory_slug: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          search_vector?: unknown
          slug?: string | null
          source?: string | null
          source_id?: string | null
          status?: string | null
          updated_at?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          badge?: string | null
          category_raw?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          geo_point?: unknown
          hours?: Json | null
          id?: string
          image_url?: string | null
          is_chain?: boolean
          is_hidden?: boolean
          is_system?: boolean
          last_activity_at?: string | null
          lat?: number | null
          lng?: number | null
          location?: string
          name?: string
          normalized_name?: string | null
          owner_id?: string | null
          owner_verification_method?: string | null
          owner_verification_notes?: string | null
          owner_verification_requested_at?: string | null
          owner_verified?: boolean | null
          owner_verified_at?: string | null
          phone?: string | null
          price_range?: string | null
          primary_category_slug?: string | null
          primary_subcategory_label?: string | null
          primary_subcategory_slug?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          search_vector?: unknown
          slug?: string | null
          source?: string | null
          source_id?: string | null
          status?: string | null
          updated_at?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_primary_subcategory_slug_fk"
            columns: ["primary_subcategory_slug"]
            isOneToOne: false
            referencedRelation: "canonical_subcategory_slugs"
            referencedColumns: ["slug"]
          },
        ]
      }
      canonical_subcategory_slugs: {
        Row: {
          slug: string
        }
        Insert: {
          slug: string
        }
        Update: {
          slug?: string
        }
        Relationships: []
      }
      claim_documents: {
        Row: {
          auto_delete_at: string
          claim_id: string
          document_type: string
          file_name: string
          file_size: number
          id: string
          mime_type: string
          reviewed: boolean | null
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          auto_delete_at?: string
          claim_id: string
          document_type: string
          file_name: string
          file_size: number
          id?: string
          mime_type: string
          reviewed?: boolean | null
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          auto_delete_at?: string
          claim_id?: string
          document_type?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          reviewed?: boolean | null
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "business_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_verification_otps: {
        Row: {
          attempts: number | null
          claim_id: string
          created_at: string
          expires_at: string
          id: string
          max_attempts: number | null
          otp_hash: string
          otp_type: string
          target_contact: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          claim_id: string
          created_at?: string
          expires_at: string
          id?: string
          max_attempts?: number | null
          otp_hash: string
          otp_type: string
          target_contact: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          claim_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          max_attempts?: number | null
          otp_hash?: string
          otp_type?: string
          target_contact?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_verification_otps_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "business_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          last_message_at: string
          owner_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          owner_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          owner_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_new_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_quality_fallback_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_top_rated_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_trending_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_subscribers: {
        Row: {
          created_at: string
          email: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          source?: string | null
        }
        Relationships: []
      }
      event_review_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          image_url: string | null
          review_id: string
          storage_path: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          review_id: string
          storage_path: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          review_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "event_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reviews: {
        Row: {
          anonymous_id: string | null
          content: string
          created_at: string | null
          event_id: string
          guest_email: string | null
          guest_name: string | null
          helpful_count: number | null
          id: string
          ip_address: unknown
          rating: number
          tags: string[] | null
          title: string | null
          updated_at: string | null
          user_agent_hash: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          content: string
          created_at?: string | null
          event_id: string
          guest_email?: string | null
          guest_name?: string | null
          helpful_count?: number | null
          id?: string
          ip_address?: unknown
          rating: number
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          content?: string
          created_at?: string | null
          event_id?: string
          guest_email?: string | null
          guest_name?: string | null
          helpful_count?: number | null
          id?: string
          ip_address?: unknown
          rating?: number
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      event_special_cta_clicks: {
        Row: {
          created_at: string
          cta_kind: string
          cta_source: string | null
          event_special_id: string
          id: string
          target_url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          cta_kind?: string
          cta_source?: string | null
          event_special_id: string
          id?: string
          target_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          cta_kind?: string
          cta_source?: string | null
          event_special_id?: string
          id?: string
          target_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_special_cta_clicks_event_special_id_fkey"
            columns: ["event_special_id"]
            isOneToOne: false
            referencedRelation: "events_and_specials"
            referencedColumns: ["id"]
          },
        ]
      }
      events_and_specials: {
        Row: {
          booking_contact: string | null
          booking_url: string | null
          business_id: string | null
          created_at: string | null
          created_by: string
          cta_source: string | null
          description: string | null
          end_date: string | null
          external_url: string | null
          icon: string | null
          id: string
          image: string | null
          is_community_event: boolean
          location: string | null
          price: number | null
          rating: number | null
          start_date: string
          title: string
          type: string
          updated_at: string | null
          whatsapp_number: string | null
          whatsapp_prefill_template: string | null
        }
        Insert: {
          booking_contact?: string | null
          booking_url?: string | null
          business_id?: string | null
          created_at?: string | null
          created_by: string
          cta_source?: string | null
          description?: string | null
          end_date?: string | null
          external_url?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          is_community_event?: boolean
          location?: string | null
          price?: number | null
          rating?: number | null
          start_date: string
          title: string
          type: string
          updated_at?: string | null
          whatsapp_number?: string | null
          whatsapp_prefill_template?: string | null
        }
        Update: {
          booking_contact?: string | null
          booking_url?: string | null
          business_id?: string | null
          created_at?: string | null
          created_by?: string
          cta_source?: string | null
          description?: string | null
          end_date?: string | null
          external_url?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          is_community_event?: boolean
          location?: string | null
          price?: number | null
          rating?: number | null
          start_date?: string
          title?: string
          type?: string
          updated_at?: string | null
          whatsapp_number?: string | null
          whatsapp_prefill_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_and_specials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_and_specials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_new_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_and_specials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_quality_fallback_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_and_specials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_top_rated_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_and_specials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_trending_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      fsq_category_map: {
        Row: {
          fsq_category_id: string
          fsq_category_name: string | null
          sayso_category_slug: string | null
          sayso_subcategory_slug: string
          updated_at: string | null
        }
        Insert: {
          fsq_category_id: string
          fsq_category_name?: string | null
          sayso_category_slug?: string | null
          sayso_subcategory_slug: string
          updated_at?: string | null
        }
        Update: {
          fsq_category_id?: string
          fsq_category_name?: string | null
          sayso_category_slug?: string | null
          sayso_subcategory_slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          claim_id: string | null
          created_at: string
          entity_id: string | null
          id: string
          image: string | null
          image_alt: string | null
          link: string | null
          message: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claim_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          image?: string | null
          image_alt?: string | null
          link?: string | null
          message: string
          read?: boolean
          read_at?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claim_id?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          image?: string | null
          image_alt?: string | null
          link?: string | null
          message?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "business_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_role: string | null
          avatar_url: string | null
          badges_count: number
          created_at: string | null
          deactivated_at: string | null
          dealbreakers_count: number | null
          display_name: string | null
          email: string | null
          email_verified: boolean | null
          email_verified_at: string | null
          interests_count: number | null
          is_active: boolean
          is_top_reviewer: boolean
          last_dealbreakers_updated: string | null
          last_interests_updated: string | null
          last_subcategories_updated: string | null
          locale: string | null
          onboarding_complete: boolean | null
          onboarding_completed_at: string | null
          onboarding_draft: Json | null
          onboarding_step: string | null
          reviews_count: number
          role: string | null
          subcategories_count: number | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          account_role?: string | null
          avatar_url?: string | null
          badges_count?: number
          created_at?: string | null
          deactivated_at?: string | null
          dealbreakers_count?: number | null
          display_name?: string | null
          email?: string | null
          email_verified?: boolean | null
          email_verified_at?: string | null
          interests_count?: number | null
          is_active?: boolean
          is_top_reviewer?: boolean
          last_dealbreakers_updated?: string | null
          last_interests_updated?: string | null
          last_subcategories_updated?: string | null
          locale?: string | null
          onboarding_complete?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_draft?: Json | null
          onboarding_step?: string | null
          reviews_count?: number
          role?: string | null
          subcategories_count?: number | null
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          account_role?: string | null
          avatar_url?: string | null
          badges_count?: number
          created_at?: string | null
          deactivated_at?: string | null
          dealbreakers_count?: number | null
          display_name?: string | null
          email?: string | null
          email_verified?: boolean | null
          email_verified_at?: string | null
          interests_count?: number | null
          is_active?: boolean
          is_top_reviewer?: boolean
          last_dealbreakers_updated?: string | null
          last_interests_updated?: string | null
          last_subcategories_updated?: string | null
          locale?: string | null
          onboarding_complete?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_draft?: Json | null
          onboarding_step?: string | null
          reviews_count?: number
          role?: string | null
          subcategories_count?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      review_flags: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          details: string | null
          flagged_by: string
          id: string
          reason: string
          review_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          details?: string | null
          flagged_by: string
          id?: string
          reason: string
          review_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          details?: string | null
          flagged_by?: string
          id?: string
          reason?: string
          review_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_flags_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_flags_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_flags_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_helpful_votes: {
        Row: {
          created_at: string | null
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpful_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_helpful_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_helpful_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      review_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          image_url: string | null
          review_id: string
          storage_path: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          review_id: string
          storage_path: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          review_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          content: string
          created_at: string | null
          id: string
          review_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          review_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          review_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reviews: {
        Row: {
          anonymous_id: string | null
          business_id: string
          content: string
          created_at: string | null
          helpful_count: number | null
          id: string
          ip_address: unknown
          rating: number
          tags: string[] | null
          title: string | null
          updated_at: string | null
          user_agent_hash: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          business_id: string
          content: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          ip_address?: unknown
          rating: number
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          business_id?: string
          content?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          ip_address?: unknown
          rating?: number
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_new_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_quality_fallback_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_top_rated_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_trending_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      saved_businesses: {
        Row: {
          business_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_new_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_quality_fallback_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_top_rated_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_trending_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          created_at: string | null
          id: string
          name: string
          params: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          params: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          params?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_specials: {
        Row: {
          created_at: string | null
          id: string
          special_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          special_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          special_id?: string
          user_id?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string | null
          id: string
          lat: number | null
          lng: number | null
          query: string
          radius_km: number | null
          sort: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          query: string
          radius_km?: number | null
          sort?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          query?: string
          radius_km?: number | null
          sort?: string | null
          user_id?: string
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      special_review_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          image_url: string | null
          review_id: string
          storage_path: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          review_id: string
          storage_path: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          review_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "special_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      special_reviews: {
        Row: {
          anonymous_id: string | null
          content: string
          created_at: string | null
          guest_email: string | null
          guest_name: string | null
          helpful_count: number | null
          id: string
          ip_address: unknown
          rating: number
          special_id: string
          tags: string[] | null
          title: string | null
          updated_at: string | null
          user_agent_hash: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          content: string
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          helpful_count?: number | null
          id?: string
          ip_address?: unknown
          rating: number
          special_id: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          content?: string
          created_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          helpful_count?: number | null
          id?: string
          ip_address?: unknown
          rating?: number
          special_id?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ticketmaster_events: {
        Row: {
          city: string | null
          classification: string | null
          country: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          genre: string | null
          id: string
          image_url: string | null
          last_fetched_at: string | null
          location: string | null
          price_range: Json | null
          raw_data: Json | null
          segment: string | null
          start_date: string | null
          sub_genre: string | null
          ticketmaster_id: string
          title: string
          type: string | null
          updated_at: string | null
          url: string | null
          venue_address: string | null
          venue_name: string | null
        }
        Insert: {
          city?: string | null
          classification?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          genre?: string | null
          id?: string
          image_url?: string | null
          last_fetched_at?: string | null
          location?: string | null
          price_range?: Json | null
          raw_data?: Json | null
          segment?: string | null
          start_date?: string | null
          sub_genre?: string | null
          ticketmaster_id: string
          title: string
          type?: string | null
          updated_at?: string | null
          url?: string | null
          venue_address?: string | null
          venue_name?: string | null
        }
        Update: {
          city?: string | null
          classification?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          genre?: string | null
          id?: string
          image_url?: string | null
          last_fetched_at?: string | null
          location?: string | null
          price_range?: Json | null
          raw_data?: Json | null
          segment?: string | null
          start_date?: string | null
          sub_genre?: string | null
          ticketmaster_id?: string
          title?: string
          type?: string | null
          updated_at?: string | null
          url?: string | null
          venue_address?: string | null
          venue_name?: string | null
        }
        Relationships: []
      }
      user_badge_progress: {
        Row: {
          badge_id: string
          progress: number
          target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          progress?: number
          target: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          progress?: number
          target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_dealbreakers: {
        Row: {
          created_at: string | null
          dealbreaker_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dealbreaker_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dealbreaker_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          created_at: string | null
          interest_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          interest_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          interest_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reco_impressions: {
        Row: {
          business_id: string
          feed_context: string | null
          id: string
          request_id: string | null
          shown_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          feed_context?: string | null
          id?: string
          request_id?: string | null
          shown_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          feed_context?: string | null
          id?: string
          request_id?: string | null
          shown_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reco_impressions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reco_impressions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_new_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reco_impressions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_quality_fallback_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reco_impressions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_top_rated_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reco_impressions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_trending_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          created_at: string
          helpful_votes_received: number
          total_businesses_saved: number
          total_helpful_votes_given: number
          total_reviews_written: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          helpful_votes_received?: number
          total_businesses_saved?: number
          total_helpful_votes_given?: number
          total_reviews_written?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          helpful_votes_received?: number
          total_businesses_saved?: number
          total_helpful_votes_given?: number
          total_reviews_written?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subcategories: {
        Row: {
          created_at: string | null
          interest_id: string
          subcategory_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          interest_id: string
          subcategory_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          interest_id?: string
          subcategory_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      mv_new_businesses: {
        Row: {
          average_rating: number | null
          badge: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          last_refreshed: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string | null
          percentiles: Json | null
          price_range: string | null
          primary_category_slug: string | null
          primary_image_url: string | null
          primary_subcategory_label: string | null
          primary_subcategory_slug: string | null
          slug: string | null
          total_reviews: number | null
          verified: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_primary_subcategory_slug_fk"
            columns: ["primary_subcategory_slug"]
            isOneToOne: false
            referencedRelation: "canonical_subcategory_slugs"
            referencedColumns: ["slug"]
          },
        ]
      }
      mv_quality_fallback_businesses: {
        Row: {
          average_rating: number | null
          badge: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          last_refreshed: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string | null
          percentiles: Json | null
          price_range: string | null
          primary_category_slug: string | null
          primary_subcategory_label: string | null
          primary_subcategory_slug: string | null
          quality_score: number | null
          slug: string | null
          total_reviews: number | null
          updated_at: string | null
          verified: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_primary_subcategory_slug_fk"
            columns: ["primary_subcategory_slug"]
            isOneToOne: false
            referencedRelation: "canonical_subcategory_slugs"
            referencedColumns: ["slug"]
          },
        ]
      }
      mv_top_rated_businesses: {
        Row: {
          average_rating: number | null
          badge: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          last_refreshed: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string | null
          percentiles: Json | null
          price_range: string | null
          primary_category_slug: string | null
          primary_image_url: string | null
          primary_subcategory_label: string | null
          primary_subcategory_slug: string | null
          slug: string | null
          total_reviews: number | null
          verified: boolean | null
          weighted_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_primary_subcategory_slug_fk"
            columns: ["primary_subcategory_slug"]
            isOneToOne: false
            referencedRelation: "canonical_subcategory_slugs"
            referencedColumns: ["slug"]
          },
        ]
      }
      mv_trending_businesses: {
        Row: {
          address: string | null
          average_rating: number | null
          badge: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          last_refreshed: string | null
          last_review_24h: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string | null
          percentiles: Json | null
          price_range: string | null
          primary_category_slug: string | null
          primary_subcategory_label: string | null
          primary_subcategory_slug: string | null
          recent_avg_rating_24h: number | null
          recent_reviews_24h: number | null
          slug: string | null
          total_reviews: number | null
          trending_score: number | null
          updated_at: string | null
          uploaded_images: string[] | null
          verified: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_primary_subcategory_slug_fk"
            columns: ["primary_subcategory_slug"]
            isOneToOne: false
            referencedRelation: "canonical_subcategory_slugs"
            referencedColumns: ["slug"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          badges_count: number | null
          display_name: string | null
          is_top_reviewer: boolean | null
          reviews_count: number | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          badges_count?: number | null
          display_name?: string | null
          is_top_reviewer?: boolean | null
          reviews_count?: number | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          badges_count?: number | null
          display_name?: string | null
          is_top_reviewer?: boolean | null
          reviews_count?: number | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      v_events_and_specials_cards: {
        Row: {
          booking_contact: string | null
          booking_url: string | null
          business_id: string | null
          description: string | null
          end_date: string | null
          icon: string | null
          image: string | null
          location: string | null
          norm_location: string | null
          norm_title: string | null
          occurrences: number | null
          representative_id: string | null
          start_date: string | null
          start_dates: string[] | null
          title: string | null
          type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_and_specials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_and_specials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_new_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_and_specials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_quality_fallback_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_and_specials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_top_rated_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_and_specials_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "mv_trending_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      award_badges_for_user: {
        Args: { p_event_data?: Json; p_event_type: string; p_user_id: string }
        Returns: {
          awarded_badge_id: string
          badge_name: string
        }[]
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      calculate_distance_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      calculate_trending_score_24h: {
        Args: { p_business_id: string; p_now?: string }
        Returns: {
          avg_rating_24h: number
          reviews_24h: number
          trending_score: number
        }[]
      }
      check_user_badges: {
        Args: { p_user_id: string }
        Returns: {
          awarded_badge_id: string
          badge_name: string
        }[]
      }
      cleanup_expired_business_claim_documents: {
        Args: never
        Returns: undefined
      }
      cleanup_expired_business_claim_otp: { Args: never; Returns: undefined }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      cleanup_old_auth_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_claim_documents: { Args: never; Returns: undefined }
      cleanup_old_profile_views: { Args: never; Returns: undefined }
      cleanup_old_reco_impressions: { Args: never; Returns: number }
      complete_claim_verification: {
        Args: { p_claim_id: string; p_method?: string }
        Returns: Json
      }
      complete_onboarding: {
        Args: {
          p_dealbreaker_ids: string[]
          p_interest_ids: string[]
          p_subcategory_ids: string[]
          p_user_id: string
        }
        Returns: Json
      }
      complete_onboarding_atomic: {
        Args: {
          p_dealbreaker_ids: string[]
          p_interest_ids: string[]
          p_subcategory_data: Json[]
          p_user_id: string
        }
        Returns: undefined
      }
      create_badge_notification: {
        Args: {
          p_badge_icon?: string
          p_badge_id: string
          p_badge_name: string
          p_user_id: string
        }
        Returns: string
      }
      create_helpful_notification: {
        Args: {
          p_review_id: string
          p_review_owner_id: string
          p_voter_id: string
          p_voter_name?: string
        }
        Returns: string
      }
      create_message_notification: {
        Args: {
          p_image?: string
          p_image_alt?: string
          p_link?: string
          p_message: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      create_review_notification: {
        Args: {
          p_image?: string
          p_image_alt?: string
          p_link?: string
          p_message: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      cron_fetch_ticketmaster_events: { Args: never; Returns: undefined }
      delete_user_account: { Args: { p_user_id: string }; Returns: undefined }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      earth: { Args: never; Returns: number }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      fetch_ticketmaster_events: {
        Args: {
          p_city?: string
          p_keyword?: string
          p_page?: number
          p_size?: number
        }
        Returns: Json
      }
      generate_candidates_explore: {
        Args: {
          p_excluded_ids: string[]
          p_limit?: number
          p_seen_sub_interests: string[]
        }
        Returns: {
          business_id: string
          diversity_score: number
          source: string
        }[]
      }
      generate_candidates_fresh: {
        Args: { p_excluded_ids: string[]; p_limit?: number }
        Returns: {
          business_id: string
          freshness_score: number
          source: string
        }[]
      }
      generate_candidates_personalized: {
        Args: {
          p_excluded_ids: string[]
          p_interest_ids: string[]
          p_limit?: number
          p_sub_interest_ids: string[]
          p_user_id: string
        }
        Returns: {
          business_id: string
          interest_match_score: number
          source: string
        }[]
      }
      generate_candidates_top_rated: {
        Args: { p_excluded_ids: string[]; p_limit?: number }
        Returns: {
          business_id: string
          quality_score: number
          source: string
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_category_image_url: {
        Args: { business_name?: string; category_name: string }
        Returns: string
      }
      get_curated_businesses: {
        Args: {
          p_interest_id?: string
          p_limit?: number
          p_user_lat?: number
          p_user_lng?: number
        }
        Returns: {
          average_rating: number
          category: string
          created_at: string
          curation_score: number
          description: string
          id: string
          image_url: string
          interest_id: string
          is_top3: boolean
          last_activity_at: string
          lat: number
          lng: number
          location: string
          name: string
          owner_verified: boolean
          rank_position: number
          slug: string
          sub_interest_id: string
          total_reviews: number
          verified: boolean
        }[]
      }
      get_featured_businesses: {
        Args: { p_limit?: number; p_region?: string; p_seed?: string }
        Returns: {
          average_rating: number
          bayesian_rating: number
          bucket: string
          category: string
          category_label: string
          description: string
          featured_score: number
          id: string
          image_url: string
          last_activity_at: string
          location: string
          name: string
          recent_reviews_30d: number
          recent_reviews_7d: number
          slug: string
          sub_interest_id: string
          total_reviews: number
          verified: boolean
        }[]
      }
      get_featured_cold_start_candidates: {
        Args: { p_city?: string; p_pool_size?: number }
        Returns: {
          featured_score: number
          id: string
          is_trusted: boolean
          primary_category_slug: string
          primary_subcategory_label: string
          primary_subcategory_slug: string
        }[]
      }
      get_new_businesses: {
        Args: { p_category?: string; p_limit?: number }
        Returns: {
          average_rating: number | null
          badge: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          last_refreshed: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string | null
          percentiles: Json | null
          price_range: string | null
          primary_category_slug: string | null
          primary_image_url: string | null
          primary_subcategory_label: string | null
          primary_subcategory_slug: string | null
          slug: string | null
          total_reviews: number | null
          verified: boolean | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_new_businesses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_onboarding_status: { Args: { p_user_id: string }; Returns: Json }
      get_quality_fallback_businesses: {
        Args: { p_limit?: number }
        Returns: {
          average_rating: number | null
          badge: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          last_refreshed: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string | null
          percentiles: Json | null
          price_range: string | null
          primary_category_slug: string | null
          primary_subcategory_label: string | null
          primary_subcategory_slug: string | null
          quality_score: number | null
          slug: string | null
          total_reviews: number | null
          updated_at: string | null
          verified: boolean | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_quality_fallback_businesses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_recently_shown_businesses: {
        Args: { p_hours?: number; p_user_id: string }
        Returns: string[]
      }
      get_review_image_url: { Args: { storage_path: string }; Returns: string }
      get_similar_businesses: {
        Args: {
          p_limit?: number
          p_radius_km?: number
          p_target_business_id: string
        }
        Returns: {
          address: string
          average_rating: number
          badge: string
          category: string
          created_at: string
          description: string
          email: string
          id: string
          image_url: string
          latitude: number
          location: string
          longitude: number
          name: string
          percentiles: Json
          phone: string
          price_range: string
          primary_category_slug: string
          primary_subcategory_label: string
          primary_subcategory_slug: string
          similarity_score: number
          slug: string
          total_reviews: number
          updated_at: string
          uploaded_images: string[]
          verified: boolean
          website: string
        }[]
      }
      get_top_rated_businesses: {
        Args: { p_category?: string; p_limit?: number }
        Returns: {
          average_rating: number | null
          badge: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          last_refreshed: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string | null
          percentiles: Json | null
          price_range: string | null
          primary_category_slug: string | null
          primary_image_url: string | null
          primary_subcategory_label: string | null
          primary_subcategory_slug: string | null
          slug: string | null
          total_reviews: number | null
          verified: boolean | null
          weighted_score: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_top_rated_businesses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_trending_businesses: {
        Args: { p_category?: string; p_limit?: number }
        Returns: {
          address: string | null
          average_rating: number | null
          badge: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          last_refreshed: string | null
          last_review_24h: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string | null
          percentiles: Json | null
          price_range: string | null
          primary_category_slug: string | null
          primary_subcategory_label: string | null
          primary_subcategory_slug: string | null
          recent_avg_rating_24h: number | null
          recent_reviews_24h: number | null
          slug: string | null
          total_reviews: number | null
          trending_score: number | null
          updated_at: string | null
          uploaded_images: string[] | null
          verified: boolean | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mv_trending_businesses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_trending_cold_start_candidates: {
        Args: { p_city?: string; p_pool_size?: number }
        Returns: {
          cold_start_score: number
          id: string
          primary_category_slug: string
          primary_subcategory_label: string
          primary_subcategory_slug: string
        }[]
      }
      get_trending_now_businesses: {
        Args: {
          p_category?: string
          p_interest_ids?: string[]
          p_latitude?: number
          p_limit?: number
          p_longitude?: number
          p_subcategory_ids?: string[]
        }
        Returns: {
          address: string
          average_rating: number
          badge: string
          category: string
          created_at: string
          description: string
          email: string
          id: string
          image_url: string
          interest_id: string
          last_review_date: string
          latitude: number
          location: string
          longitude: number
          name: string
          percentiles: Json
          phone: string
          price_range: string
          recent_reviews_24h: number
          recent_reviews_48h: number
          slug: string
          sub_interest_id: string
          total_reviews: number
          trending_score: number
          updated_at: string
          uploaded_image: string
          verified: boolean
          website: string
        }[]
      }
      get_user_badge_progress: {
        Args: { p_user_id: string }
        Returns: {
          badge_description: string
          badge_group: string
          badge_id: string
          badge_name: string
          is_earned: boolean
          percentage_complete: number
          progress: number
          target: number
        }[]
      }
      get_user_badge_stats: {
        Args: { p_user_id: string }
        Returns: {
          badges_by_group: Json
          recent_badges: Json
          total_badges: number
        }[]
      }
      get_user_badges: {
        Args: { p_user_id: string }
        Returns: {
          awarded_at: string
          badge_description: string
          badge_group: string
          badge_id: string
          badge_name: string
          category_key: string
          icon_name: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      highlight_text: {
        Args: { search_query: string; text_content: string }
        Returns: string
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      list_businesses_optimized: {
        Args: {
          p_badge?: string
          p_category?: string
          p_cursor_created_at?: string
          p_cursor_id?: string
          p_latitude?: number
          p_limit?: number
          p_location?: string
          p_longitude?: number
          p_min_rating?: number
          p_price_range?: string
          p_radius_km?: number
          p_search?: string
          p_sort_by?: string
          p_sort_order?: string
          p_verified?: boolean
        }
        Returns: {
          address: string
          average_rating: number
          badge: string
          created_at: string
          cursor_created_at: string
          cursor_id: string
          description: string
          distance_km: number
          email: string
          id: string
          image_url: string
          latitude: number
          location: string
          longitude: number
          name: string
          percentiles: Json
          phone: string
          price_range: string
          primary_category_slug: string
          primary_subcategory_label: string
          primary_subcategory_slug: string
          slug: string
          total_reviews: number
          updated_at: string
          uploaded_images: string[]
          verified: boolean
          website: string
        }[]
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      rank_candidates: {
        Args: {
          p_candidate_ids: string[]
          p_latitude: number
          p_limit?: number
          p_longitude: number
          p_user_interest_ids: string[]
          p_user_sub_interest_ids: string[]
        }
        Returns: {
          address: string
          average_rating: number
          badge: string
          category: string
          created_at: string
          description: string
          diversity_rank: number
          email: string
          final_score: number
          id: string
          image_url: string
          interest_id: string
          last_activity_at: string
          latitude: number
          location: string
          longitude: number
          name: string
          percentiles: Json
          phone: string
          price_range: string
          slug: string
          sub_interest_id: string
          total_reviews: number
          updated_at: string
          verified: boolean
          website: string
        }[]
      }
      recommend_for_you_cold_start: {
        Args: {
          p_interest_ids?: string[]
          p_latitude?: number
          p_limit?: number
          p_longitude?: number
          p_price_ranges?: string[]
          p_seed?: string
          p_sub_interest_ids?: string[]
        }
        Returns: {
          address: string
          average_rating: number
          badge: string
          category: string
          created_at: string
          description: string
          diversity_rank: number
          email: string
          id: string
          image_url: string
          interest_id: string
          latitude: number
          location: string
          longitude: number
          name: string
          percentiles: Json
          personalization_score: number
          phone: string
          price_range: string
          slug: string
          sub_interest_id: string
          total_reviews: number
          updated_at: string
          uploaded_images: string[]
          verified: boolean
          website: string
        }[]
      }
      recommend_for_you_unified: {
        Args: {
          p_dealbreaker_ids?: string[]
          p_interest_ids?: string[]
          p_latitude?: number
          p_limit?: number
          p_longitude?: number
          p_price_ranges?: string[]
          p_seed?: string
          p_sub_interest_ids?: string[]
        }
        Returns: {
          address: string
          average_rating: number
          badge: string
          category: string
          created_at: string
          description: string
          diversity_rank: number
          email: string
          id: string
          image_url: string
          interest_id: string
          latitude: number
          location: string
          longitude: number
          name: string
          percentiles: Json
          personalization_score: number
          phone: string
          price_range: string
          slug: string
          source: string
          sub_interest_id: string
          total_reviews: number
          updated_at: string
          uploaded_images: string[]
          verified: boolean
          website: string
        }[]
      }
      recommend_for_you_v2: {
        Args: {
          p_interest_ids?: string[]
          p_latitude?: number
          p_limit?: number
          p_longitude?: number
          p_price_ranges?: string[]
          p_sub_interest_ids?: string[]
          p_suppress_recent_hours?: number
          p_user_id?: string
        }
        Returns: {
          address: string
          average_rating: number
          badge: string
          category: string
          created_at: string
          description: string
          diversity_rank: number
          email: string
          id: string
          image_url: string
          interest_id: string
          latitude: number
          location: string
          longitude: number
          name: string
          percentiles: Json
          personalization_score: number
          phone: string
          price_range: string
          slug: string
          sub_interest_id: string
          total_reviews: number
          updated_at: string
          verified: boolean
          website: string
        }[]
      }
      recommend_for_you_v2_seeded: {
        Args: {
          p_interest_ids?: string[]
          p_latitude?: number
          p_limit?: number
          p_longitude?: number
          p_price_ranges?: string[]
          p_seed?: string
          p_sub_interest_ids?: string[]
          p_suppress_recent_hours?: number
          p_user_id?: string
        }
        Returns: {
          address: string
          average_rating: number
          badge: string
          category: string
          created_at: string
          description: string
          diversity_rank: number
          email: string
          id: string
          image_url: string
          interest_id: string
          latitude: number
          location: string
          longitude: number
          name: string
          percentiles: Json
          personalization_score: number
          phone: string
          price_range: string
          slug: string
          sub_interest_id: string
          total_reviews: number
          updated_at: string
          uploaded_images: string[]
          verified: boolean
          website: string
        }[]
      }
      recommend_personalized_businesses: {
        Args: {
          p_excluded_business_ids?: string[]
          p_latitude?: number
          p_limit?: number
          p_longitude?: number
          p_min_rating?: number
          p_price_ranges?: string[]
          p_user_interest_ids?: string[]
          p_user_sub_interest_ids?: string[]
        }
        Returns: {
          address: string
          average_rating: number
          badge: string
          category: string
          created_at: string
          description: string
          diversity_rank: number
          email: string
          id: string
          image_url: string
          interest_id: string
          latitude: number
          location: string
          longitude: number
          name: string
          percentiles: Json
          personalization_score: number
          phone: string
          price_range: string
          slug: string
          sub_interest_id: string
          total_reviews: number
          updated_at: string
          uploaded_images: string[]
          verified: boolean
          website: string
        }[]
      }
      record_reco_impressions: {
        Args: { p_business_ids: string[]; p_user_id: string }
        Returns: undefined
      }
      record_reco_impressions_v2: {
        Args: {
          p_business_ids: string[]
          p_feed_context?: string
          p_request_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      refresh_business_views: { Args: never; Returns: undefined }
      refresh_mv_trending_businesses: { Args: never; Returns: undefined }
      replace_user_dealbreakers: {
        Args: { p_dealbreaker_ids: string[]; p_user_id: string }
        Returns: {
          dealbreakers_count: number
          interests_count: number
          onboarding_complete: boolean
          onboarding_step: string
          subcategories_count: number
        }[]
      }
      replace_user_interests: {
        Args: { p_interest_ids: string[]; p_user_id: string }
        Returns: undefined
      }
      replace_user_subcategories: {
        Args: { p_subcategory_data: Json[]; p_user_id: string }
        Returns: undefined
      }
      search_businesses: {
        Args: {
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_location?: string
          p_offset?: number
          p_radius_km?: number
          p_verified_only?: boolean
          q: string
        }
        Returns: {
          address: string
          alias_boost: number
          average_rating: number
          badge: string
          category: string
          created_at: string
          description: string
          email: string
          final_score: number
          fuzzy_similarity: number
          id: string
          image_url: string
          interest_id: string
          lat: number
          lng: number
          location: string
          matched_alias: string
          name: string
          owner_id: string
          phone: string
          price_range: string
          search_rank: number
          slug: string
          status: string
          sub_interest_id: string
          total_reviews: number
          updated_at: string
          verified: boolean
          website: string
        }[]
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      start_business_claim: {
        Args: { p_business_id: string; p_claimant_user_id: string }
        Returns: Json
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      update_business_stats: {
        Args: { p_business_id: string }
        Returns: undefined
      }
      update_user_stats: { Args: { p_user_id: string }; Returns: undefined }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      upsert_events_and_specials_consolidated: {
        Args: { p_rows: Json }
        Returns: {
          inserted: number
          updated: number
        }[]
      }
      url_encode: { Args: { input: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      utc_date: { Args: { ts: string }; Returns: string }
      verify_business_claim: {
        Args: {
          p_admin_notes?: string
          p_admin_user_id: string
          p_approved: boolean
          p_claim_id: string
          p_rejection_reason?: string
        }
        Returns: Json
      }
    }
    Enums: {
      business_claim_doc_status: "uploaded" | "approved" | "rejected"
      business_claim_doc_type: "letterhead_authorization" | "lease_first_page"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      business_claim_doc_status: ["uploaded", "approved", "rejected"],
      business_claim_doc_type: ["letterhead_authorization", "lease_first_page"],
    },
  },
} as const
