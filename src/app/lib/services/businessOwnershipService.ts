"use client";

import { getBrowserSupabase } from "../supabase/client";
import type { Business } from "../types/database";

export interface BusinessOwnershipRequest {
  id: string;
  business_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  verification_method: 'email' | 'phone' | 'document' | 'manual';
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
  role: 'owner' | 'manager' | 'admin';
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
   */
  static async isBusinessOwner(userId: string, businessId: string): Promise<boolean> {
    // Early return guards to prevent unnecessary queries
    if (!userId || !businessId) {
      return false;
    }

    try {
      const supabase = this.getSupabase();
      
      // First check: business_owners table (using maybeSingle to avoid PGRST116)
      const { data: ownerData, error: ownerError } = await supabase
        .from('business_owners')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .maybeSingle();

      if (ownerError) {
        console.error('Error checking business ownership (business_owners table):', {
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
        .from('businesses')
        .select('owner_id')
        .eq('id', businessId)
        .maybeSingle();

      if (businessError) {
        console.error('Error checking business ownership (businesses table):', {
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
      console.error('Error checking business ownership (catch):', {
        name: (error as any)?.name,
        message: error instanceof Error ? error.message : String(error),
        raw: error,
      });
      return false;
    }
  }

  /**
   * Get all businesses owned by a user
   */
  static async getBusinessesForOwner(userId: string): Promise<Business[]> {
    try {
      const supabase = this.getSupabase();
      const { data: owners, error: ownersError } = await supabase
        .from('business_owners')
        .select('business_id')
        .eq('user_id', userId);

      if (ownersError) {
        console.error('Error fetching business owners:', ownersError);
        // Handle network errors
        if (ownersError.message?.includes('fetch') || ownersError.message?.includes('network')) {
          throw new Error('Network error: Unable to fetch business data. Please check your connection.');
        }
        return [];
      }

      if (!owners || owners.length === 0) {
        return [];
      }

      const businessIds = owners.map(o => o.business_id);

      const { data: businesses, error: businessesError } = await supabase
        .from('businesses')
        .select('*')
        .in('id', businessIds)
        .eq('status', 'active');

      if (businessesError) {
        console.error('Error fetching businesses:', businessesError);
        // Handle network errors
        if (businessesError.message?.includes('fetch') || businessesError.message?.includes('network')) {
          throw new Error('Network error: Unable to fetch business data. Please check your connection.');
        }
        return [];
      }

      return (businesses || []) as Business[];
    } catch (error) {
      console.error('Error getting businesses for owner:', error);
      // Re-throw network errors so they can be handled upstream
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw error;
      }
      return [];
    }
  }

  /**
   * Create a business ownership request
   */
  static async createOwnershipRequest(
    businessId: string,
    userId: string,
    verificationMethod: 'email' | 'phone' | 'document' | 'manual',
    verificationData?: Record<string, any>
  ): Promise<{ success: boolean; request?: BusinessOwnershipRequest; error?: string }> {
    try {
      const supabase = this.getSupabase();
      // Check if there's already a pending request
      const { data: existingRequest, error: existingRequestError } = await supabase
        .from('business_ownership_requests')
        .select('*')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequestError) {
        console.error('Error checking for existing ownership request:', {
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
          error: 'You already have a pending ownership request for this business.'
        };
      }

      // Check if user already owns the business
      const isOwner = await this.isBusinessOwner(userId, businessId);
      if (isOwner) {
        return {
          success: false,
          error: 'You already own this business.'
        };
      }

      // Create the request
      const { data, error } = await supabase
        .from('business_ownership_requests')
        .insert({
          business_id: businessId,
          user_id: userId,
          status: 'pending',
          verification_method: verificationMethod,
          verification_data: verificationData || {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating ownership request:', error);
        return {
          success: false,
          error: error.message || 'Failed to create ownership request.'
        };
      }

      // Update business to mark verification as requested
      await supabase
        .from('businesses')
        .update({
          owner_verification_requested_at: new Date().toISOString()
        })
        .eq('id', businessId);

      return {
        success: true,
        request: data as BusinessOwnershipRequest
      };
    } catch (error) {
      console.error('Error creating ownership request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred.'
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
        .from('business_ownership_requests')
        .select('*')
        .eq('user_id', userId)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error fetching ownership requests:', error);
        return [];
      }

      return (data || []) as BusinessOwnershipRequest[];
    } catch (error) {
      console.error('Error getting user ownership requests:', error);
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
        .from('business_ownership_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching ownership request:', {
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
      console.error('Error getting ownership request:', {
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
  static async cancelOwnershipRequest(requestId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = this.getSupabase();
      const { error } = await supabase
        .from('business_ownership_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error cancelling ownership request:', error);
        return {
          success: false,
          error: error.message || 'Failed to cancel ownership request.'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error cancelling ownership request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred.'
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
        .from('business_owners')
        .select('*')
        .eq('business_id', businessId)
        .eq('role', 'owner')
        .maybeSingle();

      if (error) {
        console.error('Error fetching business owner:', {
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
      console.error('Error getting business owner:', {
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
        .from('businesses')
        .select('owner_verified')
        .eq('id', businessId)
        .maybeSingle();

      if (error) {
        console.error('Error checking ownership verification:', {
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
      console.error('Error checking ownership verification:', {
        name: (error as any)?.name,
        message: error instanceof Error ? error.message : String(error),
        raw: error,
      });
      return false;
    }
  }
}

