const mockGetServerSupabase = jest.fn();
const mockCreateClient = jest.fn();

jest.mock('@/app/lib/supabase/server', () => ({
  getServerSupabase: (...args: any[]) => mockGetServerSupabase(...args),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}));

import { GET } from '@/app/api/notifications/business/route';

type MockNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

function makeNotificationsBuilder(notifications: MockNotification[], unreadCount: number) {
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
      ? { count: unreadCount, error: null }
      : { data: notifications, error: null };
    return Promise.resolve(result).then(resolve, reject);
  };

  return builder;
}

function buildBusinessNotificationsSupabase(params: {
  userId: string;
  role: string;
  notifications?: MockNotification[];
  unreadCount?: number;
}) {
  const queryBuilders: any[] = [];
  const notifications = params.notifications ?? [];

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: params.userId, email: `${params.userId}@example.com` } },
        error: null,
      }),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { role: params.role, account_role: params.role },
            error: null,
          }),
        };
      }

      if (table === 'notifications') {
        const builder = makeNotificationsBuilder(notifications, params.unreadCount ?? 0);
        queryBuilders.push(builder);
        return builder;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, queryBuilders };
}

describe('GET /api/notifications/business', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows business owners and returns notifications payload', async () => {
    const { supabase, queryBuilders } = buildBusinessNotificationsSupabase({
      userId: 'owner-1',
      role: 'business_owner',
      notifications: [
        {
          id: 'n-1',
          user_id: 'owner-1',
          type: 'review',
          title: 'Reply on Review',
          message: 'Someone replied',
          read: false,
          created_at: '2026-03-02T00:00:00.000Z',
        },
      ],
      unreadCount: 1,
    });

    mockGetServerSupabase.mockResolvedValue(supabase);

    const req = new Request('http://localhost/api/notifications/business?unread=true&type=review&limit=2&offset=1') as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.notifications)).toBe(true);
    expect(body.notifications).toHaveLength(1);
    expect(body.unreadCount).toBe(1);

    const listQuery = queryBuilders[0];
    expect(listQuery.eq).toHaveBeenCalledWith('user_id', 'owner-1');
    expect(listQuery.eq).toHaveBeenCalledWith('read', false);
    expect(listQuery.eq).toHaveBeenCalledWith('type', 'review');
    expect(listQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(listQuery.range).toHaveBeenCalledWith(1, 2);
  });

  it('rejects non-business users with 403', async () => {
    const { supabase } = buildBusinessNotificationsSupabase({
      userId: 'user-1',
      role: 'user',
    });

    mockGetServerSupabase.mockResolvedValue(supabase);

    const req = new Request('http://localhost/api/notifications/business') as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain('/api/notifications/business');
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(supabase.from).not.toHaveBeenCalledWith('notifications');
  });
});
