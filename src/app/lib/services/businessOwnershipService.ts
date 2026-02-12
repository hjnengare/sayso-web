"use client";

import { getBrowserSupabase } from "../supabase/client";
import type { Business } from "../types/database";

export interface BusinessOwnershipRequest {
  id: string;
  business_id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  verification_method: "email" | "phone" | "document" | "manual";
  verification_data?: Record<string, any>;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

export interface BusinessOwner {
  id: string;
  business_id: string;
  user_id: string;
  role: "owner" | "manager" | "admin";
  verified_at: string;
  verified_by?: string;
}

export class BusinessOwnershipService {
  private static getSupabase() {
    return getBrowserSupabase();
  }

  /**
   * Check if a user owns a business
   * Checks both the business_owners table and direct owner_id on businesses table
   * Supports both UUID and slug identifiers
   */
  static async isBusinessOwner(userId: string, businessIdentifier: string): Promise<boolean> {
    // Early return guards to prevent unnecessary queries
    if (!userId || !businessIdentifier) {
      return false;
    }

    try {
      const supabase = this.getSupabase();

      // Resolve business identifier (slug or UUID) to actual UUID
      let businessId: string | null = null;

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(businessIdentifier);

      if (isUUID) {
        // It's already a UUID, use it directly
        businessId = businessIdentifier;
      } else {
        // Try to resolve slug to UUID
        const { data: slugData, error: slugError } = await supabase
          .from("businesses")
          .select("id")
          .eq("slug", businessIdentifier)
          .eq("status", "active")
          .maybeSingle();

        if (slugError) {
          console.error("Error resolving business slug to ID:", {
            slug: businessIdentifier,
            error: slugError,
          });
          return false;
        }

        if (slugData?.id && typeof slugData.id === "string") {
          businessId = slugData.id;
        } else {
          // Slug not found
          return false;
        }
      }

      // Verify businessId is a valid UUID before using it in queries
      if (!businessId || typeof businessId !== "string" || !uuidRegex.test(businessId)) {
        console.error("Invalid business ID format:", businessId);
        return false;
      }

      // First check: business_owners table (using maybeSingle to avoid PGRST116)
      const { data: ownerData, error: ownerError } = await supabase
        .from("business_owners")
        .select("id")
        .eq("business_id", businessId)
        .eq("user_id", userId)
        .maybeSingle();

      if (ownerError) {
        console.error("Error checking business ownership (business_owners table):", {
          name: (ownerError as any)?.name,
          message: (ownerError as any)?.message,
          code: (ownerError as any)?.code,
          details: (ownerError as any)?.details,
          hint: (ownerError as any)?.hint,
          status: (ownerError as any)?.status,
          raw: ownerError,
        });
        // Continue to check direct owner_id even if this fails
      } else if (ownerData) {
        // Found in business_owners table
        return true;
      }

      // Second check: direct owner_id on businesses table
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("owner_id")
        .eq("id", businessId)
        .maybeSingle();

      if (businessError) {
        console.error("Error checking business ownership (businesses table):", {
          name: (businessError as any)?.name,
          message: (businessError as any)?.message,
          code: (businessError as any)?.code,
          details: (businessError as any)?.details,
          hint: (businessError as any)?.hint,
          status: (businessError as any)?.status,
          raw: businessError,
        });
        return false;
      }

      // Check if user is the direct owner
      return businessData?.owner_id === userId;
    } catch (error) {
      console.error("Error checking business ownership (catch):", {
        name: (error as any)?.name,
        message: error instanceof Error ? error.message : String(error),
        raw: error,
      });
      return false;
    }
  }

