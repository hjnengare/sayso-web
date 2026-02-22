
export const VALID_PRICE_RANGES = ['$', '$$', '$$$', '$$$$'] as const;
export const VALID_STATUSES = ['active', 'inactive', 'pending', 'pending_approval', 'rejected'] as const;

export const TEMPLATE_COLUMNS = [
  'name',
  'location',
  'primary_subcategory_slug',
  'primary_category_slug',
  'description',
  'address',
  'phone',
  'email',
  'website',
  'image_url',
  'price_range',
  'status',
  'badge',
  'verified',
  'is_hidden',
  'is_system',
  'is_chain',
  'lat',
  'lng',
  'source',
  'source_id',
  'hours',
  'slug',
  'owner_id',
  'category_raw',
  'rejection_reason',
] as const;

export type SeedInputRow = Record<string, unknown>;

export type ParsedSeedRow = {
  rowNumber: number;
  name: string;
  location: string;
  primary_subcategory_slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  image_url: string | null;
  price_range: string;
  status: string;
  badge: string | null;
  verified: boolean | null;
  is_hidden: boolean | null;
  is_system: boolean | null;
  is_chain: boolean;
  lat: number | null;
  lng: number | null;
  source: string | null;
  source_id: string | null;
  hours: Record<string, unknown> | null;
  slug: string | null;
  owner_id: string | null;
  category_raw: string | null;
  rejection_reason: string | null;
  normalized_name: string;
  primary_subcategory_label: string | null;
  primary_category_slug: string | null;
};

export type ValidatedSeedRow = {
  rowNumber: number;
  raw: SeedInputRow;
  parsed: ParsedSeedRow | null;
  errors: string[];
  warnings: string[];
  duplicate: boolean;
  duplicateReason: string | null;
  duplicateKey: string | null;
  existingBusinessId: string | null;
  blocking: boolean;
};

export type ValidationSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  blockingRows: number;
};

export type ValidationResult = {
  rows: ValidatedSeedRow[];
  summary: ValidationSummary;
};

export type CanonicalSlugRecord = {
  slug: string;
  label: string | null;
  primaryCategorySlug: string | null;
};


const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['name'],
  location: ['location'],
  primary_subcategory_slug: ['primary_subcategory_slug', 'subcategory', 'subcategory_slug', 'category', 'category_slug'],
  primary_category_slug: ['primary_category_slug'],
  description: ['description'],
  address: ['address'],
  phone: ['phone'],
  email: ['email'],
  website: ['website'],
  image_url: ['image_url', 'image', 'imageurl'],
  price_range: ['price_range', 'price'],
  status: ['status'],
  badge: ['badge'],
  verified: ['verified'],
  is_hidden: ['is_hidden', 'hidden'],
  is_system: ['is_system', 'system'],
  is_chain: ['is_chain', 'chain'],
  lat: ['lat', 'latitude'],
  lng: ['lng', 'longitude', 'lon'],
  source: ['source'],
  source_id: ['source_id'],
  hours: ['hours'],
  slug: ['slug'],
  owner_id: ['owner_id'],
  category_raw: ['category_raw'],
  rejection_reason: ['rejection_reason'],
};

const VALID_PRIMARY_CATEGORY_SLUGS = new Set([
  'food-drink',
  'beauty-wellness',
  'professional-services',
  'travel',
  'outdoors-adventure',
  'experiences-entertainment',
  'arts-culture',
  'family-pets',
  'shopping-lifestyle',
  'miscellaneous',
]);

const PRICE_SET = new Set<string>(VALID_PRICE_RANGES);
const STATUS_SET = new Set<string>(VALID_STATUSES);

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function toOptionalString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return numeric;
}

function parseBooleanLike(value: unknown): boolean | null | 'invalid' {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return 'invalid';
  }

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;

  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;

  return 'invalid';
}

export function normalizeBusinessName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Strip UTM/tracking parameters and other junk from URLs, keeping just the
 * scheme + host + path. Returns null if the value is not a valid URL.
 */
