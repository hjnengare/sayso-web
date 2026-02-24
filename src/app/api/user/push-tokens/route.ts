import { NextRequest, NextResponse } from 'next/server';
import { withUser } from '@/app/api/_lib/withAuth';

type SupportedPlatform = 'ios' | 'android';

interface RegisterPushTokenBody {
  expoPushToken?: string;
  platform?: SupportedPlatform;
  deviceId?: string;
  appVersion?: string;
}

interface DeletePushTokenBody {
  expoPushToken?: string;
  deviceId?: string;
}

const EXPO_PUSH_TOKEN_RE = /^(Expo|Exponent)PushToken\[[^\]]+\]$/;

function isSupportedPlatform(value: unknown): value is SupportedPlatform {
  return value === 'ios' || value === 'android';
}

/**
 * POST /api/user/push-tokens
 * Register or refresh a mobile push token for the authenticated user.
 */
export const POST = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const body = (await req.json()) as RegisterPushTokenBody;
    const expoPushToken = String(body?.expoPushToken || '').trim();
    const platform = body?.platform;
    const deviceId = body?.deviceId ? String(body.deviceId).trim() : null;
    const appVersion = body?.appVersion ? String(body.appVersion).trim() : null;

    if (!expoPushToken || !EXPO_PUSH_TOKEN_RE.test(expoPushToken)) {
      return NextResponse.json(
        { error: 'A valid Expo push token is required' },
        { status: 400 }
      );
    }

    if (!isSupportedPlatform(platform)) {
      return NextResponse.json(
        { error: 'platform must be ios or android' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await (supabase as any)
      .from('mobile_push_tokens')
      .upsert(
        {
          user_id: user.id,
          expo_push_token: expoPushToken,
          platform,
          device_id: deviceId,
          app_version: appVersion,
          last_seen_at: now,
          disabled_at: null,
          updated_at: now,
        },
        { onConflict: 'expo_push_token' }
      )
      .select('id, user_id, expo_push_token, platform, device_id, app_version, last_seen_at, disabled_at')
      .single();

    if (error) {
      console.error('[PushTokens] Failed to upsert token:', error);
      return NextResponse.json(
        { error: 'Failed to register push token' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, token: data });
  } catch (error) {
    console.error('[PushTokens] Unexpected POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * DELETE /api/user/push-tokens
 * Disable push token(s) for the authenticated user.
 * Accepts expoPushToken and/or deviceId.
 */
export const DELETE = withUser(async (req: NextRequest, { user, supabase }) => {
  try {
    const body = (await req.json().catch(() => ({}))) as DeletePushTokenBody;
    const expoPushToken = body?.expoPushToken ? String(body.expoPushToken).trim() : '';
    const deviceId = body?.deviceId ? String(body.deviceId).trim() : '';

    if (!expoPushToken && !deviceId) {
      return NextResponse.json(
        { error: 'expoPushToken or deviceId is required' },
        { status: 400 }
      );
    }

    let query = (supabase as any)
      .from('mobile_push_tokens')
      .update({
        disabled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .is('disabled_at', null);

    if (expoPushToken) query = query.eq('expo_push_token', expoPushToken);
    if (deviceId) query = query.eq('device_id', deviceId);

    const { error } = await query;
    if (error) {
      console.error('[PushTokens] Failed to disable token:', error);
      return NextResponse.json(
        { error: 'Failed to disable push token' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PushTokens] Unexpected DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
