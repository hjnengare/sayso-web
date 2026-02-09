import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

function getArgValue(name) {
  const idx = process.argv.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (idx === -1) return null;
  const v = process.argv[idx];
  if (v.includes('=')) return v.split('=').slice(1).join('=');
  return process.argv[idx + 1] ?? null;
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY;

// Foursquare migrated Places API away from api.foursquare.com/v3 (returns 410 for many keys).
// New host: https://places-api.foursquare.com (no /v3 segment).
const FSQ_BASE_URL = 'https://places-api.foursquare.com';
const FSQ_API_VERSION = process.env.X_PLACES_API_VERSION || '2025-06-17';

const CAPE_TOWN_LL = '-33.9249,18.4241';
const CAPE_TOWN_RADIUS_M = 5000;
const LIMIT_PER_PAGE = Math.min(
  Math.max(Number.parseInt(process.env.LIMIT_PER_PAGE || '50', 10), 1),
  50
);
const MAX_PER_CATEGORY = Math.max(
  Number.parseInt(process.env.MAX_PER_CATEGORY || getArgValue('--max-per-slug') || '300', 10) || 300,
  1
);
const MAX_PAGES = Math.max(
  Number.parseInt(process.env.MAX_PAGES || getArgValue('--max-pages') || '25', 10) || 25,
  1
);

const PAGE_DELAY_MS = Number.parseInt(process.env.PAGE_DELAY_MS || '150', 10);
const CATEGORY_DELAY_MS = Number.parseInt(process.env.CATEGORY_DELAY_MS || '250', 10);

const DRY_RUN = process.argv.includes('--dry-run');
const LOG_FSQ_URLS = process.argv.includes('--log-urls') || process.env.LOG_FSQ_URLS === '1';
const DISCOVER_FSQ_CATEGORIES =
  process.argv.includes('--discover-fsq-categories') || process.env.DISCOVER_FSQ_CATEGORIES === '1';
const DISCOVER_JSON_ONLY =
  process.argv.includes('--json-only') || process.env.DISCOVER_JSON_ONLY === '1';
const DISCOVER_COUNT_MODE =
  (process.env.DISCOVER_COUNT_MODE || '').toLowerCase() === 'all' || process.argv.includes('--all-categories')
    ? 'all'
    : 'primary';
const DISCOVER_MAX_PAGES = Number.parseInt(process.env.DISCOVER_MAX_PAGES || '4', 10);
const DISCOVER_LIMIT_PER_PAGE = Math.min(
  Math.max(Number.parseInt(process.env.DISCOVER_LIMIT_PER_PAGE || '50', 10), 1),
  50
);
const MAP_FILE_MAX_IDS_PER_SLUG = Math.min(
  Math.max(Number.parseInt(process.env.MAP_FILE_MAX_IDS_PER_SLUG || '10', 10), 1),
  50
);
const FSQ_TO_SAYSO_MAP_FILE =
  process.env.FSQ_TO_SAYSO_MAP_FILE ||
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'fsq-to-sayso-map.json');

// Places Pro (free tier) safe fields only. Keep this minimal to avoid premium credit usage.
const FSQ_PRO_FIELDS = ['fsq_place_id', 'name', 'latitude', 'longitude', 'location', 'categories'];
const FSQ_PRO_FIELDS_CSV = FSQ_PRO_FIELDS.join(',');
let lastLoggedFsqFields = null;
function logFsqFields(fieldsCsv) {
  if (lastLoggedFsqFields === fieldsCsv) return;
  lastLoggedFsqFields = fieldsCsv;
  console.log(`[FSQ] fields=${fieldsCsv}`);
}

const ONLY_SUBCATEGORIES_RAW = getArgValue('--subcategories');
const ONLY_SUBCATEGORIES = ONLY_SUBCATEGORIES_RAW
  ? new Set(
      ONLY_SUBCATEGORIES_RAW.split(',').map((s) => s.trim()).filter(Boolean)
    )
  : null;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !FOURSQUARE_API_KEY) {
  const missing = [
    !SUPABASE_URL ? 'SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)' : null,
    !SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
    !FOURSQUARE_API_KEY ? 'FOURSQUARE_API_KEY' : null,
  ].filter(Boolean);
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function toSlug(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function isFoursquareId(value) {
  return typeof value === 'string' && value.length >= 10;
}

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, headers) {
  const lines = [];
  lines.push(headers.map(csvEscape).join(','));
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(','));
  }
  return lines.join('\n') + '\n';
}

function getFirstDefined(...values) {
  for (const v of values) if (v !== undefined) return v;
  return undefined;
}

async function fetchJsonWithRetry(url, { headers, method = 'GET' } = {}) {
  const maxAttempts = 6;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { method, headers });
      if (res.status === 204) return null;

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json') || contentType.includes('+json');
      const bodyText = isJson ? null : await res.text().catch(() => '');
      const json = isJson ? await res.json() : null;

      if (res.ok) return { json, headers: res.headers };

      const retryAfterHeader = res.headers.get('retry-after');
      const retryAfterMs = retryAfterHeader ? Number.parseFloat(retryAfterHeader) * 1000 : null;

      const status = res.status;
      const retryable =
        status === 429 || status === 408 || status === 409 || (status >= 500 && status <= 599);

      const msg = isJson
        ? JSON.stringify(json)
        : bodyText || `HTTP ${status} ${res.statusText}`;
      const err = new Error(`HTTP ${status}: ${msg}`);
      // Attach useful details for callers (e.g. credit errors / pagination headers)
      err.status = status;
      err.body = json ?? bodyText ?? null;
      err.headers = res.headers;

      // If the API says credits are depleted, don't waste attempts; let the caller decide how to handle.
      if (
        status === 429 &&
        /no api credits remaining/i.test(
          typeof json === 'object' && json ? JSON.stringify(json) : String(bodyText || msg)
        )
      ) {
        throw err;
      }

      if (!retryable || attempt === maxAttempts) throw err;

      const backoffMs = Math.min(8000, 300 * 2 ** (attempt - 1));
      const waitMs =
        retryAfterMs && Number.isFinite(retryAfterMs) ? Math.max(retryAfterMs, backoffMs) : backoffMs;
      await sleep(waitMs);
    } catch (e) {
      lastErr = e;
      if (attempt === maxAttempts) throw e;
      await sleep(Math.min(8000, 300 * 2 ** (attempt - 1)));
    }
  }

  throw lastErr || new Error('fetchJsonWithRetry failed');
}

