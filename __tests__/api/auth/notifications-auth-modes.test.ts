const mockGetServerSupabase = jest.fn();
const mockCreateClient = jest.fn();

jest.mock('@/app/lib/supabase/server', () => ({
  getServerSupabase: (...args: any[]) => mockGetServerSupabase(...args),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}));

import { GET } from '@/app/api/notifications/user/route';

function makeNotificationsBuilder() {
  const builder: any = {
    isCountQuery: false,
  };

  builder.select = jest.fn((_columns: string, options?: { head?: boolean }) => {
    builder.isCountQuery = Boolean(options?.head);
    return builder;
  });
  builder.eq = jest.fn(() => builder);
  builder.order = jest.fn(() => builder);
  builder.range = jest.fn(() => builder);
  builder.then = (resolve: any, reject: any) => {
    const result = builder.isCountQuery
      ? { count: 0, error: null }
      : { data: [], error: null };
    return Promise.resolve(result).then(resolve, reject);
  };

  return builder;
}

function buildNotificationsSupabase(userId: string) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: userId, email: `${userId}@example.com` } },
        error: null,
      }),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { role: 'user', account_role: 'user' },
            error: null,
          }),
        };
      }

      if (table === 'notifications') {
        return makeNotificationsBuilder();
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe('GET /api/notifications/user auth modes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('supports cookie auth', async () => {
    const cookieSupabase = buildNotificationsSupabase('cookie-user');
    mockGetServerSupabase.mockResolvedValue(cookieSupabase);

    const req = new Request('http://localhost/api/notifications/user') as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.notifications)).toBe(true);
    expect(body.count).toBe(0);
    expect(body.unreadCount).toBe(0);
  });

  it('supports bearer auth', async () => {
    const bearerSupabase = buildNotificationsSupabase('bearer-user');
    mockCreateClient.mockReturnValue(bearerSupabase);

    const req = new Request('http://localhost/api/notifications/user', {
      headers: { authorization: 'Bearer token-xyz' },
    }) as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.notifications)).toBe(true);
    expect(body.count).toBe(0);
    expect(body.unreadCount).toBe(0);
  });
});
