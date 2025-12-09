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
   */
  static async isBusinessOwner(userId: string, businessId: string): Promise<boolean> {
    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from('business_owners')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking business ownership:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          error: error
        });
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking business ownership (catch):', {
        message: error instanceof Error ? error.message : String(error),
        error: error
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
      const { data: existingRequest } = await supabase
        .from('business_ownership_requests')
        .select('*')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (existingRequest) {
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
    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from('business_ownership_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) {
        console.error('Error fetching ownership request:', error);
        return null;
      }

      return data as BusinessOwnershipRequest;
    } catch (error) {
      console.error('Error getting ownership request:', error);
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
    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from('business_owners')
        .select('*')
        .eq('business_id', businessId)
        .eq('role', 'owner')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No owner found
        }
        console.error('Error fetching business owner:', error);
        return null;
      }

      return data as BusinessOwner;
    } catch (error) {
      console.error('Error getting business owner:', error);
      return null;
    }
  }

  /**
   * Check if business ownership is verified
   */
  static async isOwnershipVerified(businessId: string): Promise<boolean> {
    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from('businesses')
        .select('owner_verified')
        .eq('id', businessId)
        .single();

      if (error) {
        console.error('Error checking ownership verification:', error);
        return false;
      }

      return data?.owner_verified || false;
    } catch (error) {
      console.error('Error checking ownership verification:', error);
      return false;
    }
  }
}