function cleanUrl(value: unknown): string | null {
  const raw = toOptionalString(value);
  if (!raw) return null;

  // Ensure the value looks like a URL before parsing
  const candidate = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;

  try {
    const url = new URL(candidate);
    // Keep only scheme + host + pathname (drop query string and fragment)
    const cleaned = `${url.protocol}//${url.host}${url.pathname}`.replace(/\/$/, '');
    return cleaned || null;
  } catch {
    // Not a valid URL — return original trimmed value rather than losing the data
    return raw;
  }
}

/**
 * Normalise primary_category_slug: lowercase + trim, then validate against
 * the known set. Returns the slug if valid, otherwise null (with a warning
 * surfaced by the caller).
 */
function normalizePrimaryCategorySlug(value: unknown): { slug: string | null; invalid: boolean } {
  const raw = toOptionalString(value);
  if (!raw) return { slug: null, invalid: false };
  const normalized = raw.toLowerCase().trim();
  if (VALID_PRIMARY_CATEGORY_SLUGS.has(normalized)) return { slug: normalized, invalid: false };
  return { slug: null, invalid: true };
}

function getFieldValue(row: SeedInputRow, field: keyof typeof COLUMN_ALIASES): unknown {
  const normalizedAliases = COLUMN_ALIASES[field].map(normalizeHeader);

  const keys = Object.keys(row);
  for (const key of keys) {
    if (normalizedAliases.includes(normalizeHeader(key))) {
      return row[key];
    }
  }

  return undefined;
}

function parseHours(value: unknown): { data: Record<string, unknown> | null; error: string | null } {
  if (value === null || value === undefined || value === '') {
    return { data: null, error: null };
  }

  if (typeof value === 'object') {
    return { data: value as Record<string, unknown>, error: null };
  }

  const raw = String(value).trim();
  if (!raw) {
    return { data: null, error: null };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return { data: parsed as Record<string, unknown>, error: null };
    }
    // JSON parsed to a primitive — wrap it
    return { data: { raw: String(parsed) }, error: null };
  } catch {
    // Not JSON at all — treat as a plain-text hours description
    return { data: { raw }, error: null };
  }
}

