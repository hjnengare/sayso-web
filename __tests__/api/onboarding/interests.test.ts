/**
 * Unit tests for POST /api/onboarding/interests
 */

import { POST } from '@/app/api/onboarding/interests/route';
import { getServerSupabase } from '@/app/lib/supabase/server';

jest.mock('@/app/lib/supabase/server');

describe('POST /api/onboarding/interests', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
    },
    rpc: jest.fn(),
    from: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSupabase as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('should save interests and advance onboarding_step to subcategories', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockSupabase.rpc.mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const request = new Request('http://localhost/api/onboarding/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interests: ['food-drink', 'beauty-wellness'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.interestsCount).toBe(2);
    expect(data.onboarding_step).toBe('subcategories');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('replace_user_interests', {
      p_user_id: user.id,
      p_interest_ids: ['food-drink', 'beauty-wellness'],
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new Request('http://localhost/api/onboarding/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests: ['food-drink'] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if interests array is empty', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const request = new Request('http://localhost/api/onboarding/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Interests array is required');
  });

  it('should return 400 if interests is not provided', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const request = new Request('http://localhost/api/onboarding/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Interests array is required');
  });

  it('should handle RPC function failure and use fallback', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockSupabase.rpc.mockResolvedValue({
      error: { message: 'function does not exist' },
    });
    mockSupabase.from.mockReturnValue({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const request = new Request('http://localhost/api/onboarding/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interests: ['food-drink'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    // Should use fallback insert method
    expect(mockSupabase.from).toHaveBeenCalledWith('user_interests');
  });
});

