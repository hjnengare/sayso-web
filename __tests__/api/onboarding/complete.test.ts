/**
 * Unit tests for POST /api/onboarding/complete
 */

import { POST } from '@/app/api/onboarding/complete/route';
import { getServerSupabase } from '@/app/lib/supabase/server';

jest.mock('@/app/lib/supabase/server');

describe('POST /api/onboarding/complete', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('should mark onboarding as complete', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              onboarding_step: 'complete',
              interests_count: 3,
              subcategories_count: 5,
              dealbreakers_count: 2,
            },
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const request = new Request('http://localhost/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    // Should update onboarding_complete to true
    expect(mockSupabase.from('profiles').update).toHaveBeenCalledWith({
      onboarding_complete: true,
      updated_at: expect.any(String),
    });
  });

  it('should return 400 if onboarding_step is not complete', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              onboarding_step: 'deal-breakers',
              interests_count: 3,
              subcategories_count: 5,
              dealbreakers_count: 2,
            },
            error: null,
          }),
        }),
      }),
    });

    const request = new Request('http://localhost/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cannot complete onboarding: all steps must be finished first');
    expect(data.current_step).toBe('deal-breakers');
  });

  it('should return 400 if user has no interests', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              onboarding_step: 'complete',
              interests_count: 0,
              subcategories_count: 0,
              dealbreakers_count: 0,
            },
            error: null,
          }),
        }),
      }),
    });

    const request = new Request('http://localhost/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cannot complete onboarding: interests are required');
  });

  it('should return 404 if profile not found', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      }),
    });

    const request = new Request('http://localhost/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Profile not found');
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new Request('http://localhost/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});