function parseRow(row: SeedInputRow, rowNumber: number): { parsed: ParsedSeedRow | null; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const name = toOptionalString(getFieldValue(row, 'name')) || '';
  const location = toOptionalString(getFieldValue(row, 'location')) || '';
  const primarySubcategorySlugRaw = toOptionalString(getFieldValue(row, 'primary_subcategory_slug')) || '';
  const primarySubcategorySlug = primarySubcategorySlugRaw.toLowerCase().trim();

  if (!name) errors.push('Missing required field: name');
  if (!location) errors.push('Missing required field: location');
  if (!primarySubcategorySlug) errors.push('Missing required field: primary_subcategory_slug');

  // price_range: default to $$ if missing; reject unknown values
  const priceRangeRaw = toOptionalString(getFieldValue(row, 'price_range'));
  const priceRange = priceRangeRaw || '$$';
  if (!PRICE_SET.has(priceRange as (typeof VALID_PRICE_RANGES)[number])) {
    errors.push(`Invalid price_range: ${priceRange}`);
  }

  // status: default to active if missing; reject unknown values
  const statusRaw = toOptionalString(getFieldValue(row, 'status'));
  const status = (statusRaw || 'active').toLowerCase();
  if (!STATUS_SET.has(status as (typeof VALID_STATUSES)[number])) {
    errors.push(`Invalid status: ${status}`);
  }

  const verifiedRaw = parseBooleanLike(getFieldValue(row, 'verified'));
  if (verifiedRaw === 'invalid') errors.push('Invalid verified value (use TRUE/FALSE, 1/0, yes/no)');

  const isHiddenRaw = parseBooleanLike(getFieldValue(row, 'is_hidden'));
  if (isHiddenRaw === 'invalid') errors.push('Invalid is_hidden value (use TRUE/FALSE, 1/0, yes/no)');

  const isSystemRaw = parseBooleanLike(getFieldValue(row, 'is_system'));
  if (isSystemRaw === 'invalid') errors.push('Invalid is_system value (use TRUE/FALSE, 1/0, yes/no)');

  const isChainRaw = parseBooleanLike(getFieldValue(row, 'is_chain'));
  if (isChainRaw === 'invalid') errors.push('Invalid is_chain value (use TRUE/FALSE, 1/0, yes/no)');
  const isChain = isChainRaw === null ? false : Boolean(isChainRaw);

  const lat = toOptionalNumber(getFieldValue(row, 'lat'));
  const lng = toOptionalNumber(getFieldValue(row, 'lng'));

  const hasLat = lat !== null;
  const hasLng = lng !== null;
  if (hasLat !== hasLng) {
    errors.push('Both lat and lng are required when setting coordinates');
  }

  if (lat !== null && (lat < -90 || lat > 90)) {
    errors.push('Invalid lat value (must be between -90 and 90)');
  }

  if (lng !== null && (lng < -180 || lng > 180)) {
    errors.push('Invalid lng value (must be between -180 and 180)');
  }

  // hours: parse JSON or wrap plain-text strings — never block on this
  const hoursResult = parseHours(getFieldValue(row, 'hours'));
  if (hoursResult.error) {
    errors.push(hoursResult.error);
  }

  const source = toOptionalString(getFieldValue(row, 'source'));
  const sourceId = toOptionalString(getFieldValue(row, 'source_id'));

  if ((source && !sourceId) || (!source && sourceId)) {
    errors.push('source and source_id must either both be provided or both be empty');
  }

  // primary_category_slug: normalise + validate; warn and drop if unrecognised
  const primaryCategorySlugResult = normalizePrimaryCategorySlug(getFieldValue(row, 'primary_category_slug'));
  if (primaryCategorySlugResult.invalid) {
    warnings.push(`Unrecognised primary_category_slug dropped — will derive from subcategory`);
  }

  if (errors.length > 0) {
    return { parsed: null, errors, warnings };
  }

  return {
    parsed: {
      rowNumber,
      name,
      location,
      primary_subcategory_slug: primarySubcategorySlug,
      description: toOptionalString(getFieldValue(row, 'description')),
      address: toOptionalString(getFieldValue(row, 'address')),
      phone: toOptionalString(getFieldValue(row, 'phone')),
      email: toOptionalString(getFieldValue(row, 'email')),
      // Clean tracking params from website and image_url URLs
      website: cleanUrl(getFieldValue(row, 'website')),
      image_url: cleanUrl(getFieldValue(row, 'image_url')),
      price_range: priceRange,
      status,
      badge: toOptionalString(getFieldValue(row, 'badge')),
      verified: verifiedRaw === 'invalid' ? null : verifiedRaw,
      is_hidden: isHiddenRaw === 'invalid' ? null : isHiddenRaw,
      is_system: isSystemRaw === 'invalid' ? null : isSystemRaw,
      is_chain: isChain,
      lat,
      lng,
      source,
      source_id: sourceId,
      hours: hoursResult.data,
      slug: toOptionalString(getFieldValue(row, 'slug')),
      owner_id: toOptionalString(getFieldValue(row, 'owner_id')),
      category_raw: toOptionalString(getFieldValue(row, 'category_raw')),
      rejection_reason: toOptionalString(getFieldValue(row, 'rejection_reason')),
      normalized_name: normalizeBusinessName(name),
      primary_subcategory_label: null,
      primary_category_slug: primaryCategorySlugResult.slug,
    },
    errors,
    warnings,
  };
}

function toChunks<T>(items: T[], size = 500): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchCanonicalSlugMap(service: any, slugs: string[]): Promise<Map<string, CanonicalSlugRecord>> {
  const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));
  const map = new Map<string, CanonicalSlugRecord>();

  if (uniqueSlugs.length === 0) {
    return map;
  }

  const attempts = [
    'slug,label,interest_id,category_slug',
    'slug,label,interest_id',
    'slug,label,category_slug',
    'slug,label',
    'slug',
  ];

  let rows: any[] | null = null;
  let lastError: any = null;

  for (const selectColumns of attempts) {
    const { data, error } = await service
      .from('canonical_subcategory_slugs')
      .select(selectColumns)
      .in('slug', uniqueSlugs);

    if (!error) {
      rows = data || [];
      break;
    }

    lastError = error;
  }

  if (!rows) {
    throw new Error(lastError?.message || 'Failed to load canonical subcategory slugs');
  }

  for (const row of rows) {
    const slug = String(row.slug || '').trim().toLowerCase();
    if (!slug) continue;

    map.set(slug, {
      slug,
      label: typeof row.label === 'string' ? row.label : null,
      primaryCategorySlug:
        typeof row.interest_id === 'string'
          ? row.interest_id
          : typeof row.category_slug === 'string'
            ? row.category_slug
            : null,
    });
  }

  return map;
}

