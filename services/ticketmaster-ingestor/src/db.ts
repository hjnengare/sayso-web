import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EventRow } from "./ticketmaster.js";
import { log } from "./utils.js";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export function createSupabaseClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey);
}

async function authUserExists(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    log.warn(`Unable to verify auth user ${userId}: ${error.message}`);
    return false;
  }

  return !!data?.user?.id;
}

export async function resolveCreatedByUserId(
  supabase: SupabaseClient,
  businessId: string,
  preferredUserId?: string
): Promise<string> {
  if (preferredUserId) {
    const validPreferred = await authUserExists(supabase, preferredUserId);
    if (validPreferred) return preferredUserId;
    throw new Error(
      `Configured SYSTEM_USER_ID (${preferredUserId}) was not found in auth.users. Update SYSTEM_USER_ID to a valid auth user id.`
    );
  }

  const { data: business, error: businessErr } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (businessErr) {
    throw new Error(`Unable to load owner_id for business ${businessId}: ${businessErr.message}`);
  }

  const ownerId = business?.owner_id as string | null | undefined;
  if (!ownerId) {
    throw new Error(
      `Business ${businessId} has no owner_id. Set SYSTEM_USER_ID to a valid auth.users.id or assign a business owner.`
    );
  }

  const validOwner = await authUserExists(supabase, ownerId);
  if (!validOwner) {
    throw new Error(
      `Business owner_id ${ownerId} is not present in auth.users. Update businesses.owner_id or set SYSTEM_USER_ID to a valid auth user id.`
    );
  }

  return ownerId;
}

// ---------------------------------------------------------------------------
// Cleanup: delete Ticketmaster events that ended > 14 days ago
// ---------------------------------------------------------------------------

export async function cleanupOldEvents(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("events_and_specials")
    .delete({ count: "exact" })
    .eq("icon", "ticketmaster")
    .eq("type", "event")
    .lt("start_date", cutoff);

  if (error) {
    log.error(`Cleanup failed: ${error.message}`);
    return 0;
  }

  const deleted = count ?? 0;
  if (deleted > 0) {
    log.info(`Cleanup: deleted ${deleted} old Ticketmaster events (ended before ${cutoff.slice(0, 10)}).`);
  }
  return deleted;
}

// ---------------------------------------------------------------------------
// Upsert via the existing DB function
// ---------------------------------------------------------------------------

const BATCH_SIZE = 200;

type BatchFailure = {
  batch: number;
  rows: number;
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
};

/**
 * Upsert rows into events_and_specials using the existing
 * `upsert_events_and_specials_consolidated` RPC function.
 *
 * The function handles:
 *  - INSERT … ON CONFLICT (expression index on title+day+location)
 *  - On conflict: keeps earliest start_date, latest end_date
 *  - Only updates rows with matching business_id (safety)
 *
 * Returns { inserted, updated, failed, batchFailures }.
 */
export async function upsertEvents(
  supabase: SupabaseClient,
  rows: EventRow[]
): Promise<{ inserted: number; updated: number; failed: number; batchFailures: BatchFailure[] }> {
  if (rows.length === 0) {
    return { inserted: 0, updated: 0, failed: 0, batchFailures: [] };
  }

  let totalInserted = 0;
  let totalUpdated = 0;
  const batchFailures: BatchFailure[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    try {
      const { data, error } = await supabase.rpc("upsert_events_and_specials_consolidated", {
        p_rows: batch,
      });

      if (error) {
        const failure: BatchFailure = {
          batch: batchNum,
          rows: batch.length,
          message: error.message,
          code: error.code ?? null,
          details: error.details ?? null,
          hint: error.hint ?? null,
        };
        batchFailures.push(failure);
        log.error(`  Batch ${batchNum} failed:`, failure);
        continue;
      }

      const first = Array.isArray(data) ? data[0] : data;
      const inserted = Number(first?.inserted ?? 0);
      const updated = Number(first?.updated ?? 0);

      totalInserted += inserted;
      totalUpdated += updated;

      log.info(
        `  Batch ${batchNum}: ${inserted} inserted, ${updated} updated (of ${batch.length} rows).`
      );
    } catch (err) {
      const failure: BatchFailure = {
        batch: batchNum,
        rows: batch.length,
        message: err instanceof Error ? err.message : String(err),
        code: null,
        details: null,
        hint: null,
      };
      batchFailures.push(failure);
      log.error(`  Batch ${batchNum} failed:`, failure);
    }
  }

  const failed = rows.length - totalInserted - totalUpdated;

  return {
    inserted: totalInserted,
    updated: totalUpdated,
    failed: Math.max(0, failed),
    batchFailures,
  };
}
