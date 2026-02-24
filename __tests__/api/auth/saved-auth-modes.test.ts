const mockGetServerSupabase = jest.fn();
const mockCreateClient = jest.fn();

jest.mock('@/app/lib/supabase/server', () => ({
  getServerSupabase: (...args: any[]) => mockGetServerSupabase(...args),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}));

import { GET } from '@/app/api/user/saved/route';

function buildSavedSupabase(userId: string) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: userId, email: `${userId}@example.com` } },
        error: null,
      }),
    },
    from: jest.fn((table: string) => {
      if (table === 'saved_businesses') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe('GET /api/user/saved auth modes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('supports cookie auth', async () => {
    const cookieSupabase = buildSavedSupabase('cookie-user');
    mockGetServerSupabase.mockResolvedValue(cookieSupabase);

    const req = new Request('http://localhost/api/user/saved') as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.count).toBe(0);
  });

  it('supports bearer auth', async () => {
    const bearerSupabase = buildSavedSupabase('bearer-user');
    mockCreateClient.mockReturnValue(bearerSupabase);

    const req = new Request('http://localhost/api/user/saved', {
      headers: { authorization: 'Bearer token-abc' },
    }) as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.count).toBe(0);
  });
});
