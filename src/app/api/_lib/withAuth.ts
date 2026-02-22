import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { isAdmin, getServiceSupabase } from '@/app/lib/admin';

// ─── Types ────────────────────────────────────────────────────────────────────

type ServerSupabase = Awaited<ReturnType<typeof getServerSupabase>>;
type RouteContext = { params?: Promise<Record<string, string>> };

export type UserHandlerCtx = {
  user: User;
  supabase: ServerSupabase;
  params?: Promise<Record<string, string>>;
};

export type AdminHandlerCtx = {
  user: User;
  supabase: ServerSupabase;
  service: ReturnType<typeof getServiceSupabase>;
  params?: Promise<Record<string, string>>;
};

export type BusinessOwnerHandlerCtx = {
  user: User;
  supabase: ServerSupabase;
  params?: Promise<Record<string, string>>;
};

export type OptionalUserHandlerCtx = {
  user: User | null;
  supabase: ServerSupabase;
  params?: Promise<Record<string, string>>;
};

// ─── withUser ─────────────────────────────────────────────────────────────────
/**
 * Wraps a route handler, requiring a valid authenticated session.
 * Injects `user` and `supabase` into the handler context.
 * Returns 401 if unauthenticated.
 */
export function withUser(
  handler: (req: NextRequest, ctx: UserHandlerCtx) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, ctx: RouteContext = {}) => {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(req, { ...ctx, user, supabase });
  };
}

// ─── withAdmin ────────────────────────────────────────────────────────────────
/**
 * Wraps a route handler, requiring admin role.
 * Injects `user`, `supabase`, and `service` (service-role client) into the handler context.
 * Returns 401 if unauthenticated, 403 if not admin.
 */
export function withAdmin(
  handler: (req: NextRequest, ctx: AdminHandlerCtx) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, ctx: RouteContext = {}) => {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const service = getServiceSupabase();
    return handler(req, { ...ctx, user, supabase, service });
  };
}

// ─── withBusinessOwner ────────────────────────────────────────────────────────
/**
 * Wraps a route handler, requiring business_owner or admin role.
 * Injects `user` and `supabase` into the handler context.
 * Returns 401 if unauthenticated, 403 if neither business_owner nor admin.
 */
export function withBusinessOwner(
  handler: (req: NextRequest, ctx: BusinessOwnerHandlerCtx) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, ctx: RouteContext = {}) => {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const service = getServiceSupabase();
    const { data: profile } = await service
      .from('profiles')
      .select('role, account_role')
      .eq('user_id', user.id)
      .maybeSingle();
    const role = (profile as { role?: string | null; account_role?: string | null } | null);
    const isOwner = role?.account_role === 'business_owner' || role?.role === 'business_owner';
    const isUserAdmin = role?.account_role === 'admin' || role?.role === 'admin';
    if (!isOwner && !isUserAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return handler(req, { ...ctx, user, supabase });
  };
}

// ─── withOptionalUser ─────────────────────────────────────────────────────────
/**
 * Wraps a route handler that works for both authenticated and anonymous users.
 * Injects `user` (null if unauthenticated) and `supabase` into the handler context.
 * Never returns 401 — the handler decides what to do with a null user.
 */
export function withOptionalUser(
  handler: (req: NextRequest, ctx: OptionalUserHandlerCtx) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, ctx: RouteContext = {}) => {
    const supabase = await getServerSupabase(req);
    const { data: { user } } = await supabase.auth.getUser();
    return handler(req, { ...ctx, user: user ?? null, supabase });
  };
}