async function fetchExistingSourceKeys(service: any, parsedRows: ParsedSeedRow[]): Promise<Map<string, { id: string }>> {
  const map = new Map<string, { id: string }>();

  const grouped = new Map<string, Set<string>>();
  for (const row of parsedRows) {
    if (!row.source || !row.source_id) continue;
    if (!grouped.has(row.source)) {
      grouped.set(row.source, new Set<string>());
    }
    grouped.get(row.source)?.add(row.source_id);
  }

  for (const [source, idSet] of grouped.entries()) {
    const sourceIds = Array.from(idSet);
    for (const chunk of toChunks(sourceIds, 500)) {
      const { data, error } = await service
        .from('businesses')
        .select('id,source,source_id')
        .eq('source', source)
        .in('source_id', chunk);

      if (error) {
        throw new Error(`Failed to check source duplicates: ${error.message}`);
      }

      for (const row of data || []) {
        if (!row.source || !row.source_id) continue;
        map.set(`${row.source}::${row.source_id}`, { id: String(row.id) });
      }
    }
  }

  return map;
}

async function fetchExistingNormalizedNames(service: any, parsedRows: ParsedSeedRow[]): Promise<Map<string, { id: string }>> {
  const map = new Map<string, { id: string }>();

  const names = Array.from(
    new Set(
      parsedRows
        .filter((row) => !row.is_chain)
        .map((row) => row.normalized_name)
        .filter(Boolean)
    )
  );

  for (const chunk of toChunks(names, 500)) {
    const { data, error } = await service
      .from('businesses')
      .select('id,normalized_name,status,is_chain')
      .eq('is_chain', false)
      .in('normalized_name', chunk)
      .or('status.is.null,status.neq.rejected');

    if (error) {
      throw new Error(`Failed to check duplicate names: ${error.message}`);
    }

    for (const row of data || []) {
      if (!row.normalized_name) continue;
      map.set(String(row.normalized_name), { id: String(row.id) });
    }
  }

  return map;
}