function parseJsonLoose(text, label) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const msg = String(e?.message || e);
    throw new Error(`Failed to parse JSON for ${label}: ${msg}`);
  }
}

async function loadFsqCategoryMapFromFile() {
  const txt = await fs.readFile(FSQ_TO_SAYSO_MAP_FILE, 'utf8');
  const parsed = parseJsonLoose(txt, `FSQ_TO_SAYSO_MAP_FILE (${FSQ_TO_SAYSO_MAP_FILE})`);
  const sub = parsed?.subcategories || parsed?.mappings || parsed;
  if (!sub || typeof sub !== 'object') {
    throw new Error(`Invalid mapping file shape in ${FSQ_TO_SAYSO_MAP_FILE} (expected {subcategories:{slug:[ids]}}).`);
  }
  return sub;
}

async function fetchBusinessesColumnsFromOpenApi() {
  const openApiUrl = new URL('/rest/v1/', SUPABASE_URL);
  const openapiRes = await fetchJsonWithRetry(openApiUrl.toString(), {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: 'application/openapi+json',
    },
  });
  const openapi = openapiRes?.json;

  const tableName = 'businesses';
  const schema =
    openapi?.components?.schemas?.[tableName] ||
    openapi?.definitions?.[tableName] ||
    openapi?.components?.schemas?.public_businesses ||
    openapi?.definitions?.public_businesses;

  if (!schema || typeof schema !== 'object') {
    throw new Error('OpenAPI schema for table "businesses" not found.');
  }

  const properties = schema.properties && typeof schema.properties === 'object' ? schema.properties : {};
  const requiredList = Array.isArray(schema.required) ? schema.required : [];
  const required = new Set(requiredList);

  const columns = new Map();
  for (const [name, prop] of Object.entries(properties)) {
    const readOnly = prop?.readOnly === true;
    const writeOnly = prop?.writeOnly === true;
    const nullable =
      prop?.nullable === true ||
      prop?.['x-nullable'] === true ||
      (required.has(name) ? false : prop?.nullable === false ? false : true);
    const hasDefault = Object.prototype.hasOwnProperty.call(prop || {}, 'default');
    columns.set(name, {
      name,
      type: prop?.type || null,
      format: prop?.format || null,
      readOnly,
      writeOnly,
      nullable: Boolean(nullable),
      hasDefault,
      default: hasDefault ? prop.default : null,
      required: required.has(name),
      source: 'openapi',
    });
  }

  if (columns.size === 0) {
    throw new Error('OpenAPI returned zero columns for "businesses".');
  }

  return columns;
}

async function fetchBusinessesColumnsFromInformationSchema() {
  const { data, error } = await supabase
    .schema('information_schema')
    .from('columns')
    .select('column_name,data_type,is_nullable,column_default')
    .eq('table_schema', 'public')
    .eq('table_name', 'businesses');

  if (error) throw error;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('information_schema.columns returned no rows for public.businesses');
  }

  const columns = new Map();
  for (const row of data) {
    const name = row.column_name;
    columns.set(name, {
      name,
      type: row.data_type || null,
      format: null,
      nullable: row.is_nullable === 'YES',
      hasDefault: row.column_default != null && String(row.column_default).length > 0,
      default: row.column_default ?? null,
      required: row.is_nullable === 'NO' && !(row.column_default != null && String(row.column_default).length > 0),
      source: 'information_schema',
    });
  }
  return columns;
}

async function fetchBusinessesColumns() {
  try {
    return await fetchBusinessesColumnsFromInformationSchema();
  } catch {
    return await fetchBusinessesColumnsFromOpenApi();
  }
}

function buildColumnIndex(columnsMap) {
  const names = new Set([...columnsMap.keys()]);
  const get = (name) => columnsMap.get(name);
  const has = (name) => names.has(name);
  const firstExisting = (candidates) => candidates.find((c) => has(c)) || null;
  const setIfExists = (out, key, value) => {
    if (!has(key)) return;
    if (value === undefined) return;
    out[key] = value;
  };
  const setFirstExisting = (out, candidates, value) => {
    const key = firstExisting(candidates);
    if (!key) return;
    if (value === undefined) return;
    out[key] = value;
  };
  return { names, get, has, firstExisting, setIfExists, setFirstExisting };
}

function extractLatLng(place) {
  const lat =
    getFirstDefined(place?.latitude, place?.geocodes?.main?.latitude, place?.geocodes?.main?.lat) ?? null;
  const lng =
    getFirstDefined(
      place?.longitude,
      place?.geocodes?.main?.longitude,
      place?.geocodes?.main?.lng
    ) ?? null;
  return { lat: typeof lat === 'number' ? lat : lat != null ? Number(lat) : null, lng: typeof lng === 'number' ? lng : lng != null ? Number(lng) : null };
}

function getFormattedAddress(place) {
  const loc = place?.location || {};
  return (
    loc.formatted_address ||
    loc.formattedAddress ||
    loc.formatted ||
    loc.address ||
    null
  );
}