  /**
   * Get all businesses owned by a user (optimized single query)
   *
   * IMPORTANT:
   * Supabase join typing can return `businesses` as:
   * - Business
   * - Business[]
   * - null
   *
   * We normalize to a flat, unique Business[] by business.id.
   */
  static async getBusinessesForOwner(userId: string): Promise<Business[]> {
    try {
      const supabase = this.getSupabase();

      const businessSelectColumns = `
        id,
        name,
        slug,
        description,
        primary_subcategory_slug,
        primary_subcategory_label,
        primary_category_slug,
        location,
        address,
        phone,
        email,
        website,
        image_url,
        verified,
        price_range,
        created_at,
        updated_at,
        status,
        owner_id,
        owner_verified,
        lat,
        lng,
        source,
        source_id
      `;

      type OwnerJoinRow = {
        business_id: string;
        businesses: Business | Business[] | null;
      };
      type ClaimJoinRow = {
        business_id: string;
        businesses: Business | Business[] | null;
      };

      const [ownerJoinResult, directOwnerResult, verifiedClaimsResult] = await Promise.all([
        supabase
          .from("business_owners")
          .select(
            `
            business_id,
            businesses!inner (
              ${businessSelectColumns}
            )
          `
          )
          .eq("user_id", userId),
        supabase
          .from("businesses")
          .select(businessSelectColumns)
          .eq("owner_id", userId),
        supabase
          .from("business_claims")
          .select(
            `
            business_id,
            businesses!inner (
              ${businessSelectColumns}
            )
          `
          )
          .eq("claimant_user_id", userId)
          .in("status", ["verified", "under_review"]),
      ]);

      if (ownerJoinResult.error) {
        console.error("Error fetching businesses for owner via business_owners:", ownerJoinResult.error);
      }
      if (directOwnerResult.error) {
        console.error("Error fetching businesses for owner via businesses.owner_id:", directOwnerResult.error);
      }
      if (verifiedClaimsResult.error) {
        console.error("Error fetching businesses for owner via verified claims:", verifiedClaimsResult.error);
      }

      const hasOwnerJoinError = Boolean(ownerJoinResult.error);
      const hasDirectOwnerError = Boolean(directOwnerResult.error);
      const hasVerifiedClaimsError = Boolean(verifiedClaimsResult.error);

      if (hasOwnerJoinError && hasDirectOwnerError && hasVerifiedClaimsError) {
        const ownerJoinMessage = ownerJoinResult.error?.message || "";
        const directOwnerMessage = directOwnerResult.error?.message || "";
        const verifiedClaimsMessage = verifiedClaimsResult.error?.message || "";
        if (
          ownerJoinMessage.includes("fetch") ||
          ownerJoinMessage.includes("network") ||
          directOwnerMessage.includes("fetch") ||
          directOwnerMessage.includes("network") ||
          verifiedClaimsMessage.includes("fetch") ||
          verifiedClaimsMessage.includes("network")
        ) {
          throw new Error(
            "Network error: Unable to fetch business data. Please check your connection."
          );
        }
        return [];
      }

      const rows = ((ownerJoinResult.data ?? []) as unknown) as OwnerJoinRow[];
      const claimRows = ((verifiedClaimsResult.data ?? []) as unknown) as ClaimJoinRow[];
      const directlyOwnedBusinesses = ((directOwnerResult.data ?? []) as unknown) as Business[];

      // Normalize to flat list
      const flattened: Business[] = [...directlyOwnedBusinesses];
      for (const row of rows) {
        const joined = row.businesses;

        if (!joined) continue;

        if (Array.isArray(joined)) {
          for (const b of joined) {
            if (b && typeof (b as any).id === "string") flattened.push(b);
          }
        } else {
          if (joined && typeof (joined as any).id === "string") flattened.push(joined);
        }
      }

      for (const row of claimRows) {
        const joined = row.businesses;
        if (!joined) continue;

        if (Array.isArray(joined)) {
          for (const b of joined) {
            if (b && typeof (b as any).id === "string") flattened.push(b);
          }
        } else {
          if (joined && typeof (joined as any).id === "string") flattened.push(joined);
        }
      }

      // Dedupe by business.id (prevents duplicates from joins or accidental double ownership rows)
      const seen = new Set<string>();
      const unique = flattened.filter((b) => {
        if (!b?.id) return false;
        if (seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });

      return unique;
    } catch (error) {
      console.error("Error getting businesses for owner:", error);

      // Re-throw network errors so they can be handled upstream
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw error;
      }

      return [];
    }
  }

