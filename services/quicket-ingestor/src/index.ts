import * as dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import cron from "node-cron";
import { fetchAndProcessAll, type FetchConfig } from "./quicket.js";
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

interface AppConfig extends Omit<FetchConfig, "systemUserId"> {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  preferredSystemUserId?: string;
  runOnStart: boolean;
}

function loadConfig(): AppConfig {
  const apiKey = process.env.QUICKET_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const systemBusinessId = process.env.SYSTEM_BUSINESS_ID;
  const preferredSystemUserId = process.env.SYSTEM_USER_ID;

  if (!apiKey) throw new Error("Missing QUICKET_API_KEY");
  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  if (!systemBusinessId) throw new Error("Missing SYSTEM_BUSINESS_ID");

  const cities = ["Cape Town"];

  return {
    apiKey,
    supabaseUrl,
    supabaseServiceRoleKey,
    systemBusinessId,
    preferredSystemUserId,
    cities,
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

  log.info("=== Quicket ingest starting ===");
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

    // 3. Fetch, filter, map, consolidate
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
      `Fetch complete: ${result.fetchedCount} fetched, ${result.filteredCount} filtered, ${result.mappedCount} mapped, ${result.consolidatedCount} consolidated.`
    );

    if (result.rows.length === 0) {
      log.info("No events to upsert. Done.");
      return;
    }

    // 4. Upsert into DB
    const dbResult = await upsertEvents(supabase, result.rows);

    log.info(
      `DB result: ${dbResult.inserted} inserted, ${dbResult.updated} updated, ${dbResult.skipped} skipped.`
    );
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
  const config = loadConfig();

  log.info("Quicket Ingestor started.");
  log.info(`Schedule: every 6 hours (0 */6 * * *)`);
  log.info(`Cities: ${config.cities.join(", ")}`);
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
