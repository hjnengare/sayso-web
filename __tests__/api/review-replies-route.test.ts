/**
 * Contract tests for /api/reviews/[id]/replies route
 * 
 * Tests the API contract for business owner review responses:
 * - GET: Fetch replies for a review
 * - POST: Create a reply (owner response)
 * - PUT: Update a reply (owner can edit their reply)
 * - DELETE: Delete a reply (owner can delete their reply)
 * - Authentication and authorization
 * - Validation and error handling
 */

import { GET, POST, PUT, DELETE } from '../../src/app/api/reviews/[id]/replies/route';
import { createTestRequest } from '../../__test-utils__/helpers/create-test-request';
import { getServerSupabase } from '../../src/app/lib/supabase/server';

// Mock Supabase
jest.mock('../../src/app/lib/supabase/server', () => ({
  getServerSupabase: jest.fn(),
}));

// Helper to create mock params
function createMockParams(id: string) {
  return Promise.resolve({ id });
}

describe('/api/reviews/[id]/replies', () => {
  let mockSupabase: any;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;
  let mockEq: jest.Mock;
  let mockOrder: jest.Mock;
  let mockSingle: jest.Mock;
  let mockAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSelect = jest.fn().mockReturnThis();
    mockInsert = jest.fn().mockReturnThis();
    mockUpdate = jest.fn().mockReturnThis();
    mockDelete = jest.fn().mockReturnThis();
    mockEq = jest.fn().mockReturnThis();
    mockOrder = jest.fn().mockReturnThis();
    mockSingle = jest.fn();

    mockFrom = jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      order: mockOrder,
      single: mockSingle,
    }));

    mockAuth = {
      getUser: jest.fn(),
    };

    mockSupabase = {
      from: mockFrom,
      auth: mockAuth,
    };

    (getServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('GET /api/reviews/[id]/replies', () => {
    it('should fetch all replies for a review', async () => {
      const mockReplies = [
        {
          id: 'reply-1',
          review_id: 'review-123',
          user_id: 'owner-123',
          content: 'Thank you for your review!',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          profile: {
            user_id: 'owner-123',
            display_name: 'Business Owner',
            avatar_url: null,
          },
        },
      ];

      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          order: mockOrder.mockResolvedValue({
            data: mockReplies,
            error: null,
          }),
        }),
      });

      const request = createTestRequest('/api/reviews/review-123/replies', { method: 'GET' });
      const params = createMockParams('review-123');
      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.replies).toHaveLength(1);
      expect(data.replies[0].content).toBe('Thank you for your review!');
      expect(data.replies[0].user.name).toBe('Business Owner');
    });

    it('should return empty array when no replies exist', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const request = createTestRequest('/api/reviews/review-123/replies', { method: 'GET' });
      const params = createMockParams('review-123');
      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.replies).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      const request = createTestRequest('/api/reviews/review-123/replies', { method: 'GET' });
      const params = createMockParams('review-123');
      const response = await GET(request, { params });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch replies');
    });
  });

  describe('POST /api/reviews/[id]/replies', () => {
    const mockUser = {
      id: 'owner-123',
      email: 'owner@example.com',
    };

    beforeEach(() => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it('should create a reply when authenticated', async () => {
      // Mock review exists
      mockFrom.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          eq: mockEq.mockReturnValueOnce({
            single: mockSingle.mockResolvedValueOnce({
              data: { id: 'review-123' },
              error: null,
            }),
          }),
        }),
      });

      // Mock reply insertion
      const mockReply = {
        id: 'reply-new',
        review_id: 'review-123',
        user_id: 'owner-123',
        content: 'Thank you for your review!',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        profile: {
          user_id: 'owner-123',
          display_name: 'Business Owner',
          avatar_url: null,
        },
      };

      mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle.mockResolvedValue({
            data: mockReply,
            error: null,
          }),
        }),
      });

      const request = createTestRequest('/api/reviews/review-123/replies', {
        method: 'POST',
        body: JSON.stringify({ content: 'Thank you for your review!' }),
      });
      const params = createMockParams('review-123');
      const response = await POST(request, { params });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.reply.content).toBe('Thank you for your review!');
      expect(data.reply.user_id).toBe('owner-123');
    });

    it('should require authentication', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = createTestRequest('/api/reviews/review-123/replies', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test reply' }),
      });
      const params = createMockParams('review-123');
      const response = await POST(request, { params });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('You must be logged in to reply');
    });

    it('should require reply content', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const request = createTestRequest('/api/reviews/review-123/replies', {
        method: 'POST',
        body: JSON.stringify({ content: '' }),
      });
      const params = createMockParams('review-123');
      const response = await POST(request, { params });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Reply content is required');
    });

    it('should trim whitespace from content', async () => {
      // Mock review exists
      const mockReviewChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'review-123' },
              error: null,
            }),
          }),
        }),
      };

      const mockReply = {
        id: 'reply-new',
        review_id: 'review-123',
        user_id: 'owner-123',
        content: 'Trimmed content',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        profile: {
          user_id: 'owner-123',
          display_name: 'Business Owner',
        },
      };

      const mockInsertChain = {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockReply,
            error: null,
          }),
        }),
      };

      mockFrom
        .mockReturnValueOnce(mockReviewChain) // For review check
        .mockReturnValueOnce({
          insert: jest.fn().mockReturnValue(mockInsertChain),
        }); // For reply insert

      const request = createTestRequest('/api/reviews/review-123/replies', {
        method: 'POST',
        body: JSON.stringify({ content: '   Trimmed content   ' }),
      });
      const params = createMockParams('review-123');
      const response = await POST(request, { params });

      expect(response.status).toBe(201);
      // Verify insert was called with trimmed content
      const insertCall = mockFrom.mock.results[1].value.insert;
      expect(insertCall).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Trimmed content',
        })
      );
    });

    it('should return 404 if review does not exist', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          eq: mockEq.mockReturnValueOnce({
            single: mockSingle.mockResolvedValueOnce({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      const request = createTestRequest('/api/reviews/review-123/replies', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test reply' }),
      });
      const params = createMockParams('review-123');
      const response = await POST(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Review not found');
    });
  });

  describe('PUT /api/reviews/[id]/replies', () => {
    const mockUser = {
      id: 'owner-123',
      email: 'owner@example.com',
    };

    beforeEach(() => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it('should update reply when user owns it', async () => {
      // Mock existing reply check
      mockFrom.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          eq: mockEq.mockReturnValueOnce({
            single: mockSingle.mockResolvedValueOnce({
              data: {
                id: 'reply-123',
                user_id: 'owner-123',
                review_id: 'review-123',
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock update
      const updatedReply = {
        id: 'reply-123',
        review_id: 'review-123',
        user_id: 'owner-123',
        content: 'Updated reply',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        profile: {
          user_id: 'owner-123',
          display_name: 'Business Owner',
        },
      };

      mockUpdate.mockReturnValue({
        eq: mockEq.mockReturnValue({
          select: mockSelect.mockReturnValue({
            single: mockSingle.mockResolvedValue({
              data: updatedReply,
              error: null,
            }),
          }),
        }),
      });

      const request = createTestRequest('/api/reviews/review-123/replies', {
        method: 'PUT',
        body: JSON.stringify({
          replyId: 'reply-123',
          content: 'Updated reply',
        }),
      });
      const params = createMockParams('review-123');
      const response = await PUT(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.reply.content).toBe('Updated reply');
      expect(data.reply.updated_at).toBeDefined();
    });

    it('should return 403 if user does not own the reply', async () => {
      // Mock existing reply owned by different user
      mockFrom.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          eq: mockEq.mockReturnValueOnce({
            single: mockSingle.mockResolvedValueOnce({
              data: {
                id: 'reply-123',
                user_id: 'other-user-456',
                review_id: 'review-123',
              },
              error: null,
            }),
          }),
        }),
      });

      const request = createTestRequest('/api/reviews/review-123/replies', {
        method: 'PUT',
        body: JSON.stringify({
          replyId: 'reply-123',
          content: 'Updated reply',
        }),
      });
      const params = createMockParams('review-123');
      const response = await PUT(request, { params });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('You can only edit your own replies');
    });

    it('should require authentication', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = createTestRequest('/api/reviews/review-123/replies', {
        method: 'PUT',
        body: JSON.stringify({
          replyId: 'reply-123',
          content: 'Updated reply',
        }),
      });
      const params = createMockParams('review-123');
      const response = await PUT(request, { params });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('You must be logged in to edit replies');
    });

    it('should require reply content', async () => {
      const request = createTestRequest('/api/reviews/review-123/replies', {
        method: 'PUT',
        body: JSON.stringify({
          replyId: 'reply-123',
          content: '',
        }),
      });
      const params = createMockParams('review-123');
      const response = await PUT(request, { params });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Reply content is required');
    });

    it('should return 404 if reply does not exist', async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      const request = createTestRequest('/api/reviews/review-123/replies', {
        method: 'PUT',
        body: JSON.stringify({
          replyId: 'reply-123',
          content: 'Updated reply',
        }),
      });
      const params = createMockParams('review-123');
      const response = await PUT(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Reply not found');
    });
  });

  describe('DELETE /api/reviews/[id]/replies', () => {
    const mockUser = {
      id: 'owner-123',
      email: 'owner@example.com',
    };

    beforeEach(() => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it('should delete reply when user owns it', async () => {
      // Mock existing reply check
      const mockCheckChain = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'reply-123',
                user_id: 'owner-123',
                review_id: 'review-123',
              },
              error: null,
            }),
          }),
        }),
      };

      // Mock delete
      const mockDeleteChain = {
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      };

      mockFrom
        .mockReturnValueOnce(mockCheckChain) // For reply check
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnValue(mockDeleteChain),
        }); // For reply delete

      const request = createTestRequest('/api/reviews/review-123/replies', {
        method: 'DELETE',
        body: JSON.stringify({ replyId: 'reply-123' }),
      });
      const params = createMockParams('review-123');
      const response = await DELETE(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 403 if user does not own the reply', async () => {
      // Mock existing reply owned by different user
      mockFrom.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          eq: mockEq.mockReturnValueOnce({
            single: mockSingle.mockResolvedValueOnce({
              data: {
                id: 'reply-123',
                user_id: 'other-user-456',
                review_id: 'review-123',
              },
              error: null,
            }),
          }),
        }),
      });

      const request = createTestRequest('/api/reviews/review-123/replies', {
        method: 'DELETE',
        body: JSON.stringify({ replyId: 'reply-123' }),
      });
      const params = createMockParams('review-123');
      const response = await DELETE(request, { params });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('You can only delete your own replies');
    });

    it('should require authentication', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = createTestRequest('/api/reviews/review-123/replies', {
        method: 'DELETE',
        body: JSON.stringify({ replyId: 'reply-123' }),
      });
      const params = createMockParams('review-123');
      const response = await DELETE(request, { params });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('You must be logged in to delete replies');
    });

    it('should return 404 if reply does not exist', async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });

      const request = createTestRequest('/api/reviews/review-123/replies', {
        method: 'DELETE',
        body: JSON.stringify({ replyId: 'reply-123' }),
      });
      const params = createMockParams('review-123');
      const response = await DELETE(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Reply not found');
    });
  });
});

