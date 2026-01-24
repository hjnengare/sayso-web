import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Endpoint to add a second account type to an existing email.
 * Instead of creating a duplicate auth user, this updates the profile to role='both'
 * and allows the user to switch between modes.
 * 
 * POST /api/auth/register-second-account-type
 * Body: { accountType: 'user' | 'business_owner' }
 */
export async function POST(request: Request) {
  try {
    const { accountType } = await request.json();

    if (!accountType || (accountType !== 'user' && accountType !== 'business_owner')) {
      return NextResponse.json(
        { error: 'Invalid account type' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set(name, value, options as any);
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set(name, '', { ...options, maxAge: 0 } as any);
          },
        },
      }
    );

    // [OBSOLETE] This endpoint is deprecated. Account type toggling is no longer supported.
    return NextResponse.json({
      success: false,
      error: 'This endpoint is deprecated. Account type toggling is no longer supported.',
    }, { status: 410 });
  } catch (error) {
    console.error('Error in register-second-account-type endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
