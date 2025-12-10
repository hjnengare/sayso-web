/**
 * Unit tests for /api/user/onboarding route handler
 * Tests atomic completion, fallback logic, and error handling
 */

import { POST, GET } from '@/app/api/user/onboarding/route';
import { createTestRequest } from '@test-utils/helpers/create-test-request';
import { createMockSupabaseClient } from '@test-utils/mocks/supabase';
import { createUser } from '@test-utils/factories/userFactory';

// Mock getServerSupabase
jest.mock('@/app/lib/supabase/server', () => ({
  getServerSupabase: jest.fn(),
}));

describe('/api/user/onboarding', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    const { getServerSupabase } = require('@/app/lib/supabase/server');
    getServerSupabase.mockResolvedValue(mockSupabase);
  });

  describe('POST /api/user/onboarding - Complete Step', () => {
    it('should complete onboarding atomically with all data', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      // Mock successful atomic RPC call
      mockSupabase.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock profile update
      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const requestBody = {
        step: 'complete',
        interests: ['food-drink', 'beauty-wellness'],
        subcategories: [
          { subcategory_id: 'sushi', interest_id: 'food-drink' },
          { subcategory_id: 'spa', interest_id: 'beauty-wellness' },
        ],
        dealbreakers: ['trustworthiness', 'punctuality'],
      };

      const request = createTestRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_onboarding_atomic', {
        p_user_id: user.id,
        p_interest_ids: requestBody.interests,
        p_subcategory_data: requestBody.subcategories,
        p_dealbreaker_ids: requestBody.dealbreakers,
      });
    });

    it('should fallback to individual RPCs when atomic function fails', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      // Mock atomic function failure
      mockSupabase.rpc = jest.fn().mockImplementation((functionName: string) => {
        if (functionName === 'complete_onboarding_atomic') {
          return Promise.resolve({
            data: null,
            error: { message: 'Function not found' },
          });
        }
        // Mock individual RPCs as successful
        return Promise.resolve({
          data: null,
          error: null,
        });
      });

      // Mock profile update
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        update: mockUpdate,
      });

      const requestBody = {
        step: 'complete',
        interests: ['food-drink'],
        subcategories: [{ subcategory_id: 'sushi', interest_id: 'food-drink' }],
        dealbreakers: ['trustworthiness'],
      };

      const request = createTestRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should call individual RPCs
      expect(mockSupabase.rpc).toHaveBeenCalledWith('replace_user_interests', {
        p_user_id: user.id,
        p_interest_ids: requestBody.interests,
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('replace_user_subcategories', {
        p_user_id: user.id,
        p_subcategory_data: requestBody.subcategories,
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('replace_user_dealbreakers', {
        p_user_id: user.id,
        p_dealbreaker_ids: requestBody.dealbreakers,
      });

      // Should update profile
      expect(mockUpdate).toHaveBeenCalledWith({
        onboarding_step: 'complete',
        onboarding_complete: true,
        updated_at: expect.any(String),
      });
    });

    it('should require all data arrays for completion', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const requestBody = {
        step: 'complete',
        interests: ['food-drink'],
        // Missing subcategories and dealbreakers
      };

      const request = createTestRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('All data arrays are required');
    });

    it('should require authentication', async () => {
      mockSupabase.setMockUser(null);

      const requestBody = {
        step: 'complete',
        interests: ['food-drink'],
        subcategories: [{ subcategory_id: 'sushi', interest_id: 'food-drink' }],
        dealbreakers: ['trustworthiness'],
      };

      const request = createTestRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should handle errors in fallback RPC calls', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      // Mock atomic function failure
      mockSupabase.rpc = jest.fn().mockImplementation((functionName: string) => {
        if (functionName === 'complete_onboarding_atomic') {
          return Promise.resolve({
            data: null,
            error: { message: 'Function not found' },
          });
        }
        // Mock interests RPC failure
        if (functionName === 'replace_user_interests') {
          return Promise.resolve({
            data: null,
            error: { message: 'Database error' },
          });
        }
        return Promise.resolve({
          data: null,
          error: null,
        });
      });

      const requestBody = {
        step: 'complete',
        interests: ['food-drink'],
        subcategories: [{ subcategory_id: 'sushi', interest_id: 'food-drink' }],
        dealbreakers: ['trustworthiness'],
      };

      const request = createTestRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to save onboarding progress');
    });

    it('should handle profile update failure in fallback', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      // Mock atomic function failure
      mockSupabase.rpc = jest.fn().mockImplementation((functionName: string) => {
        if (functionName === 'complete_onboarding_atomic') {
          return Promise.resolve({
            data: null,
            error: { message: 'Function not found' },
          });
        }
        return Promise.resolve({
          data: null,
          error: null,
        });
      });

      // Mock profile update failure
      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Profile update failed' },
          }),
        }),
      });

      const requestBody = {
        step: 'complete',
        interests: ['food-drink'],
        subcategories: [{ subcategory_id: 'sushi', interest_id: 'food-drink' }],
        dealbreakers: ['trustworthiness'],
      };

      const request = createTestRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to save onboarding progress');
    });
  });

  describe('POST /api/user/onboarding - Individual Steps', () => {
    it('should save interests for individual step', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      mockSupabase.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        update: mockUpdate,
      });

      const requestBody = {
        step: 'interests',
        interests: ['food-drink', 'beauty-wellness'],
      };

      const request = createTestRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('replace_user_interests', {
        p_user_id: user.id,
        p_interest_ids: requestBody.interests,
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        onboarding_step: 'interests',
        onboarding_complete: false,
        updated_at: expect.any(String),
      });
    });

    it('should save subcategories for individual step', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      mockSupabase.rpc = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        update: mockUpdate,
      });

      const requestBody = {
        step: 'subcategories',
        subcategories: [
          { id: 'sushi', interest_id: 'food-drink' },
          { id: 'spa', interest_id: 'beauty-wellness' },
        ],
      };

      const request = createTestRequest('http://localhost:3000/api/user/onboarding', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('replace_user_subcategories', {
        p_user_id: user.id,
        p_subcategory_data: [
          { subcategory_id: 'sushi', interest_id: 'food-drink' },
          { subcategory_id: 'spa', interest_id: 'beauty-wellness' },
        ],
      });
    });
  });

  describe('GET /api/user/onboarding', () => {
    it('should retrieve user onboarding data', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      const mockInterests = [
        { user_id: user.id, interest_id: 'food-drink' },
        { user_id: user.id, interest_id: 'beauty-wellness' },
      ];

      const mockSubcategories = [
        { user_id: user.id, subcategory_id: 'sushi', interest_id: 'food-drink' },
      ];

      const mockDealbreakers = [
        { user_id: user.id, dealbreaker_id: 'trustworthiness' },
      ];

      mockSupabase.setMockData('user_interests', mockInterests);
      mockSupabase.setMockData('user_subcategories', mockSubcategories);
      mockSupabase.setMockData('user_dealbreakers', mockDealbreakers);

      const request = createTestRequest('http://localhost:3000/api/user/onboarding');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.interests).toEqual(['food-drink', 'beauty-wellness']);
      expect(data.subcategories).toEqual(mockSubcategories);
      expect(data.dealbreakers).toEqual(['trustworthiness']);
    });

    it('should require authentication for GET', async () => {
      mockSupabase.setMockUser(null);

      const request = createTestRequest('http://localhost:3000/api/user/onboarding');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should handle empty onboarding data', async () => {
      const user = createUser();
      mockSupabase.setMockUser(user);

      mockSupabase.setMockData('user_interests', []);
      mockSupabase.setMockData('user_subcategories', []);
      mockSupabase.setMockData('user_dealbreakers', []);

      const request = createTestRequest('http://localhost:3000/api/user/onboarding');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.interests).toEqual([]);
      expect(data.subcategories).toEqual([]);
      expect(data.dealbreakers).toEqual([]);
    });
  });
});

