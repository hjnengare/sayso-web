/**
 * Unit tests for POST /api/onboarding/subcategories
 */

import { POST } from '@/app/api/onboarding/subcategories/route';
import { getServerSupabase } from '@/app/lib/supabase/server';

jest.mock('@/app/lib/supabase/server');

describe('POST /api/onboarding/subcategories', () => {
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

  it('should save subcategories and advance onboarding_step to deal-breakers', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockSupabase.rpc.mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const request = new Request('http://localhost/api/onboarding/subcategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subcategories: [
          { subcategory_id: 'restaurants', interest_id: 'food-drink' },
          { subcategory_id: 'cafes', interest_id: 'food-drink' },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.subcategoriesCount).toBe(2);
    expect(data.onboarding_step).toBe('deal-breakers');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('replace_user_subcategories', {
      p_user_id: user.id,
      p_subcategory_data: [
        { subcategory_id: 'restaurants', interest_id: 'food-drink' },
        { subcategory_id: 'cafes', interest_id: 'food-drink' },
      ],
    });
  });

  it('should filter out invalid subcategories (interest IDs)', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });
    mockSupabase.rpc.mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const request = new Request('http://localhost/api/onboarding/subcategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subcategories: [
          { subcategory_id: 'food-drink', interest_id: 'food-drink' }, // Invalid: subcategory_id is an interest_id
          { subcategory_id: 'restaurants', interest_id: 'food-drink' }, // Valid
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.subcategoriesCount).toBe(1);
    // Should only save the valid subcategory
    expect(mockSupabase.rpc).toHaveBeenCalledWith('replace_user_subcategories', {
      p_user_id: user.id,
      p_subcategory_data: [{ subcategory_id: 'restaurants', interest_id: 'food-drink' }],
    });
  });

  it('should return 400 if no valid subcategories provided', async () => {
    const user = { id: 'user-123' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const request = new Request('http://localhost/api/onboarding/subcategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subcategories: [],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No valid subcategories provided');
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const request = new Request('http://localhost/api/onboarding/subcategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subcategories: [{ subcategory_id: 'restaurants', interest_id: 'food-drink' }],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});

