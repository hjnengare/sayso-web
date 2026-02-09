"use client";

"use client";

import { supabase } from '../supabase';
import type { Business, BusinessWithStats, BusinessSearchFilters, BusinessStats } from '../types/database';

export class BusinessService {
  static async getAllBusinesses(filters?: BusinessSearchFilters): Promise<BusinessWithStats[]> {
    try {
      let query = supabase.from('businesses').select(`
        *,
        business_stats (
          total_reviews,
          average_rating,
          rating_distribution,
          percentiles
        )
      `);

      if (filters) {
        if (filters.category) {
          query = query.eq('category', filters.category);
        }
        if (filters.location) {
          query = query.ilike('location', `%${filters.location}%`);
        }
        if (filters.price_range && filters.price_range.length > 0) {
          query = query.in('price_range', filters.price_range);
        }
        if (filters.verified_only) {
          query = query.eq('verified', true);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our expected format
      return (data || []).filter((business: any) => business?.is_system !== true).map(business => ({
        ...business,
        stats: business.business_stats?.[0] || undefined
      }));
    } catch (error) {
      console.error('Error fetching businesses:', error);
      throw error;
    }
  }

  static async getBusinessById(id: string): Promise<BusinessWithStats | null> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          *,
          business_stats (
            total_reviews,
            average_rating,
            rating_distribution,
            percentiles
          ),
          reviews (
            id,
            rating,
            title,
            content,
            tags,
            helpful_count,
            created_at,
            profile:profiles!reviews_user_id_fkey (
              user_id,
              display_name,
              avatar_url
            ),
            review_images (
              id,
              image_url,
              alt_text
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Business not found
        }
        throw error;
      }

      return {
        ...data,
        stats: data.business_stats?.[0] || undefined,
        recent_reviews: data.reviews || []
      };
    } catch (error) {
      console.error('Error fetching business:', error);
      throw error;
    }
  }

  static async getBusinessBySlug(slug: string): Promise<BusinessWithStats | null> {
    // Convert slug back to approximate business name for searching
    const searchName = slug.replace(/[^a-z0-9]/g, ' ').trim();

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          *,
          business_stats (
            total_reviews,
            average_rating,
            rating_distribution,
            percentiles
          ),
          reviews (
            id,
            rating,
            title,
            content,
            tags,
            helpful_count,
            created_at,
            profile:profiles!reviews_user_id_fkey (
              user_id,
              display_name,
              avatar_url
            ),
            review_images (
              id,
              image_url,
              alt_text
            )
          )
        `)
        .ilike('name', `%${searchName}%`)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Business not found
        }
        throw error;
      }

      return {
        ...data,
        stats: data.business_stats?.[0] || undefined,
        recent_reviews: data.reviews || []
      };
    } catch (error) {
      console.error('Error fetching business by slug:', error);
      return null;
    }
  }

  static async getTrendingBusinesses(limit: number = 6): Promise<BusinessWithStats[]> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          *,
          business_stats (
            total_reviews,
            average_rating,
            rating_distribution,
            percentiles
          )
        `)
        .not('business_stats.average_rating', 'is', null)
        .order('business_stats.average_rating', { ascending: false })
        .order('business_stats.total_reviews', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).filter((business: any) => business?.is_system !== true).map(business => ({
        ...business,
        stats: business.business_stats?.[0] || undefined
      }));
    } catch (error) {
      console.error('Error fetching trending businesses:', error);
      return [];
    }
  }

  static async getNearbyBusinesses(latitude?: number, longitude?: number, radiusKm: number = 10, limit: number = 6): Promise<BusinessWithStats[]> {
    // For now, just return all businesses since we don't have geolocation implemented yet
    // In a real implementation, you'd use PostGIS or similar for geospatial queries
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          *,
          business_stats (
            total_reviews,
            average_rating,
            rating_distribution,
            percentiles
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).filter((business: any) => business?.is_system !== true).map(business => ({
        ...business,
        stats: business.business_stats?.[0] || undefined
      }));
    } catch (error) {
      console.error('Error fetching nearby businesses:', error);
      return [];
    }
  }

  static async searchBusinesses(query: string, filters?: BusinessSearchFilters): Promise<BusinessWithStats[]> {
    try {
      let supabaseQuery = supabase
        .from('businesses')
        .select(`
          *,
          business_stats (
            total_reviews,
            average_rating,
            rating_distribution,
            percentiles
          )
        `)
        .or(`name.ilike.%${query}%, description.ilike.%${query}%, category.ilike.%${query}%`);

      if (filters) {
        if (filters.category) {
          supabaseQuery = supabaseQuery.eq('category', filters.category);
        }
        if (filters.location) {
          supabaseQuery = supabaseQuery.ilike('location', `%${filters.location}%`);
        }
        if (filters.price_range && filters.price_range.length > 0) {
          supabaseQuery = supabaseQuery.in('price_range', filters.price_range);
        }
        if (filters.verified_only) {
          supabaseQuery = supabaseQuery.eq('verified', true);
        }
        if (filters.min_rating) {
          supabaseQuery = supabaseQuery.gte('business_stats.average_rating', filters.min_rating);
        }
      }

      const { data, error } = await supabaseQuery.order('business_stats.average_rating', { ascending: false });

      if (error) throw error;

      return (data || []).filter((business: any) => business?.is_system !== true).map(business => ({
        ...business,
        stats: business.business_stats?.[0] || undefined
      }));
    } catch (error) {
      console.error('Error searching businesses:', error);
      return [];
    }
  }
}
