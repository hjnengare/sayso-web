const mockGetServerSupabase = jest.fn();
const mockCreateClient = jest.fn();
const mockGetUserProfile = jest.fn();
const mockUpdateLastActive = jest.fn();

jest.mock('@/app/lib/supabase/server', () => ({
  getServerSupabase: (...args: any[]) => mockGetServerSupabase(...args),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}));

jest.mock('@/app/lib/services/userService', () => ({
  getUserProfile: (...args: any[]) => mockGetUserProfile(...args),
  updateLastActive: (...args: any[]) => mockUpdateLastActive(...args),
  updateUserProfile: jest.fn(),
}));

import { GET } from '@/app/api/user/profile/route';

describe('GET /api/user/profile auth modes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserProfile.mockResolvedValue({ id: 'profile-1', username: 'tester' });
    mockUpdateLastActive.mockResolvedValue(undefined);
  });

  it('supports cookie auth', async () => {
    const cookieSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-cookie', email: 'cookie@example.com' } },
          error: null,
        }),
      },
    };

    mockGetServerSupabase.mockResolvedValue(cookieSupabase);

    const req = new Request('http://localhost/api/user/profile') as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockGetUserProfile).toHaveBeenCalled();
  });

  it('supports bearer auth', async () => {
    const bearerSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-bearer', email: 'bearer@example.com' } },
          error: null,
        }),
      },
    };

    mockCreateClient.mockReturnValue(bearerSupabase);

    const req = new Request('http://localhost/api/user/profile', {
      headers: { authorization: 'Bearer token-123' },
    }) as any;
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockGetUserProfile).toHaveBeenCalled();
  });
});
