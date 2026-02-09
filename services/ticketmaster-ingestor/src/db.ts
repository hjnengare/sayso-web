import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EventRow } from "./ticketmaster.js";
import { log } from "./utils.js";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export function createSupabaseClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey);
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

/**
 * Upsert rows into events_and_specials using the existing
 * `upsert_events_and_specials_consolidated` RPC function.
 *
 * The function handles:
 *  - INSERT … ON CONFLICT (expression index on title+day+location)
 *  - On conflict: keeps earliest start_date, latest end_date
 *  - Only updates rows with matching business_id (safety)
 *
 * Returns { inserted, updated, skipped }.
 */
export async function upsertEvents(
  supabase: SupabaseClient,
  rows: EventRow[]
): Promise<{ inserted: number; updated: number; skipped: number }> {
  if (rows.length === 0) {
    return { inserted: 0, updated: 0, skipped: 0 };
  }

  let totalInserted = 0;
  let totalUpdated = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    try {
      const { data, error } = await supabase.rpc("upsert_events_and_specials_consolidated", {
        p_rows: batch,
      });

      if (error) {
        log.error(`  Batch ${batchNum} failed: ${error.message}`);
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
      log.error(`  Batch ${batchNum} failed: ${err}`);
    }
  }

  const skipped = rows.length - totalInserted - totalUpdated;

  return {
    inserted: totalInserted,
    updated: totalUpdated,
    skipped: Math.max(0, skipped),
  };
}
