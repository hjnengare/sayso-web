/**
 * Backend API tests for /api/business/claim route
 * 
 * Tests:
 * - Authentication required
 * - Business ID validation
 * - Role validation
 * - Duplicate ownership check
 * - Duplicate pending request check
 * - Successful claim submission
 * - Email notification
 * - Error handling
 */

import { POST } from '../../src/app/api/business/claim/route';
import { createTestRequest } from '../../__test-utils__/helpers/create-test-request';
import { getServerSupabase } from '../../src/app/lib/supabase/server';
import { EmailService } from '../../src/app/lib/services/emailService';

// Mock Supabase
jest.mock('../../src/app/lib/supabase/server', () => ({
  getServerSupabase: jest.fn(),
}));

// Mock EmailService
jest.mock('../../src/app/lib/services/emailService', () => ({
  EmailService: {
    sendClaimReceivedEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('POST /api/business/claim', () => {
  let mockSupabase: any;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSelect = jest.fn().mockReturnThis();
    mockInsert = jest.fn().mockReturnThis();

    const mockQueryChain = {
      select: mockSelect,
      insert: mockInsert,
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      in: jest.fn().mockReturnThis(),
    };

    mockFrom = jest.fn().mockReturnValue(mockQueryChain);

    mockAuth = {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      }),
    };

    mockSupabase = {
      auth: mockAuth,
      from: mockFrom,
    };

    (getServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'owner',
          email: 'test@example.com',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if auth error occurs', async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'owner',
          email: 'test@example.com',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 if business_id is missing', async () => {
      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          role: 'owner',
          email: 'test@example.com',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('business_id is required');
    });

    it('should return 400 if role is missing', async () => {
      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          email: 'test@example.com',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('role must be "owner" or "manager"');
    });

    it('should return 400 if role is invalid', async () => {
      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'invalid-role',
          email: 'test@example.com',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('role must be "owner" or "manager"');
    });

    it('should accept owner role', async () => {
      mockSelect.mockResolvedValueOnce({ data: null, error: null }); // existingOwner check
      mockSelect.mockResolvedValueOnce({ data: null, error: null }); // existingRequest check
      mockInsert.mockResolvedValue({
        data: {
          id: 'request-123',
          business_id: 'business-123',
          user_id: 'user-123',
          status: 'pending',
        },
        error: null,
      });
      mockSelect.mockResolvedValueOnce({
        data: {
          name: 'Test Business',
          category: 'Restaurant',
          location: 'Cape Town',
        },
        error: null,
      });
      mockSelect.mockResolvedValueOnce({
        data: {
          display_name: 'Test User',
          username: 'testuser',
        },
        error: null,
      });

      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'owner',
          email: 'test@example.com',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should accept manager role', async () => {
      mockSelect.mockResolvedValueOnce({ data: null, error: null }); // existingOwner check
      mockSelect.mockResolvedValueOnce({ data: null, error: null }); // existingRequest check
      mockInsert.mockResolvedValue({
        data: {
          id: 'request-123',
          business_id: 'business-123',
          user_id: 'user-123',
          status: 'pending',
        },
        error: null,
      });
      mockSelect.mockResolvedValueOnce({
        data: {
          name: 'Test Business',
          category: 'Restaurant',
          location: 'Cape Town',
        },
        error: null,
      });
      mockSelect.mockResolvedValueOnce({
        data: {
          display_name: 'Test User',
          username: 'testuser',
        },
        error: null,
      });

      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'manager',
          email: 'test@example.com',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });

  describe('Duplicate Checks', () => {
    it('should return 400 if user already owns the business', async () => {
      mockSelect.mockResolvedValueOnce({
        data: { id: 'owner-123' },
        error: null,
      });

      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'owner',
          email: 'test@example.com',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('You already own this business');
    });

    it('should return 400 if user has pending request', async () => {
      mockSelect.mockResolvedValueOnce({ data: null, error: null }); // existingOwner check
      mockSelect.mockResolvedValueOnce({
        data: { id: 'request-123' },
        error: null,
      });

      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'owner',
          email: 'test@example.com',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('You already have a pending claim request for this business');
    });
  });

  describe('Successful Claim Submission', () => {
    beforeEach(() => {
      mockSelect.mockResolvedValueOnce({ data: null, error: null }); // existingOwner check
      mockSelect.mockResolvedValueOnce({ data: null, error: null }); // existingRequest check
      mockInsert.mockResolvedValue({
        data: {
          id: 'request-123',
          business_id: 'business-123',
          user_id: 'user-123',
          status: 'pending',
          verification_method: 'manual',
          verification_data: {
            role: 'owner',
            email: 'test@example.com',
          },
        },
        error: null,
      });
      mockSelect.mockResolvedValueOnce({
        data: {
          name: 'Test Business',
          category: 'Restaurant',
          location: 'Cape Town',
        },
        error: null,
      });
      mockSelect.mockResolvedValueOnce({
        data: {
          display_name: 'Test User',
          username: 'testuser',
        },
        error: null,
      });
    });

    it('should create ownership request successfully', async () => {
      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'owner',
          email: 'test@example.com',
          phone: '+27123456789',
          note: 'I am the owner',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.request.id).toBe('request-123');
      expect(data.request.business_id).toBe('business-123');
      expect(data.request.status).toBe('pending');
    });

    it('should include phone in verification data if provided', async () => {
      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'owner',
          email: 'test@example.com',
          phone: '+27123456789',
        }),
      });

      await POST(req);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          verification_data: expect.objectContaining({
            phone: '+27123456789',
          }),
        })
      );
    });

    it('should include note in verification data if provided', async () => {
      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'owner',
          email: 'test@example.com',
          note: 'Additional information',
        }),
      });

      await POST(req);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          verification_data: expect.objectContaining({
            notes: 'Additional information',
          }),
        })
      );
    });

    it('should send email notification', async () => {
      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'owner',
          email: 'test@example.com',
        }),
      });

      await POST(req);

      // Email service is called asynchronously, wait a bit for it to be called
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(EmailService.sendClaimReceivedEmail).toHaveBeenCalledWith({
        recipientEmail: 'test@example.com',
        recipientName: 'Test User',
        businessName: 'Test Business',
        businessCategory: 'Restaurant',
        businessLocation: 'Cape Town',
      });
    });

    it('should not fail if email service fails', async () => {
      (EmailService.sendClaimReceivedEmail as jest.Mock).mockRejectedValueOnce(
        new Error('Email service error')
      );

      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'owner',
          email: 'test@example.com',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      // Should still succeed even if email fails
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database insert fails', async () => {
      mockSelect.mockResolvedValueOnce({ data: null, error: null }); // existingOwner check
      mockSelect.mockResolvedValueOnce({ data: null, error: null }); // existingRequest check
      mockInsert.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'owner',
          email: 'test@example.com',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create claim request');
    });

    it('should return 500 on unexpected errors', async () => {
      (getServerSupabase as jest.Mock).mockRejectedValueOnce(
        new Error('Unexpected error')
      );

      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'owner',
          email: 'test@example.com',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Optional Fields', () => {
    beforeEach(() => {
      mockSelect.mockResolvedValueOnce({ data: null, error: null }); // existingOwner check
      mockSelect.mockResolvedValueOnce({ data: null, error: null }); // existingRequest check
      mockInsert.mockResolvedValue({
        data: {
          id: 'request-123',
          business_id: 'business-123',
          user_id: 'user-123',
          status: 'pending',
        },
        error: null,
      });
      mockSelect.mockResolvedValueOnce({
        data: {
          name: 'Test Business',
          category: 'Restaurant',
          location: 'Cape Town',
        },
        error: null,
      });
      mockSelect.mockResolvedValueOnce({
        data: {
          display_name: 'Test User',
          username: 'testuser',
        },
        error: null,
      });
    });

    it('should handle missing phone', async () => {
      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'owner',
          email: 'test@example.com',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should handle missing note', async () => {
      const req = createTestRequest('/api/business/claim', {
        method: 'POST',
        body: JSON.stringify({
          business_id: 'business-123',
          role: 'owner',
          email: 'test@example.com',
        }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });
});

import { waitFor } from '@testing-library/react';