  /**
   * Get a single business owned by the user
   * Returns null if user doesn't own the business or business doesn't exist
   * Supports both UUID and slug identifiers
   */
  static async getOwnedBusinessById(
    userId: string,
    businessIdentifier: string
  ): Promise<Business | null> {
    try {
      const supabase = this.getSupabase();

      // Resolve business identifier (slug or UUID) to actual UUID
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUUID = uuidRegex.test(businessIdentifier);

      let businessId: string | null = null;

      if (isUUID) {
        businessId = businessIdentifier;
      } else {
        // Resolve slug to UUID
        const { data: slugData, error: slugError } = await supabase
          .from("businesses")
          .select("id")
          .eq("slug", businessIdentifier)
          .eq("status", "active")
          .maybeSingle();

        if (slugError || !slugData?.id) {
          console.error("Error resolving business slug:", slugError);
          return null;
        }
        businessId = slugData.id;
      }

      // Check ownership using the resolved UUID
      const isOwner = await this.isBusinessOwner(userId, businessId);
      if (!isOwner) {
        return null;
      }

      // Get business details using the resolved UUID
      const { data: business, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .single();

      if (error || !business) {
        console.error("Error fetching owned business:", error);
        return null;
      }

      return business as Business;
    } catch (error) {
      console.error("Error getting owned business by ID:", error);
      return null;
    }
  }

  /**
   * Create a business ownership request
   */
  static async createOwnershipRequest(
    businessId: string,
    userId: string,
    verificationMethod: "email" | "phone" | "document" | "manual",
    verificationData?: Record<string, any>
  ): Promise<{ success: boolean; request?: BusinessOwnershipRequest; error?: string }> {
    try {
      const supabase = this.getSupabase();

      // Check if there's already a pending request
      const { data: existingRequest, error: existingRequestError } = await supabase
        .from("business_ownership_requests")
        .select("*")
        .eq("business_id", businessId)
        .eq("user_id", userId)
        .eq("status", "pending")
        .maybeSingle();

      if (existingRequestError) {
        console.error("Error checking for existing ownership request:", {
          name: (existingRequestError as any)?.name,
          message: (existingRequestError as any)?.message,
          code: (existingRequestError as any)?.code,
          details: (existingRequestError as any)?.details,
          hint: (existingRequestError as any)?.hint,
          status: (existingRequestError as any)?.status,
          raw: existingRequestError,
        });
        // Continue with request creation if check fails
      } else if (existingRequest) {
        return {
          success: false,
          error: "You already have a pending ownership request for this business.",
        };
      }

      // Check if user already owns the business
      const isOwner = await this.isBusinessOwner(userId, businessId);
      if (isOwner) {
        return {
          success: false,
          error: "You already own this business.",
        };
      }

      // Create the request
      const { data, error } = await supabase
        .from("business_ownership_requests")
        .insert({
          business_id: businessId,
          user_id: userId,
          status: "pending",
          verification_method: verificationMethod,
          verification_data: verificationData || {},
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating ownership request:", error);
        return {
          success: false,
          error: error.message || "Failed to create ownership request.",
        };
      }

      // Update business to mark verification as requested
      await supabase
        .from("businesses")
        .update({
          owner_verification_requested_at: new Date().toISOString(),
        })
        .eq("id", businessId);

      return {
        success: true,
        request: data as BusinessOwnershipRequest,
      };
    } catch (error) {
      console.error("Error creating ownership request:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred.",
      };
    }
  }

  /**
   * Get ownership requests for a user
   */
  static async getUserOwnershipRequests(userId: string): Promise<BusinessOwnershipRequest[]> {
    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from("business_ownership_requests")
        .select("*")
        .eq("user_id", userId)
        .order("requested_at", { ascending: false });

      if (error) {
        console.error("Error fetching ownership requests:", error);
        return [];
      }

      return (data || []) as BusinessOwnershipRequest[];
    } catch (error) {
      console.error("Error getting user ownership requests:", error);
      return [];
    }
  }

  /**
   * Get ownership request by ID
   */
  static async getOwnershipRequest(requestId: string): Promise<BusinessOwnershipRequest | null> {
    if (!requestId) {
      return null;
    }

    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from("business_ownership_requests")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching ownership request:", {
          name: (error as any)?.name,
          message: (error as any)?.message,
          code: (error as any)?.code,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          status: (error as any)?.status,
          raw: error,
        });
        return null;
      }

      return data as BusinessOwnershipRequest | null;
    } catch (error) {
      console.error("Error getting ownership request:", {
        name: (error as any)?.name,
        message: error instanceof Error ? error.message : String(error),
        raw: error,
      });
      return null;
    }
  }

  /**
   * Cancel a pending ownership request
   */
  static async cancelOwnershipRequest(
    requestId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = this.getSupabase();
      const { error } = await supabase
        .from("business_ownership_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId)
        .eq("user_id", userId)
        .eq("status", "pending");

      if (error) {
        console.error("Error cancelling ownership request:", error);
        return {
          success: false,
          error: error.message || "Failed to cancel ownership request.",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error cancelling ownership request:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred.",
      };
    }
  }

  /**
   * Get business owner information
   */
  static async getBusinessOwner(businessId: string): Promise<BusinessOwner | null> {
    if (!businessId) {
      return null;
    }

    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from("business_owners")
        .select("*")
        .eq("business_id", businessId)
        .eq("role", "owner")
        .maybeSingle();

      if (error) {
        console.error("Error fetching business owner:", {
          name: (error as any)?.name,
          message: (error as any)?.message,
          code: (error as any)?.code,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          status: (error as any)?.status,
          raw: error,
        });
        return null;
      }

      return data as BusinessOwner | null;
    } catch (error) {
      console.error("Error getting business owner:", {
        name: (error as any)?.name,
        message: error instanceof Error ? error.message : String(error),
        raw: error,
      });
      return null;
    }
  }

  /**
   * Check if business ownership is verified
   */
  static async isOwnershipVerified(businessId: string): Promise<boolean> {
    if (!businessId) {
      return false;
    }

    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from("businesses")
        .select("owner_verified")
        .eq("id", businessId)
        .maybeSingle();

      if (error) {
        console.error("Error checking ownership verification:", {
          name: (error as any)?.name,
          message: (error as any)?.message,
          code: (error as any)?.code,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          status: (error as any)?.status,
          raw: error,
        });
        return false;
      }

      return data?.owner_verified || false;
    } catch (error) {
      console.error("Error checking ownership verification:", {
        name: (error as any)?.name,
        message: error instanceof Error ? error.message : String(error),
        raw: error,
      });
      return false;
    }
  }
}
