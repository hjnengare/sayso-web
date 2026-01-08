/**
 * Unit tests for POST /api/onboarding/deal-breakers
 */

import { POST } from '@/app/api/onboarding/deal-breakers/route';
import { getServerSupabase } from '@/app/lib/supabase/server';

jest.mock('@/app/lib/supabase/server');

describe('POST /api/onboarding/deal-breakers', () => {
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

  it('should save dealbreakers and advance onboarding_step to complete', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockSupabase.rpc.mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const request = new Request('http://localhost/api/onboarding/deal-breakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealbreakers: ['trustworthiness', 'punctuality'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.dealbreakersCount).toBe(2);
    expect(data.onboarding_step).toBe('complete');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('replace_user_dealbreakers', {
      p_user_id: user.id,
      p_dealbreaker_ids: ['trustworthiness', 'punctuality'],
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new Request('http://localhost/api/onboarding/deal-breakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealbreakers: ['trustworthiness'] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if dealbreakers array is empty', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const request = new Request('http://localhost/api/onboarding/deal-breakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealbreakers: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Dealbreakers array is required and must not be empty');
  });

  it('should deduplicate dealbreakers', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockSupabase.rpc.mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const request = new Request('http://localhost/api/onboarding/deal-breakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealbreakers: ['trustworthiness', 'trustworthiness', 'punctuality'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.dealbreakersCount).toBe(2);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('replace_user_dealbreakers', {
      p_user_id: user.id,
      p_dealbreaker_ids: ['trustworthiness', 'punctuality'],
    });
  });
});