function mapPlaceToBusinessRow(place, context, columnIndex) {
  const { setIfExists, setFirstExisting, firstExisting, get } = columnIndex;
  const out = {};

  const fsqPlaceId = place?.fsq_place_id || place?.fsqPlaceId || place?.fsq_id || null;
  const name = place?.name || null;
  const { lat, lng } = extractLatLng(place);
  const address = getFormattedAddress(place);
  const categories = Array.isArray(place?.categories) ? place.categories : [];
  const primaryCategoryName =
    categories?.[0]?.name || categories?.[0]?.short_name || context?.matchedFsqCategoryName || null;

  setIfExists(out, 'name', name);
  setFirstExisting(out, ['latitude', 'lat'], lat);
  setFirstExisting(out, ['longitude', 'lng', 'lon'], lng);

  setFirstExisting(out, ['address', 'formatted_address'], address);
  setFirstExisting(out, ['location', 'location_string', 'location_text'], address);

  setFirstExisting(out, ['locality', 'city'], place?.location?.locality ?? null);
  setFirstExisting(out, ['region', 'province', 'state'], place?.location?.region ?? null);
  setFirstExisting(out, ['country', 'country_code'], place?.location?.country ?? null);

  setFirstExisting(out, ['category', 'primary_category', 'primary_category_name'], primaryCategoryName);
  if (categories.length > 0) {
    const categoryRaw = categories.map((c) => c?.name).filter(Boolean).join('|') || null;
    setIfExists(out, 'category_raw', categoryRaw);
  }

  if (columnIndex.has('status') && (out.status == null || out.status === '')) out.status = 'active';

  const externalIdCol = firstExisting(['source_place_id', 'fsq_place_id', 'external_id', 'source_id']);
  if (externalIdCol && isFoursquareId(fsqPlaceId)) {
    out[externalIdCol] = fsqPlaceId;
  }

  if (columnIndex.has('source')) out.source = 'foursquare';

  // Explicitly set canonical external id column if it exists.
  if (isFoursquareId(fsqPlaceId)) {
    setIfExists(out, 'source_place_id', fsqPlaceId);
    setIfExists(out, 'source_id', fsqPlaceId);
    setIfExists(out, 'fsq_place_id', fsqPlaceId);
  }

  setFirstExisting(out, ['source_category_id', 'fsq_category_id', 'external_category_id'], context?.matchedFsqCategoryId);
  setFirstExisting(out, ['source_category_name', 'fsq_category_name', 'external_category_name'], context?.matchedFsqCategoryName);

  // Sayso taxonomy columns (only if they exist)
  if (context?.saysoSubcategorySlug) {
    setIfExists(out, 'primary_subcategory_slug', context.saysoSubcategorySlug);
    setIfExists(out, 'primary_subcategory_label', context.saysoSubcategoryLabel ?? null);
    setIfExists(out, 'primary_category_slug', context.saysoInterestId ?? null);

    // Backward-compatible columns, if present
    setIfExists(out, 'sub_interest_id', context.saysoSubcategorySlug);
    setIfExists(out, 'interest_id', context.saysoInterestId ?? null);
  }

  const slugCol = firstExisting(['slug', 'business_slug']);
  if (slugCol && (out[slugCol] == null || out[slugCol] === '')) {
    const colMeta = get(slugCol);
    const isRequired = colMeta?.required === true || (colMeta?.nullable === false && colMeta?.hasDefault === false);
    if (isRequired && name) {
      const base = toSlug(name);
      const suffix = isFoursquareId(fsqPlaceId) ? String(fsqPlaceId).slice(-6) : '';
      const slug = suffix ? `${base}-${suffix}` : base;
      if (slug) out[slugCol] = slug;
    }
  }

  // If the schema really requires an `id` on insert (some OpenAPI metadata marks it as required even when DB has a default),
  // provide a safe fallback only when it clearly looks like a UUID column.
  if (columnIndex.has('id') && (out.id == null || out.id === '')) {
    const idMeta = get('id');
    const isRequired = idMeta?.required === true || (idMeta?.nullable === false && idMeta?.hasDefault === false);
    const isUuid = idMeta?.format === 'uuid';
    const canWrite = idMeta?.readOnly !== true;
    if (isRequired && !idMeta?.hasDefault && isUuid && canWrite) {
      out.id = randomUUID();
    }
  }

  return out;
}

function validateRowAgainstSchema(row, columnsMap) {
  const reasons = [];
  const openApiServerGenerated = new Set(['id', 'created_at', 'updated_at', 'createdAt', 'updatedAt']);
  for (const [colName, meta] of columnsMap.entries()) {
    if (!meta) continue;

    // When using PostgREST OpenAPI metadata, server-generated columns like `id`/timestamps are often marked as required
    // even though inserts succeed without them. Avoid false negatives during validation.
    if (meta.readOnly === true) continue;
    if (meta.source === 'openapi' && openApiServerGenerated.has(colName)) continue;

    const required = meta.required === true || (meta.nullable === false && meta.hasDefault === false);
    if (!required) continue;
    const val = row[colName];
    if (val === undefined || val === null || val === '') {
      reasons.push(`missing required "${colName}"`);
    }
  }
  return { ok: reasons.length === 0, reasons };
}

function fsqHeaders() {
  return {
    Authorization: `Bearer ${FOURSQUARE_API_KEY}`,
    'X-Places-Api-Version': FSQ_API_VERSION,
    Accept: 'application/json',
  };
}

async function loadSaysoSubcategoriesFromRepo() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const subcategoriesPath = path.join(repoRoot, 'src', 'app', 'api', 'subcategories', 'route.ts');
  const txt = await fs.readFile(subcategoriesPath, 'utf8');

  const re =
    /\{\s*id:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"\s*,\s*interest_id:\s*"([^"]+)"\s*\}/g;
  const out = [];
  let m;
  while ((m = re.exec(txt))) {
    out.push({ slug: m[1], label: m[2], interestId: m[3] });
  }

  if (out.length === 0) {
    throw new Error(
      `Could not parse Sayso subcategories from ${subcategoriesPath}. Expected FALLBACK_SUBCATEGORIES entries.`
    );
  }

  const seen = new Set();
  const uniq = [];
  for (const s of out) {
    if (seen.has(s.slug)) continue;
    seen.add(s.slug);
    uniq.push(s);
  }
  return uniq;
}

async function loadFsqCategoryMapFromDb() {
  const { data, error } = await supabase
    .from('fsq_category_map')
    .select('fsq_category_id, fsq_category_name, sayso_subcategory_slug, sayso_category_slug');

  if (error) {
    throw new Error(
      [
        'Failed to load public.fsq_category_map.',
        'Create the table via the migration and populate it (CSV/SQL from discovery mode).',
        `Details: ${error.message}`,
      ].join(' ')
    );
  }

  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => ({
    fsq_category_id: String(r.fsq_category_id),
    fsq_category_name: r.fsq_category_name ?? null,
    sayso_subcategory_slug: String(r.sayso_subcategory_slug),
    sayso_category_slug: r.sayso_category_slug ?? null,
  }));
}

