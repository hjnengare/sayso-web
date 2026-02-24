import { NextResponse } from 'next/server';

const mockGetServerSupabase = jest.fn();
const mockCreateClient = jest.fn();
const mockIsAdmin = jest.fn();
const mockGetServiceSupabase = jest.fn();

jest.mock('@/app/lib/supabase/server', () => ({
  getServerSupabase: (...args: any[]) => mockGetServerSupabase(...args),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}));

jest.mock('@/app/lib/admin', () => ({
  isAdmin: (...args: any[]) => mockIsAdmin(...args),
  getServiceSupabase: (...args: any[]) => mockGetServiceSupabase(...args),
}));

import { withUser } from '@/app/api/_lib/withAuth';

describe('withUser auth wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authenticates using bearer token when valid', async () => {
    const bearerSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'bearer-user', email: 'bearer@example.com' } },
          error: null,
        }),
      },
    };

    mockCreateClient.mockReturnValue(bearerSupabase);

    const handler = jest.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withUser(handler);

    const req = new Request('http://localhost/api/test', {
      headers: { authorization: 'Bearer valid-token' },
    }) as any;

    const res = await wrapped(req);
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(mockGetServerSupabase).not.toHaveBeenCalled();
  });

  it('falls back to cookie session if bearer token is invalid', async () => {
    const bearerSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'invalid token' },
        }),
      },
    };

    const cookieSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'cookie-user', email: 'cookie@example.com' } },
          error: null,
        }),
      },
    };

    mockCreateClient.mockReturnValue(bearerSupabase);
    mockGetServerSupabase.mockResolvedValue(cookieSupabase);

    const handler = jest.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withUser(handler);

    const req = new Request('http://localhost/api/test', {
      headers: { authorization: 'Bearer invalid-token' },
    }) as any;

    const res = await wrapped(req);
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(mockGetServerSupabase).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when neither bearer nor cookie auth is valid', async () => {
    const bearerSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'invalid token' },
        }),
      },
    };

    const cookieSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    };

    mockCreateClient.mockReturnValue(bearerSupabase);
    mockGetServerSupabase.mockResolvedValue(cookieSupabase);

    const handler = jest.fn(async () => NextResponse.json({ ok: true }));
    const wrapped = withUser(handler);

    const req = new Request('http://localhost/api/test', {
      headers: { authorization: 'Bearer invalid-token' },
    }) as any;

    const res = await wrapped(req);
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });
});