export async function validateSeedRows(params: {
  rows: SeedInputRow[];
  service: any;
  allowDuplicates?: boolean;
}): Promise<ValidationResult> {
  const allowDuplicates = params.allowDuplicates === true;
  const provisionalRows: ValidatedSeedRow[] = [];
  const parsedRows: ParsedSeedRow[] = [];

  for (let index = 0; index < params.rows.length; index += 1) {
    const rowNumber = index + 1;
    const row = params.rows[index] || {};
    const parsedResult = parseRow(row, rowNumber);

    const validated: ValidatedSeedRow = {
      rowNumber,
      raw: row,
      parsed: parsedResult.parsed,
      errors: [...parsedResult.errors],
      warnings: [...parsedResult.warnings],
      duplicate: false,
      duplicateReason: null,
      duplicateKey: null,
      existingBusinessId: null,
      blocking: false,
    };

    provisionalRows.push(validated);
    if (parsedResult.parsed) {
      parsedRows.push(parsedResult.parsed);
    }
  }

  const canonicalMap = await fetchCanonicalSlugMap(
    params.service,
    parsedRows.map((row) => row.primary_subcategory_slug)
  );

  for (const row of provisionalRows) {
    if (!row.parsed) continue;

    const canonical = canonicalMap.get(row.parsed.primary_subcategory_slug);
    if (!canonical) {
      row.errors.push('Invalid subcategory slug (must exist in canonical_subcategory_slugs)');
      continue;
    }

    row.parsed.primary_subcategory_label = canonical.label;
    row.parsed.primary_category_slug = row.parsed.primary_category_slug || canonical.primaryCategorySlug;
  }

  const existingSourceMap = await fetchExistingSourceKeys(params.service, parsedRows);
  const existingNormalizedMap = await fetchExistingNormalizedNames(params.service, parsedRows);

  const incomingSourceMap = new Map<string, number>();
  const incomingNameMap = new Map<string, number>();

  for (const row of provisionalRows) {
    if (!row.parsed) {
      row.blocking = row.errors.length > 0;
      continue;
    }

    const parsed = row.parsed;

    if (parsed.source && parsed.source_id) {
      const key = `${parsed.source}::${parsed.source_id}`;
      if (incomingSourceMap.has(key)) {
        row.duplicate = true;
        row.duplicateReason = 'Duplicate source/source_id in upload rows';
        row.duplicateKey = key;
      } else {
        incomingSourceMap.set(key, row.rowNumber);
      }

      const existingMatch = existingSourceMap.get(key);
      if (existingMatch) {
        row.duplicate = true;
        row.existingBusinessId = existingMatch.id;
        row.duplicateReason = 'Duplicate source/source_id already exists';
        row.duplicateKey = key;
      }
    } else if (!parsed.is_chain) {
      const key = parsed.normalized_name;

      if (incomingNameMap.has(key)) {
        row.duplicate = true;
        row.duplicateReason = 'Duplicate normalized_name in upload rows';
        row.duplicateKey = key;
      } else {
        incomingNameMap.set(key, row.rowNumber);
      }

      const existingMatch = existingNormalizedMap.get(key);
      if (existingMatch) {
        row.duplicate = true;
        row.existingBusinessId = existingMatch.id;
        row.duplicateReason = 'Duplicate normalized_name already exists';
        row.duplicateKey = key;
      }
    }

    if (row.duplicate && row.duplicateReason) {
      row.warnings.push(`Duplicate: ${row.duplicateReason}`);
    }

    row.blocking = row.errors.length > 0 || (!allowDuplicates && row.duplicate);
  }

  const summary: ValidationSummary = {
    totalRows: provisionalRows.length,
    validRows: provisionalRows.filter((row) => row.errors.length === 0).length,
    invalidRows: provisionalRows.filter((row) => row.errors.length > 0).length,
    duplicateRows: provisionalRows.filter((row) => row.duplicate).length,
    blockingRows: provisionalRows.filter((row) => row.blocking).length,
  };

  return {
    rows: provisionalRows,
    summary,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function buildBusinessInsertPayload(row: ParsedSeedRow, suffix: string) {
  const baseSlug = slugify(row.name) || 'business';
  const rowSuffix = row.rowNumber.toString(36);
  const slug = row.slug || `${baseSlug}-${suffix}-${rowSuffix}`;

  return {
    name: row.name,
    location: row.location,
    primary_subcategory_slug: row.primary_subcategory_slug,
    primary_subcategory_label: row.primary_subcategory_label,
    primary_category_slug: row.primary_category_slug,
    description: row.description,
    address: row.address,
    phone: row.phone,
    email: row.email,
    website: row.website,
    image_url: row.image_url,
    price_range: row.price_range,
    status: row.status,
    badge: row.badge,
    verified: row.verified ?? false,
    is_hidden: row.is_hidden ?? (row.status === 'active' ? false : true),
    is_system: row.is_system ?? false,
    is_chain: row.is_chain,
    lat: row.lat,
    lng: row.lng,
    source: row.source,
    source_id: row.source_id,
    hours: row.hours,
    slug,
    owner_id: row.owner_id ?? null,
    category_raw: row.category_raw ?? null,
    rejection_reason: row.rejection_reason ?? null,
  };
}

export function buildInsertSuffix(): string {
  return Date.now().toString(36);
}

export function getDatabaseErrorMessage(error: any): string {
  const code = String(error?.code || '');
  const message = String(error?.message || 'Unknown database error');

  if (code === '23505') {
    return 'Unique constraint violation (duplicate business)';
  }

  if (code === '23503') {
    return 'Foreign key validation failed (invalid subcategory slug)';
  }

  if (code === '23514') {
    return 'Check constraint failed (status or price_range invalid)';
  }

  return message;
}
