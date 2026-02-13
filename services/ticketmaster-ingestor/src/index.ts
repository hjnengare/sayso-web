import * as dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import cron from "node-cron";
import { fetchAndProcessAll, type FetchConfig } from "./ticketmaster.js";
import {
  createSupabaseClient,
  cleanupOldEvents,
  resolveCreatedByUserId,
  upsertEvents,
} from "./db.js";
import { log } from "./utils.js";

// ---------------------------------------------------------------------------
// Config from env
// ---------------------------------------------------------------------------

// Always resolve .env relative to the service root (one level up from src/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

interface AppConfig extends Omit<FetchConfig, "systemUserId"> {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  preferredSystemUserId: string;
  runOnStart: boolean;
}

function isTicketmasterIngestEnabled(): boolean {
  const raw = process.env.ENABLE_TICKETMASTER_INGEST;
  if (!raw || !raw.trim()) return true;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

function loadConfig(): AppConfig {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const systemBusinessId = process.env.SYSTEM_BUSINESS_ID;
  const preferredSystemUserId = process.env.SYSTEM_USER_ID;

  if (!apiKey) throw new Error("Missing TICKETMASTER_API_KEY");
  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  if (!systemBusinessId) throw new Error("Missing SYSTEM_BUSINESS_ID");
  if (!preferredSystemUserId) throw new Error("Missing SYSTEM_USER_ID");

  const cities = (process.env.CITIES || "Cape Town")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return {
    apiKey,
    supabaseUrl,
    supabaseServiceRoleKey,
    systemBusinessId,
    preferredSystemUserId,
    cities,
    fetchWindowDays: 120,
    pageSize: Math.min(Math.max(parseInt(process.env.PAGE_SIZE || "100", 10), 20), 200),
    runOnStart: process.env.RUN_ON_START === "true",
  };
}

// ---------------------------------------------------------------------------
// The ingest job
// ---------------------------------------------------------------------------

let isRunning = false;

async function runIngest(config: AppConfig): Promise<void> {
  if (isRunning) {
    log.warn("Previous ingest still running. Skipping this cycle.");
    return;
  }

  isRunning = true;
  const start = Date.now();

  log.info("=== Ticketmaster ingest starting ===");
  log.info(`Cities: ${config.cities.join(", ")}`);

  const supabase = createSupabaseClient(config.supabaseUrl, config.supabaseServiceRoleKey);

  try {
    // 1. Test connectivity
    log.info("Testing Supabase connection...");
    const { error: testErr } = await supabase.from("events_and_specials").select("id").limit(1);
    if (testErr) throw new Error(`Supabase connection test failed: ${testErr.message}`);
    log.info("Supabase connected.");

    // 2. Cleanup old events
    await cleanupOldEvents(supabase);

    // 3. Resolve created_by user and fetch/map/consolidate
    const resolvedCreatedBy = await resolveCreatedByUserId(
      supabase,
      config.systemBusinessId,
      config.preferredSystemUserId
    );

    log.info(`Using created_by user id: ${resolvedCreatedBy}`);

    const result = await fetchAndProcessAll({
      ...config,
      systemUserId: resolvedCreatedBy,
    });

    log.info(
      `Fetch complete: ${result.fetchedCount} fetched, ${result.mappedCount} mapped, ${result.consolidatedCount} consolidated.`
    );

    if (result.rows.length === 0) {
      log.info("[Ingest] Ticketmaster ingest complete:", {
        source: "ticketmaster",
        fetched: result.fetchedCount,
        mapped: result.mappedCount,
        consolidated: result.consolidatedCount,
        inserted: 0,
        updated: 0,
        failed: 0,
        created_by: resolvedCreatedBy,
      });
      return;
    }

    // 4. Upsert into DB
    const dbResult = await upsertEvents(supabase, result.rows);

    const ingestMetrics = {
      source: "ticketmaster",
      fetched: result.fetchedCount,
      mapped: result.mappedCount,
      consolidated: result.consolidatedCount,
      inserted: dbResult.inserted,
      updated: dbResult.updated,
      failed: dbResult.failed,
      created_by: resolvedCreatedBy,
    };

    if (dbResult.batchFailures.length > 0) {
      log.error("[Ingest] Ticketmaster upsert failed with batch errors:", ingestMetrics);
      log.error("[Ingest] Ticketmaster batch failure details:", dbResult.batchFailures);
      throw new Error(`Ticketmaster upsert failed with ${dbResult.batchFailures.length} batch error(s).`);
    }

    log.info("[Ingest] Ticketmaster ingest complete:", ingestMetrics);
  } catch (err) {
    log.error(`Ingest failed: ${err}`);
    if (err instanceof Error && err.stack) {
      log.error(err.stack);
    }
  } finally {
    isRunning = false;

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log.info(`=== Ingest complete in ${elapsed}s ===\n`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!isTicketmasterIngestEnabled()) {
    log.warn("Ticketmaster ingest disabled via ENABLE_TICKETMASTER_INGEST.");
    return;
  }

  const config = loadConfig();

  log.info("Ticketmaster Ingestor started.");
  log.info(`Schedule: every 6 hours (0 */6 * * *)`);
  log.info(`Cities: ${config.cities.join(", ")}`);
  log.info(`Fetch window: ${config.fetchWindowDays} days`);
  log.info(`Page size: ${config.pageSize}`);

  // Schedule the cron job
  cron.schedule("0 */6 * * *", () => {
    runIngest(config).catch((err) => log.error(`Cron job error: ${err}`));
  });

  // Optional immediate run on startup
  if (config.runOnStart) {
    log.info("RUN_ON_START=true — running immediate ingest...");
    await runIngest(config);
  } else {
    log.info("Waiting for next scheduled run. Set RUN_ON_START=true for immediate execution.");
  }
}

main().catch((err) => {
  log.error(`Fatal: ${err}`);
  process.exit(1);
});
