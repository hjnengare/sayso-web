/**
 * Unit tests for /api/user/profile route handler
 * 
 * Tests:
 * - GET: Fetch user profile
 * - GET: Unauthorized access
 * - GET: Profile not found
 * - PUT: Update profile
 * - PUT: Validation errors
 * - PUT: Unauthorized access
 */

import { GET, PUT } from '@/app/api/user/profile/route';
import { createTestRequest } from '@/__test-utils__/helpers/create-test-request';
import { getServerSupabase } from '@/app/lib/supabase/server';
import {
  getCurrentUserId,
  getUserProfile,
  updateUserProfile,
} from '@/app/lib/services/userService';

// Mock dependencies
jest.mock('@/app/lib/supabase/server');
jest.mock('@/app/lib/services/userService');
jest.mock('@/app/lib/utils/validation');

const mockGetServerSupabase = getServerSupabase as jest.MockedFunction<typeof getServerSupabase>;
const mockGetCurrentUserId = getCurrentUserId as jest.MockedFunction<typeof getCurrentUserId>;
const mockGetUserProfile = getUserProfile as jest.MockedFunction<typeof getUserProfile>;
const mockUpdateUserProfile = updateUserProfile as jest.MockedFunction<typeof updateUserProfile>;

// Mock validation
const mockValidateProfileUpdate = require('@/app/lib/utils/validation').validateProfileUpdate as jest.MockedFunction<any>;

describe('/api/user/profile', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSupabase.mockResolvedValue(mockSupabase);
  });

  describe('GET /api/user/profile', () => {
    it('should return user profile successfully', async () => {
      const mockUserId = 'user-123';
      const mockProfile = {
        user_id: mockUserId,
        username: 'testuser',
        display_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        location: 'Cape Town',
        website_url: 'https://example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockGetCurrentUserId.mockResolvedValue(mockUserId);
      mockGetUserProfile.mockResolvedValue(mockProfile);

      const request = createTestRequest('/api/user/profile', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        data: mockProfile,
        error: null,
      });
      expect(mockGetCurrentUserId).toHaveBeenCalledWith(mockSupabase);
      expect(mockGetUserProfile).toHaveBeenCalledWith(mockSupabase, mockUserId);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);

      const request = createTestRequest('/api/user/profile', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        data: null,
        error: {
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
        },
      });
      expect(mockGetUserProfile).not.toHaveBeenCalled();
    });

    it('should return 404 when profile is not found', async () => {
      const mockUserId = 'user-123';
      mockGetCurrentUserId.mockResolvedValue(mockUserId);
      mockGetUserProfile.mockResolvedValue(null);

      const request = createTestRequest('/api/user/profile', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        data: null,
        error: {
          message: 'Profile not found',
          code: 'NOT_FOUND',
          details: `No profile record found for user ${mockUserId}`,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      const mockUserId = 'user-123';
      mockGetCurrentUserId.mockResolvedValue(mockUserId);
      mockGetUserProfile.mockRejectedValue(new Error('Database error'));

      const request = createTestRequest('/api/user/profile', { method: 'GET' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        data: null,
        error: {
          message: 'Database error',
          code: 'INTERNAL_ERROR',
          details: expect.any(String),
        },
      });
    });
  });

  describe('PUT /api/user/profile', () => {
    const mockUserId = 'user-123';
    const mockUpdatePayload = {
      username: 'newusername',
      display_name: 'New Display Name',
      bio: 'New bio',
      location: 'New Location',
    };

    it('should update profile successfully', async () => {
      const mockUpdatedProfile = {
        user_id: mockUserId,
        username: 'newusername',
        display_name: 'New Display Name',
        avatar_url: null,
        bio: 'New bio',
        location: 'New Location',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      };

      mockGetCurrentUserId.mockResolvedValue(mockUserId);
      mockValidateProfileUpdate.mockReturnValue({ valid: true, errors: [] });
      mockUpdateUserProfile.mockResolvedValue(mockUpdatedProfile);

      const request = createTestRequest('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(mockUpdatePayload),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        data: mockUpdatedProfile,
        error: null,
      });
      expect(mockValidateProfileUpdate).toHaveBeenCalledWith(mockUpdatePayload);
      expect(mockUpdateUserProfile).toHaveBeenCalledWith(mockSupabase, mockUserId, mockUpdatePayload);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);

      const request = createTestRequest('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(mockUpdatePayload),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        data: null,
        error: {
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
        },
      });
      expect(mockUpdateUserProfile).not.toHaveBeenCalled();
    });

    it('should return 400 when validation fails', async () => {
      mockGetCurrentUserId.mockResolvedValue(mockUserId);
      mockValidateProfileUpdate.mockReturnValue({
        valid: false,
        errors: ['Username is required', 'Display name is too long'],
      });

      const request = createTestRequest('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(mockUpdatePayload),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        data: null,
        error: {
          message: 'Username is required, Display name is too long',
          code: 'VALIDATION_ERROR',
        },
      });
      expect(mockUpdateUserProfile).not.toHaveBeenCalled();
    });

    it('should return 500 when update fails', async () => {
      mockGetCurrentUserId.mockResolvedValue(mockUserId);
      mockValidateProfileUpdate.mockReturnValue({ valid: true, errors: [] });
      mockUpdateUserProfile.mockResolvedValue(null);

      const request = createTestRequest('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(mockUpdatePayload),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        data: null,
        error: {
          message: 'Failed to update profile',
          code: 'UPDATE_FAILED',
        },
      });
    });

    it('should handle errors gracefully', async () => {
      mockGetCurrentUserId.mockResolvedValue(mockUserId);
      mockValidateProfileUpdate.mockReturnValue({ valid: true, errors: [] });
      mockUpdateUserProfile.mockRejectedValue(new Error('Database error'));

      const request = createTestRequest('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(mockUpdatePayload),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        data: null,
        error: {
          message: 'Database error',
          code: 'INTERNAL_ERROR',
        },
      });
    });

    it('should handle partial profile updates', async () => {
      const partialPayload = {
        bio: 'Updated bio only',
      };
      const mockUpdatedProfile = {
        user_id: mockUserId,
        username: 'testuser',
        display_name: 'Test User',
        bio: 'Updated bio only',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      };

      mockGetCurrentUserId.mockResolvedValue(mockUserId);
      mockValidateProfileUpdate.mockReturnValue({ valid: true, errors: [] });
      mockUpdateUserProfile.mockResolvedValue(mockUpdatedProfile);

      const request = createTestRequest('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(partialPayload),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.bio).toBe('Updated bio only');
      expect(mockUpdateUserProfile).toHaveBeenCalledWith(mockSupabase, mockUserId, partialPayload);
    });
  });
});

