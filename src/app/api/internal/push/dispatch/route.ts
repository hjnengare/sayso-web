import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type PushDispatchStatus = 'sent' | 'failed' | 'invalid_token';

interface TokenRow {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: 'ios' | 'android';
}

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
  type: string;
  created_at: string;
}

interface DeliveryAttemptResult {
  status: PushDispatchStatus;
  providerResponse: unknown;
}

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

function isDispatchAuthorized(req: NextRequest): boolean {
  const configuredSecret = process.env.PUSH_DISPATCH_SECRET || process.env.CRON_SECRET;
  if (!configuredSecret) return false;
  const authHeader = req.headers.get('authorization') || '';
  return authHeader === `Bearer ${configuredSecret}`;
}

function normalizeNumber(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

async function sendExpoPushMessage(
  token: TokenRow,
  notification: NotificationRow
): Promise<DeliveryAttemptResult> {
  const expoAccessToken = process.env.EXPO_ACCESS_TOKEN;
  const payload = {
    to: token.expo_push_token,
    title: notification.title,
    body: notification.message,
    sound: 'default',
    data: {
      link: notification.link,
      notificationId: notification.id,
      type: notification.type,
    },
  };

  const response = await fetch(EXPO_PUSH_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const json = await response
    .json()
    .catch(() => ({ error: 'non_json_response', status: response.status }));

  if (!response.ok) {
    return {
      status: 'failed',
      providerResponse: { status: response.status, body: json },
    };
  }

  const status = (json as any)?.data?.status;
  const detailsError = (json as any)?.data?.details?.error;

  if (status === 'ok') {
    return { status: 'sent', providerResponse: json };
  }

  if (status === 'error' && detailsError === 'DeviceNotRegistered') {
    return { status: 'invalid_token', providerResponse: json };
  }

  return { status: 'failed', providerResponse: json };
}

/**
 * POST /api/internal/push/dispatch
 * Protected worker endpoint for sending queued push notifications via Expo.
 * Requires Authorization: Bearer <PUSH_DISPATCH_SECRET|CRON_SECRET>
 */
export async function POST(req: NextRequest) {
  return handleDispatch(req);
}

/**
 * GET handler is included for Vercel cron compatibility.
 * Vercel scheduled jobs invoke GET requests.
 */
export async function GET(req: NextRequest) {
  return handleDispatch(req);
}

async function handleDispatch(req: NextRequest) {
  try {
    if (!isDispatchAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const maxTokens = normalizeNumber(searchParams.get('maxTokens'), 500, 1, 2000);
    const maxNotifications = normalizeNumber(searchParams.get('maxNotifications'), 500, 1, 2000);
    const lookbackHours = normalizeNumber(searchParams.get('lookbackHours'), 24, 1, 168);
    const lookbackSince = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

    const service = getServiceSupabase();

    const { data: activeTokens, error: tokensError } = await (service as any)
      .from('mobile_push_tokens')
      .select('id, user_id, expo_push_token, platform')
      .is('disabled_at', null)
      .order('last_seen_at', { ascending: false })
      .limit(maxTokens);

    if (tokensError) {
      console.error('[PushDispatch] Failed to fetch active tokens:', tokensError);
      return NextResponse.json(
        { error: 'Failed to fetch push tokens' },
        { status: 500 }
      );
    }

    const tokens = (activeTokens || []) as TokenRow[];
    if (tokens.length === 0) {
      return NextResponse.json({
        success: true,
        summary: {
          tokens: 0,
          notifications: 0,
          attempted: 0,
          sent: 0,
          failed: 0,
          invalidTokens: 0,
        },
      });
    }

    const userIds = [...new Set(tokens.map((token) => token.user_id))];

    const { data: notifications, error: notificationsError } = await (service as any)
      .from('notifications')
      .select('id, user_id, title, message, link, type, created_at')
      .in('user_id', userIds)
      .gte('created_at', lookbackSince)
      .order('created_at', { ascending: true })
      .limit(maxNotifications);

    if (notificationsError) {
      console.error('[PushDispatch] Failed to fetch notifications:', notificationsError);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    const notificationRows = (notifications || []) as NotificationRow[];
    if (notificationRows.length === 0) {
      return NextResponse.json({
        success: true,
        summary: {
          tokens: tokens.length,
          notifications: 0,
          attempted: 0,
          sent: 0,
          failed: 0,
          invalidTokens: 0,
        },
      });
    }

    const notificationIds = notificationRows.map((n) => n.id);
    const tokenIds = tokens.map((t) => t.id);

    const { data: existingLogs, error: logsError } = await (service as any)
      .from('push_delivery_logs')
      .select('notification_id, token_id')
      .in('notification_id', notificationIds)
      .in('token_id', tokenIds);

    if (logsError) {
      console.error('[PushDispatch] Failed to fetch delivery logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch delivery logs' },
        { status: 500 }
      );
    }

    const existingPairs = new Set(
      (existingLogs || []).map((row: any) => `${row.notification_id}:${row.token_id}`)
    );

    const pendingPairs: Array<{ token: TokenRow; notification: NotificationRow }> = [];
    const tokensByUser = new Map<string, TokenRow[]>();

    for (const token of tokens) {
      const bucket = tokensByUser.get(token.user_id) || [];
      bucket.push(token);
      tokensByUser.set(token.user_id, bucket);
    }

    for (const notification of notificationRows) {
      const userTokens = tokensByUser.get(notification.user_id) || [];
      for (const token of userTokens) {
        const pairKey = `${notification.id}:${token.id}`;
        if (existingPairs.has(pairKey)) continue;
        pendingPairs.push({ token, notification });
      }
    }

    if (pendingPairs.length === 0) {
      return NextResponse.json({
        success: true,
        summary: {
          tokens: tokens.length,
          notifications: notificationRows.length,
          attempted: 0,
          sent: 0,
          failed: 0,
          invalidTokens: 0,
        },
      });
    }

    let sent = 0;
    let failed = 0;
    let invalidTokens = 0;
    const tokenIdsToDisable = new Set<string>();
    const deliveryRows: Array<{
      notification_id: string;
      token_id: string;
      status: PushDispatchStatus;
      provider_response: unknown;
      sent_at: string;
    }> = [];

    for (const pair of pendingPairs) {
      const result = await sendExpoPushMessage(pair.token, pair.notification);

      if (result.status === 'sent') sent += 1;
      if (result.status === 'failed') failed += 1;
      if (result.status === 'invalid_token') {
        invalidTokens += 1;
        tokenIdsToDisable.add(pair.token.id);
      }

      deliveryRows.push({
        notification_id: pair.notification.id,
        token_id: pair.token.id,
        status: result.status,
        provider_response: result.providerResponse,
        sent_at: new Date().toISOString(),
      });
    }

    if (deliveryRows.length > 0) {
      const { error: upsertError } = await (service as any)
        .from('push_delivery_logs')
        .upsert(deliveryRows, { onConflict: 'notification_id,token_id' });

      if (upsertError) {
        console.error('[PushDispatch] Failed to store delivery logs:', upsertError);
      }
    }

    if (tokenIdsToDisable.size > 0) {
      const { error: disableError } = await (service as any)
        .from('mobile_push_tokens')
        .update({
          disabled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', Array.from(tokenIdsToDisable));

      if (disableError) {
        console.error('[PushDispatch] Failed to disable invalid tokens:', disableError);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        tokens: tokens.length,
        notifications: notificationRows.length,
        attempted: pendingPairs.length,
        sent,
        failed,
        invalidTokens,
      },
    });
  } catch (error) {
    console.error('[PushDispatch] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