function buildFsqMappingFromRows({ rows, canonicalSlugs, slugToInterestId }) {
  const fsqIdToRow = new Map();
  const slugToFsqIds = new Map();

  for (const r of rows) {
    const fsqId = String(r?.fsq_category_id || '').trim();
    const slug = String(r?.sayso_subcategory_slug || '').trim();
    if (!fsqId || !slug) continue;
    if (!canonicalSlugs.has(slug)) continue;

    const saysoCategorySlug = r.sayso_category_slug ?? slugToInterestId.get(slug) ?? null;

    fsqIdToRow.set(fsqId, {
      fsqCategoryId: fsqId,
      fsqCategoryName: r.fsq_category_name ?? null,
      saysoSubcategorySlug: slug,
      saysoCategorySlug,
    });

    const list = slugToFsqIds.get(slug) || [];
    list.push(fsqId);
    slugToFsqIds.set(slug, list);
  }

  for (const [slug, ids] of slugToFsqIds.entries()) {
    slugToFsqIds.set(slug, [...new Set(ids)]);
  }

  const totalIds = [...slugToFsqIds.values()].reduce((acc, arr) => acc + arr.length, 0);
  if (totalIds === 0) {
    throw new Error(
      [
        'fsq_category_map has 0 usable IDs for canonical Sayso slugs.',
        'Run discovery and populate public.fsq_category_map first.',
      ].join(' ')
    );
  }

  return { fsqIdToRow, slugToFsqIds };
}

function buildFsqMappingFromFile({ mappingBySlug, canonicalSlugs, slugToInterestId }) {
  const rows = [];
  for (const [slug, ids] of Object.entries(mappingBySlug || {})) {
    if (!canonicalSlugs.has(slug)) continue;
    if (!Array.isArray(ids)) continue;
    for (const id of ids) {
      if (id == null) continue;
      const fsqId = String(id).trim();
      if (!fsqId) continue;
      rows.push({
        fsq_category_id: fsqId,
        fsq_category_name: null,
        sayso_subcategory_slug: slug,
        sayso_category_slug: slugToInterestId.get(slug) ?? null,
      });
    }
  }
  return buildFsqMappingFromRows({ rows, canonicalSlugs, slugToInterestId });
}

function getNextCursor(json) {
  return (
    json?.context?.next_cursor ||
    json?.context?.nextCursor ||
    json?.context?.cursor?.next ||
    json?.next_cursor ||
    json?.nextCursor ||
    null
  );
}

function extractPlaces(json) {
  const places = json?.results || json?.data?.results || json?.places || json?.data || null;
  if (!Array.isArray(places)) return [];
  return places;
}

function resolveSaysoFromPlace(place, fsqIdToRow) {
  const cats = Array.isArray(place?.categories) ? place.categories : [];
  for (const c of cats) {
    const idRaw = c?.id ?? c?.category_id ?? c?.fsq_category_id ?? c?.fsqCategoryId ?? null;
    if (idRaw == null) continue;
    const id = String(idRaw).trim();
    if (!id) continue;
    const row = fsqIdToRow.get(id);
    if (!row) continue;
    const name = c?.name ?? c?.short_name ?? c?.shortName ?? null;
    return {
      saysoSubcategorySlug: row.saysoSubcategorySlug,
      saysoCategorySlug: row.saysoCategorySlug,
      fsqCategoryId: row.fsqCategoryId,
      fsqCategoryName: name || row.fsqCategoryName || null,
    };
  }
  return null;
}

function getNextFromHeaders(headers) {
  if (!headers) return { nextUrl: null, nextCursor: null };

  const get = (k) => headers.get(k) || headers.get(k.toLowerCase());

  const directCursor =
    get('x-next-cursor') ||
    get('next-cursor') ||
    get('x-fsq-next-cursor') ||
    get('x-pagination-next-cursor') ||
    null;
  if (directCursor) return { nextUrl: null, nextCursor: directCursor };

  const link = get('link');
  if (link && typeof link === 'string') {
    // Parse: <url>; rel="next"
    const parts = link.split(',').map((s) => s.trim());
    for (const part of parts) {
      const m = part.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
      if (m && m[1]) return { nextUrl: m[1], nextCursor: null };
    }
  }

  return { nextUrl: null, nextCursor: null };
}

function isNoCredits429(err) {
  const status = err?.status ?? null;
  if (status !== 429) return false;
  const msg = String(err?.message || '');
  const body = err?.body ? JSON.stringify(err.body) : '';
  return /no api credits remaining/i.test(msg) || /no api credits remaining/i.test(body);
}

