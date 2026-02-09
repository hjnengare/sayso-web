import { ContentModerator } from '@/app/lib/utils/contentModeration';
import { detectSpamSignals } from '@/app/lib/utils/anonymousReviews';
import { extractWhatsAppNumberFromUrl, isWhatsAppUrl, normalizeCtaSource, normalizeWhatsAppNumber } from '@/app/lib/events/cta';

type EventOrSpecialType = 'event' | 'special';

type CreateBody = {
  title?: unknown;
  type?: unknown;
  businessId?: unknown;
  business_id?: unknown;
  startDate?: unknown;
  start_date?: unknown;
  endDate?: unknown;
  end_date?: unknown;
  location?: unknown;
  description?: unknown;
  icon?: unknown;
  image?: unknown;
  price?: unknown;
  bookingUrl?: unknown;
  booking_url?: unknown;
  bookingContact?: unknown;
  booking_contact?: unknown;
  ctaSource?: unknown;
  cta_source?: unknown;
  ctaLabel?: unknown;
  cta_label?: unknown;
  ctaUrl?: unknown;
  cta_url?: unknown;
  whatsappNumber?: unknown;
  whatsapp_number?: unknown;
  whatsappPrefillTemplate?: unknown;
  whatsapp_prefill_template?: unknown;
};

type CreateResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string };

const MAX_CREATIONS_PER_HOUR = 15;

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value: unknown): string | null {
  const trimmed = asTrimmedString(value);
  return trimmed.length > 0 ? trimmed : null;
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function userOwnsBusiness(supabase: any, userId: string, businessId: string): Promise<boolean> {
  const [directOwnerResult, verifiedOwnerResult] = await Promise.all([
    supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('owner_id', userId)
      .maybeSingle(),
    supabase
      .from('business_owners')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (directOwnerResult.error && directOwnerResult.error.code !== 'PGRST116') {
    console.error('[createEventSpecial] direct ownership query error:', directOwnerResult.error);
  }

  if (verifiedOwnerResult.error && verifiedOwnerResult.error.code !== 'PGRST116') {
    console.error('[createEventSpecial] verified ownership query error:', verifiedOwnerResult.error);
  }

  return Boolean(directOwnerResult.data || verifiedOwnerResult.data);
}

async function hasBusinessOwnerRole(supabase: any, userId: string): Promise<boolean> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, account_role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[createEventSpecial] role lookup failed:', error);
    return false;
  }

  const role = profile?.role;
  const accountRole = profile?.account_role;
  return role === 'business_owner' || role === 'both' || accountRole === 'business_owner';
}

async function isRateLimited(supabase: any, userId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('events_and_specials')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId)
    .gte('created_at', oneHourAgo);

  if (error) {
    console.error('[createEventSpecial] rate-limit lookup failed:', error);
    return false;
  }

  return (count ?? 0) >= MAX_CREATIONS_PER_HOUR;
}

export async function createEventOrSpecial(params: {
  supabase: any;
  userId: string;
  body: CreateBody;
  forcedBusinessId?: string;
}): Promise<CreateResult> {
  const { supabase, userId, body, forcedBusinessId } = params;

  const title = asTrimmedString(body.title);
  const typeRaw = asTrimmedString(body.type).toLowerCase();
  const type: EventOrSpecialType = typeRaw === 'special' ? 'special' : 'event';
  const businessId = normalizeNullableString(forcedBusinessId ?? body.businessId ?? body.business_id);
  const startDate = asTrimmedString(body.startDate ?? body.start_date);
  const endDate = normalizeNullableString(body.endDate ?? body.end_date);
  const location = asTrimmedString(body.location);
  const icon = normalizeNullableString(body.icon);
  const image = normalizeNullableString(body.image);
  const rawCtaSource = normalizeNullableString(body.ctaSource ?? body.cta_source);
  const ctaSource = normalizeCtaSource(rawCtaSource);
  const ctaUrl = normalizeNullableString(body.ctaUrl ?? body.cta_url ?? body.bookingUrl ?? body.booking_url);
  const ctaLabel = normalizeNullableString(body.ctaLabel ?? body.cta_label ?? body.bookingContact ?? body.booking_contact);
  const rawWhatsappNumber = normalizeNullableString(body.whatsappNumber ?? body.whatsapp_number);
  const whatsappPrefillTemplate = normalizeNullableString(body.whatsappPrefillTemplate ?? body.whatsapp_prefill_template);
  const inferredWhatsappFromUrl = extractWhatsAppNumberFromUrl(ctaUrl);
  const whatsappNumber = normalizeWhatsAppNumber(rawWhatsappNumber) ?? inferredWhatsappFromUrl;
  const usesWhatsapp = ctaSource === 'whatsapp' || isWhatsAppUrl(ctaUrl);
  const effectiveCtaSource =
    ctaSource ?? (isWhatsAppUrl(ctaUrl) ? 'whatsapp' : ctaUrl ? 'website' : null);
  let description = normalizeNullableString(body.description);
  const price = parseNullableNumber(body.price);

  if (!title || !startDate || !location) {
    return { ok: false, status: 400, error: 'Missing required fields: title, startDate, location' };
  }

  if (title.length > 160) {
    return { ok: false, status: 400, error: 'Title must be 160 characters or less' };
  }

  if (location.length > 180) {
    return { ok: false, status: 400, error: 'Location must be 180 characters or less' };
  }

  if (description && description.length > 4000) {
    return { ok: false, status: 400, error: 'Description must be 4000 characters or less' };
  }

  if (icon && icon.length > 64) {
    return { ok: false, status: 400, error: 'Icon keyword must be 64 characters or less' };
  }

  if (image && !isValidHttpUrl(image)) {
    return { ok: false, status: 400, error: 'Image must be a valid http(s) URL' };
  }

  if (ctaUrl && !isValidHttpUrl(ctaUrl)) {
    return { ok: false, status: 400, error: 'CTA URL must be a valid http(s) URL' };
  }

  if (ctaLabel && ctaLabel.length > 140) {
    return { ok: false, status: 400, error: 'CTA label must be 140 characters or less' };
  }

  if (usesWhatsapp && !whatsappNumber) {
    return { ok: false, status: 400, error: 'WhatsApp number is required when booking method is WhatsApp' };
  }

  if (whatsappPrefillTemplate && whatsappPrefillTemplate.length > 2000) {
    return { ok: false, status: 400, error: 'WhatsApp prefilled message must be 2000 characters or less' };
  }

  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    return { ok: false, status: 400, error: 'Price must be a valid non-negative number' };
  }

  const startDateMs = new Date(startDate).getTime();
  if (!Number.isFinite(startDateMs)) {
    return { ok: false, status: 400, error: 'Invalid start date' };
  }

  if (endDate) {
    const endDateMs = new Date(endDate).getTime();
    if (!Number.isFinite(endDateMs)) {
      return { ok: false, status: 400, error: 'Invalid end date' };
    }
    if (endDateMs < startDateMs) {
      return { ok: false, status: 400, error: 'End date cannot be before start date' };
    }
  }

  const contentForSpamCheck = `${title} ${description ?? ''} ${location}`;
  const spamSignals = detectSpamSignals(contentForSpamCheck);
  if (spamSignals.includes('contains_link') || spamSignals.includes('excessive_repetition')) {
    return { ok: false, status: 400, error: 'Content failed spam checks. Remove links or repetitive text.' };
  }

  if (description) {
    const moderation = ContentModerator.moderate(description);
    const blockReasons = moderation.reasons.filter((reason) => reason !== 'Content is too short');
    if (blockReasons.length > 0) {
      return { ok: false, status: 400, error: `Content moderation failed: ${blockReasons[0]}` };
    }
    if (moderation.sanitizedContent) {
      description = moderation.sanitizedContent;
    }
  }

  if (await isRateLimited(supabase, userId)) {
    return {
      ok: false,
      status: 429,
      error: `Rate limit exceeded. You can create up to ${MAX_CREATIONS_PER_HOUR} events/specials per hour.`,
    };
  }

  if (type === 'special' && !businessId) {
    return { ok: false, status: 400, error: 'Specials must be linked to a business' };
  }

  if (type === 'special') {
    const isBusinessRole = await hasBusinessOwnerRole(supabase, userId);
    if (!isBusinessRole) {
      return { ok: false, status: 403, error: 'Only business owners can create specials' };
    }
  }

  if (businessId) {
    const ownsBusiness = await userOwnsBusiness(supabase, userId, businessId);
    if (!ownsBusiness) {
      return { ok: false, status: 403, error: 'You do not have verified access to this business' };
    }
  }

  const isCommunityEvent = type === 'event' && !businessId;

  const insertPayload = {
    title,
    type,
    business_id: businessId,
    is_community_event: isCommunityEvent,
    start_date: new Date(startDate).toISOString(),
    end_date: endDate ? new Date(endDate).toISOString() : null,
    location,
    description,
    icon,
    image,
    price,
    booking_url: ctaUrl,
    booking_contact: ctaLabel,
    cta_source: effectiveCtaSource,
    whatsapp_number: whatsappNumber,
    whatsapp_prefill_template: whatsappPrefillTemplate,
    created_by: userId,
    rating: 0,
  };

  const { data, error } = await supabase
    .from('events_and_specials')
    .insert([insertPayload])
    .select('*')
    .single();

  if (error) {
    console.error('[createEventSpecial] insert failed:', error);
    return { ok: false, status: 500, error: 'Failed to create listing' };
  }

  return { ok: true, data };
}