async function fetchPlacesByCategories({
  categoriesCsv,
  cursor,
  offset,
  nextUrl,
  logUrl,
  forceMinimalProFields = false,
}) {
  const url = nextUrl ? new URL(nextUrl) : new URL('/places/search', FSQ_BASE_URL);

  // Always enforce Pro-tier safe fields, even when following pagination next URLs.
  url.searchParams.set('fields', FSQ_PRO_FIELDS_CSV);
  logFsqFields(FSQ_PRO_FIELDS_CSV);

  if (!nextUrl) {
    url.searchParams.set('ll', CAPE_TOWN_LL);
    url.searchParams.set('radius', String(CAPE_TOWN_RADIUS_M));
    url.searchParams.set('limit', String(LIMIT_PER_PAGE));
    url.searchParams.set('categories', String(categoriesCsv));

    if (cursor) url.searchParams.set('cursor', String(cursor));
    if (!cursor && Number.isFinite(offset) && offset > 0) url.searchParams.set('offset', String(offset));
  }

  if (logUrl) console.log(`[FSQ] ${url.toString()}`);

  let res;
  try {
    res = await fetchJsonWithRetry(url.toString(), { headers: fsqHeaders() });
  } catch (err) {
    if (isNoCredits429(err)) {
      console.log('[FSQ] Premium field detected or credit issue. Retrying with minimal Pro fields.');

      // Retry once with enforced minimal Pro fields (even if already minimal).
      if (!forceMinimalProFields) {
        return fetchPlacesByCategories({
          categoriesCsv,
          cursor,
          offset,
          nextUrl,
          logUrl,
          forceMinimalProFields: true,
        });
      }
    }
    throw err;
  }
  const json = res?.json;

  const nextCursorFromBody = getNextCursor(json);
  const nextFromHeaders = getNextFromHeaders(res?.headers);
  const nextCursor = nextCursorFromBody || nextFromHeaders.nextCursor || null;
  const nextUrlOut = nextFromHeaders.nextUrl || null;

  return { places: extractPlaces(json), nextCursor, nextUrl: nextUrlOut };
}

function chooseConflictTargets(columnIndex) {
  const targets = [];

  if (columnIndex.has('source') && columnIndex.has('source_id')) targets.push('source,source_id');
  if (columnIndex.has('source') && columnIndex.has('source_place_id')) targets.push('source,source_place_id');

  const singleCandidates = ['source_place_id', 'fsq_place_id', 'external_id', 'source_id', 'slug'];
  for (const c of singleCandidates) {
    if (columnIndex.has(c)) targets.push(c);
  }

  return [...new Set(targets)];
}

function isNoUniqueConstraintError(err) {
  const code = String(err?.code || '');
  const msg = String(err?.message || '');
  const details = String(err?.details || '');
  const hint = String(err?.hint || '');
  const combined = `${msg} ${details} ${hint}`.toLowerCase();

  // Postgres: 42P10 = invalid_column_reference, commonly returned when ON CONFLICT targets no unique index/constraint.
  if (code === '42p10') return true;

  return (
    combined.includes('there is no unique or exclusion constraint') ||
    combined.includes('no unique constraint') ||
    combined.includes('no unique or exclusion constraint') ||
    combined.includes('could not find the relation') ||
    combined.includes('invalid input syntax') ||
    combined.includes('on_conflict') // Supabase/PostgREST phrasing
  );
}

async function writeBatch({ rows, conflictTarget, externalIdCol }) {
  if (rows.length === 0) return { written: 0, skipped: 0 };
  if (DRY_RUN) return { written: rows.length, skipped: 0 };

  if (conflictTarget) {
    const attempt = await supabase.from('businesses').upsert(rows, { onConflict: conflictTarget });
    if (!attempt.error) return { written: rows.length, skipped: 0 };

    if (isNoUniqueConstraintError(attempt.error)) {
      return { written: 0, skipped: 0, retryWithNextConflictTarget: true, error: attempt.error };
    }

    return { written: 0, skipped: rows.length, error: attempt.error };
  }

  if (externalIdCol) {
    const ids = rows.map((r) => r[externalIdCol]).filter(Boolean);
    const uniqueIds = [...new Set(ids)];
    const existingSet = new Set();

    if (uniqueIds.length > 0) {
      const { data, error } = await supabase
        .from('businesses')
        .select(externalIdCol)
        .in(externalIdCol, uniqueIds);
      if (!error && Array.isArray(data)) {
        for (const r of data) {
          if (r && r[externalIdCol]) existingSet.add(r[externalIdCol]);
        }
      }
    }

    const toInsert = rows.filter((r) => {
      const id = r[externalIdCol];
      return id ? !existingSet.has(id) : true;
    });

    if (toInsert.length === 0) return { written: 0, skipped: rows.length };

    const ins = await supabase.from('businesses').insert(toInsert);
    if (!ins.error) return { written: toInsert.length, skipped: rows.length - toInsert.length };
    return { written: 0, skipped: rows.length, error: ins.error };
  }

  const ins = await supabase.from('businesses').insert(rows);
  if (!ins.error) return { written: rows.length, skipped: 0 };
  return { written: 0, skipped: rows.length, error: ins.error };
}

async function discoverFsqCategoriesForSaysoSubcategories({ saysoSubcategories }) {
  if (!DISCOVER_JSON_ONLY) {
    console.log('[Discover] Scanning FSQ category IDs from /places/search using query=Sayso label...');
    console.log(
      `[Discover] ll=${CAPE_TOWN_LL} radius=${CAPE_TOWN_RADIUS_M} pages=${DISCOVER_MAX_PAGES} limit=${DISCOVER_LIMIT_PER_PAGE} mode=${DISCOVER_COUNT_MODE}`
    );
  }

  const discoveryQueriesBySlug = {
    restaurants: ['restaurant', 'dinner', 'lunch'],
    cafes: ['cafe', 'coffee'],
    bars: ['bar', 'pub'],
    'fast-food': ['fast food', 'takeaway'],
    'fine-dining': ['fine dining', 'restaurant'],

    gyms: ['gym', 'fitness'],
    spas: ['spa', 'massage'],
    salons: ['hair salon', 'salon'],
    wellness: ['wellness', 'yoga'],
    'nail-salons': ['nail salon', 'nails'],

    'education-learning': ['school', 'library'],
    'transport-travel': ['travel', 'car rental'],
    'finance-insurance': ['bank', 'insurance'],
    plumbers: ['plumber'],
    electricians: ['electrician'],
    'legal-services': ['lawyer'],

    hiking: ['hiking', 'trail'],
    cycling: ['cycling', 'bike'],
    'water-sports': ['water sports', 'surf'],
    camping: ['camping', 'camp site'],

    'events-festivals': ['festival', 'event'],
    'sports-recreation': ['sports', 'stadium'],
    nightlife: ['nightlife', 'club'],
    'comedy-clubs': ['comedy', 'comedy club'],
    cinemas: ['cinema', 'movie theater'],

    museums: ['museum'],
    galleries: ['art gallery', 'gallery'],
    theaters: ['theatre', 'theater'],
    concerts: ['concert', 'live music'],

    'family-activities': ['family', 'kids'],
    'pet-services': ['pet', 'pet store'],
    childcare: ['childcare', 'daycare'],
    veterinarians: ['veterinarian', 'vet'],

    fashion: ['clothing', 'fashion'],
    electronics: ['electronics', 'mobile phone'],
    'home-decor': ['home decor', 'furniture'],
    books: ['bookstore', 'books'],

    miscellaneous: ['business'],
  };

  const perSlug = new Map(); // slug -> Map(fsqCategoryId -> { name, count })
  const globalCounts = new Map(); // fsqCategoryId -> { name, count }

  for (const subcat of saysoSubcategories) {
    if (ONLY_SUBCATEGORIES && !ONLY_SUBCATEGORIES.has(subcat.slug)) continue;

    const slugCounts = new Map();
    perSlug.set(subcat.slug, slugCounts);

    const queries = discoveryQueriesBySlug[subcat.slug] || [subcat.label];
    for (const q of queries) {
      let offset = 0;
      let cursor = null;
      let nextUrl = null;

      for (let p = 1; p <= DISCOVER_MAX_PAGES; p += 1) {
        const url = nextUrl ? new URL(nextUrl) : new URL('/places/search', FSQ_BASE_URL);
        const fieldsCsv = ['fsq_place_id', 'name', 'categories'].join(',');
        url.searchParams.set('fields', fieldsCsv);
        logFsqFields(fieldsCsv);

        if (!nextUrl) {
          url.searchParams.set('ll', CAPE_TOWN_LL);
          url.searchParams.set('radius', String(CAPE_TOWN_RADIUS_M));
          url.searchParams.set('limit', String(DISCOVER_LIMIT_PER_PAGE));
          url.searchParams.set('query', q);
          if (cursor) url.searchParams.set('cursor', String(cursor));
          if (!cursor && Number.isFinite(offset) && offset > 0) {
            url.searchParams.set('offset', String(offset));
          }
        }

        if (LOG_FSQ_URLS) console.log(`[FSQ] ${url.toString()}`);
        const res = await fetchJsonWithRetry(url.toString(), { headers: fsqHeaders() });
        const json = res?.json;
        const places = extractPlaces(json);

        for (const place of places) {
          const cats = Array.isArray(place?.categories) ? place.categories : [];
          const catsToCount = DISCOVER_COUNT_MODE === 'all' ? cats : cats.slice(0, 1);
          for (const c of catsToCount) {
            const idRaw = c?.id ?? c?.category_id ?? c?.fsq_category_id ?? c?.fsqCategoryId ?? null;
            if (idRaw == null) continue;
            const id = String(idRaw).trim();
            if (!id) continue;
            const name = c?.name ?? c?.short_name ?? c?.shortName ?? null;

            const prev = slugCounts.get(id) || { name: name || null, count: 0 };
            slugCounts.set(id, { name: prev.name || name || null, count: prev.count + 1 });

            const gprev = globalCounts.get(id) || { name: name || null, count: 0 };
            globalCounts.set(id, { name: gprev.name || name || null, count: gprev.count + 1 });
          }
        }

        const nextCursorFromBody = getNextCursor(json);
        const nextFromHeaders = getNextFromHeaders(res?.headers);
        cursor = nextCursorFromBody || nextFromHeaders.nextCursor || null;
        nextUrl = nextFromHeaders.nextUrl || null;
        if (!cursor) offset += DISCOVER_LIMIT_PER_PAGE;

        await sleep(PAGE_DELAY_MS);

        if (places.length === 0) break;
        if (!nextUrl && !cursor && places.length < DISCOVER_LIMIT_PER_PAGE) break;
      }
    }

    if (!DISCOVER_JSON_ONLY) console.log(`[Discover] ${subcat.slug}: found ${slugCounts.size} category IDs`);
    await sleep(CATEGORY_DELAY_MS);
  }

  const sortCounts = (m) =>
    [...m.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([id, v]) => ({ id, name: v.name, count: v.count }));

  const output = {
    ll: CAPE_TOWN_LL,
    radius: CAPE_TOWN_RADIUS_M,
    pages: DISCOVER_MAX_PAGES,
    limit: DISCOVER_LIMIT_PER_PAGE,
    mode: DISCOVER_COUNT_MODE,
    per_subcategory: Object.fromEntries(
      [...perSlug.entries()].map(([slug, m]) => [slug, sortCounts(m)])
    ),
    global: sortCounts(globalCounts),
  };

  const nowIso = new Date().toISOString();
  const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

  // Build suggested unique mapping: fsq_category_id -> best sayso slug by count
  const bestById = new Map(); // id -> { slug, name, count }
  for (const [slug, m] of perSlug.entries()) {
    for (const [id, v] of m.entries()) {
      const curr = bestById.get(id);
      if (!curr || v.count > curr.count) {
        bestById.set(id, { slug, name: v.name || null, count: v.count });
      }
    }
  }

  const suggestedRows = [...bestById.entries()]
    .map(([id, v]) => ({
      fsq_category_id: id,
      fsq_category_name: v.name,
      sayso_subcategory_slug: v.slug,
      sayso_category_slug: null,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count);

  const discoveryRows = [];
  for (const [slug, m] of perSlug.entries()) {
    for (const [id, v] of m.entries()) {
      discoveryRows.push({
        sayso_subcategory_slug: slug,
        fsq_category_id: id,
        fsq_category_name: v.name,
        count: v.count,
      });
    }
  }
  discoveryRows.sort((a, b) => (a.sayso_subcategory_slug > b.sayso_subcategory_slug ? 1 : -1) || (b.count - a.count));

  const discoveryCsvPath = path.join(scriptsDir, '_fsq_category_discovery.csv');
  const suggestedCsvPath = path.join(scriptsDir, '_fsq_category_map_suggested.csv');
  const suggestedSqlPath = path.join(scriptsDir, '_fsq_category_map_suggested.sql');

  await fs.writeFile(
    discoveryCsvPath,
    toCsv(discoveryRows, ['sayso_subcategory_slug', 'fsq_category_id', 'fsq_category_name', 'count']),
    'utf8'
  );
  await fs.writeFile(
    suggestedCsvPath,
    toCsv(suggestedRows, ['fsq_category_id', 'fsq_category_name', 'sayso_subcategory_slug', 'sayso_category_slug', 'count']),
    'utf8'
  );

  const upsertsSql = suggestedRows
    .map((r) => {
      const id = r.fsq_category_id.replace(/'/g, "''");
      const name = (r.fsq_category_name || '').replace(/'/g, "''");
      const slug = r.sayso_subcategory_slug.replace(/'/g, "''");
      return `insert into public.fsq_category_map (fsq_category_id, fsq_category_name, sayso_subcategory_slug, updated_at)\nvalues ('${id}', ${name ? `'${name}'` : 'null'}, '${slug}', now())\non conflict (fsq_category_id) do update set\n  fsq_category_name = excluded.fsq_category_name,\n  sayso_subcategory_slug = excluded.sayso_subcategory_slug,\n  updated_at = now();`;
    })
    .join('\n\n');
  await fs.writeFile(suggestedSqlPath, `-- generated_at: ${nowIso}\n\n${upsertsSql}\n`, 'utf8');

  // Auto-populate local JSON map file for convenience (slug -> top N ids)
  const bySlug = new Map();
  for (const r of suggestedRows) {
    const list = bySlug.get(r.sayso_subcategory_slug) || [];
    list.push(r.fsq_category_id);
    bySlug.set(r.sayso_subcategory_slug, list);
  }
  const mapJson = {
    version: 2,
    generated_at: nowIso,
    source: {
      ll: CAPE_TOWN_LL,
      radius: CAPE_TOWN_RADIUS_M,
      pages: DISCOVER_MAX_PAGES,
      limit: DISCOVER_LIMIT_PER_PAGE,
      mode: DISCOVER_COUNT_MODE,
    },
    subcategories: Object.fromEntries(
      [...perSlug.keys()].map((slug) => [slug, (bySlug.get(slug) || []).slice(0, MAP_FILE_MAX_IDS_PER_SLUG)])
    ),
  };
  await fs.writeFile(FSQ_TO_SAYSO_MAP_FILE, JSON.stringify(mapJson, null, 2) + '\n', 'utf8');

  if (!DISCOVER_JSON_ONLY) {
    console.log(`[Discover] Wrote ${discoveryCsvPath}`);
    console.log(`[Discover] Wrote ${suggestedCsvPath}`);
    console.log(`[Discover] Wrote ${suggestedSqlPath}`);
    console.log(`[Discover] Updated ${FSQ_TO_SAYSO_MAP_FILE}`);
  }

  console.log(JSON.stringify(output, null, 2));
}

async function main() {
  console.log(
    `[Config] limitPerPage=${LIMIT_PER_PAGE} maxPerSlug=${MAX_PER_CATEGORY} maxPages=${MAX_PAGES} radiusM=${CAPE_TOWN_RADIUS_M} ll=${CAPE_TOWN_LL}`
  );

  const dbColumns = await fetchBusinessesColumns();
  const columnIndex = buildColumnIndex(dbColumns);

  const externalIdCol = columnIndex.firstExisting(['source_place_id', 'fsq_place_id', 'external_id', 'source_id']);
  const conflictTargets = chooseConflictTargets(columnIndex);
  let conflictTargetIndex = conflictTargets.length > 0 ? 0 : -1;
  let activeConflictTarget = conflictTargetIndex >= 0 ? conflictTargets[conflictTargetIndex] : null;
  console.log(
    `[Config] externalIdCol=${externalIdCol || 'none'} conflictTargets=${conflictTargets.length ? conflictTargets.join('|') : 'none'}`
  );

  const saysoSubcategoriesAll = await loadSaysoSubcategoriesFromRepo();
  const saysoSubcategories = ONLY_SUBCATEGORIES
    ? saysoSubcategoriesAll.filter((s) => ONLY_SUBCATEGORIES.has(s.slug))
    : saysoSubcategoriesAll;

  if (DISCOVER_FSQ_CATEGORIES) {
    await discoverFsqCategoriesForSaysoSubcategories({ saysoSubcategories });
    return;
  }

  const canonicalSlugs = new Set(saysoSubcategories.map((s) => s.slug));
  const slugToInterestId = new Map(saysoSubcategories.map((s) => [s.slug, s.interestId]));
  let fsqIdToRow;
  let slugToFsqIds;
  try {
    const fsqMapRows = await loadFsqCategoryMapFromDb();
    ({ fsqIdToRow, slugToFsqIds } = buildFsqMappingFromRows({
      rows: fsqMapRows,
      canonicalSlugs,
      slugToInterestId,
    }));
  } catch (e) {
    const msg = String(e?.message || e);
    if (!DISCOVER_JSON_ONLY) {
      console.warn('[Seed] Falling back to local mapping file (fsq_category_map unavailable).');
      console.warn('[Seed] Reason:', msg);
    }
    const mappingBySlug = await loadFsqCategoryMapFromFile();
    ({ fsqIdToRow, slugToFsqIds } = buildFsqMappingFromFile({
      mappingBySlug,
      canonicalSlugs,
      slugToInterestId,
    }));
  }
  const seenFsqIdsGlobal = new Set(); // for stats/logging only (do not block per-category collection)

  let totalFetched = 0;
  let totalUniqueGlobal = 0;
  let totalWritten = 0;
  let totalSkipped = 0;
  let subcategoriesSeeded = 0;

  for (const subcat of saysoSubcategories) {
    const fsqIds = slugToFsqIds.get(subcat.slug) || [];
    if (fsqIds.length === 0) {
      console.log(`\n[Subcategory] ${subcat.slug} - ${subcat.label} (skip: no mapped FSQ category IDs)`);
      continue;
    }

    const categoriesCsv = fsqIds.join(',');
    console.log(
      `\n[Subcategory] ${subcat.slug} - ${subcat.label} (interest=${subcat.interestId}) fsqCategoryIds=${fsqIds.length}`
    );
    subcategoriesSeeded += 1;

    const seenFsqIdsInCategory = new Set(); // block duplicates only within this category

    let cursor = null;
    let offset = 0;
    let nextUrl = null;
    let page = 0;
    let uniqueForCategory = 0;
    let consecutiveNoInsertablePages = 0;

    while (page < MAX_PAGES && uniqueForCategory < MAX_PER_CATEGORY) {
      page += 1;

      const { places, nextCursor, nextUrl: nextUrlFromHeaders } = await fetchPlacesByCategories({
        categoriesCsv,
        cursor,
        offset,
        nextUrl,
        logUrl: LOG_FSQ_URLS,
      });

      totalFetched += places.length;

      let rawUniqueThisPage = 0;
      let acceptedUniqueThisPage = 0;
      let insertableThisPage = 0;
      const mappedRows = [];

      for (const place of places) {
        const fsqId = place?.fsq_place_id || place?.fsqPlaceId || place?.fsq_id || null;
        if (!isFoursquareId(fsqId)) continue;

        // Per-category dedupe (do not block across categories)
        if (seenFsqIdsInCategory.has(fsqId)) continue;
        seenFsqIdsInCategory.add(fsqId);
        rawUniqueThisPage += 1;

        const resolved = resolveSaysoFromPlace(place, fsqIdToRow);
        const resolvedSlug = resolved?.saysoSubcategorySlug || 'miscellaneous';

        if (resolvedSlug !== subcat.slug) {
          // We seed by Sayso slug; only accept places whose primary mapped slug matches this subcategory.
          continue;
        }

        // Global stats (not blocking)
        if (!seenFsqIdsGlobal.has(fsqId)) {
          seenFsqIdsGlobal.add(fsqId);
          totalUniqueGlobal += 1;
        }

        acceptedUniqueThisPage += 1;
        uniqueForCategory += 1;

        const row = mapPlaceToBusinessRow(
          place,
          {
            saysoSubcategorySlug: resolvedSlug,
            saysoSubcategoryLabel: subcat.label,
            saysoInterestId: resolved?.saysoCategorySlug ?? subcat.interestId,
            matchedFsqCategoryId: resolved?.fsqCategoryId ?? null,
            matchedFsqCategoryName: resolved?.fsqCategoryName ?? null,
          },
          columnIndex
        );
        const validation = validateRowAgainstSchema(row, dbColumns);
        if (!validation.ok) {
          totalSkipped += 1;
          console.log(`[Skip] ${fsqId} - ${validation.reasons.join('; ')}`);
          continue;
        }

        insertableThisPage += 1;
        mappedRows.push(row);
      }

      console.log(
        `[Page ${page}] fetched=${places.length} rawUnique=${rawUniqueThisPage} acceptedUnique=${acceptedUniqueThisPage} insertable=${insertableThisPage} uniqueForCategory=${uniqueForCategory}`
      );

      if (mappedRows.length > 0) {
        const batches = chunkArray(mappedRows, 100);
        let writtenThisPage = 0;
        let skippedThisPage = 0;

        for (const batch of batches) {
          // Try detected conflict targets in order; fall back to manual insert/dedupe if none work.
          let res;
          // eslint-disable-next-line no-constant-condition
          while (true) {
            res = await writeBatch({
              rows: batch,
              conflictTarget: activeConflictTarget,
              externalIdCol,
            });

            if (!res?.retryWithNextConflictTarget) break;

            const prev = activeConflictTarget || 'none';
            conflictTargetIndex += 1;
            activeConflictTarget =
              conflictTargetIndex >= 0 && conflictTargetIndex < conflictTargets.length
                ? conflictTargets[conflictTargetIndex]
                : null;
            const next = activeConflictTarget || 'manual-dedupe';
            console.log(
              `[DB] conflictTarget "${prev}" not usable (${String(res?.error?.message || res?.error || '')}). Trying "${next}".`
            );
          }

          if (res.error) {
            skippedThisPage += batch.length;
            console.log(`[DB Error] ${String(res.error.message || res.error)}`);
          } else {
            writtenThisPage += res.written;
            skippedThisPage += res.skipped;
          }
        }

        totalWritten += writtenThisPage;
        totalSkipped += skippedThisPage;
        console.log(`[Write] written=${writtenThisPage} skipped=${skippedThisPage}`);
      }

      if (rawUniqueThisPage === 0) {
        console.log('[Stop] No new unique place IDs found; stopping early for this subcategory.');
        break;
      }

      if (insertableThisPage === 0) {
        consecutiveNoInsertablePages += 1;
        if (consecutiveNoInsertablePages >= 2) {
          console.log('[Stop] No insertable rows for 2 pages; stopping early for this category.');
          break;
        }
      } else {
        consecutiveNoInsertablePages = 0;
      }

      if (places.length === 0) break;

      cursor = nextCursor || null;
      nextUrl = nextUrlFromHeaders || null;
      if (!cursor) offset += LIMIT_PER_PAGE;

      if (nextUrl || cursor || places.length === LIMIT_PER_PAGE) {
        await sleep(PAGE_DELAY_MS);
        continue;
      }

      break;
    }

    await sleep(CATEGORY_DELAY_MS);
  }

  console.log('\n=== Summary ===');
  console.log(`dryRun=${DRY_RUN}`);
  console.log(`subcategoriesTotal=${saysoSubcategories.length}`);
  console.log(`subcategoriesSeeded=${subcategoriesSeeded}`);
  console.log(`fetched=${totalFetched}`);
  console.log(`uniqueGlobal=${totalUniqueGlobal}`);
  console.log(`written=${totalWritten}`);
  console.log(`skipped=${totalSkipped}`);
  console.log(`conflictTarget=${activeConflictTarget || 'none'}`);
}

await main();
