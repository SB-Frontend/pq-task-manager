/**
 * One-off migration: data/*.json  ->  Supabase Postgres.
 *
 * Reads the JSON store and inserts every row, preserving existing ids so all
 * relationships survive. Insert order respects foreign keys.
 *
 * Safe to re-run: rows are upserted by primary key, so a repeat run updates
 * rather than duplicating. It never deletes anything, and never modifies the
 * JSON files - they remain as a fallback.
 *
 *   node --env-file=.env.local scripts/migrate-to-supabase.mjs [--dry-run]
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");
const DATA_DIR = path.join(process.cwd(), "data");

// Ordered so a table's foreign keys already exist when it is inserted.
const TABLES = [
  { file: "users.json", table: "users" },
  { file: "projects.json", table: "projects" },
  { file: "tasks.json", table: "tasks" },
  { file: "work-logs.json", table: "work_logs" },
  { file: "activities.json", table: "activities" },
  { file: "sessions.json", table: "sessions" },
];

const toColumn = (field) => field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function toRow(record) {
  const row = {};
  for (const [field, value] of Object.entries(record)) {
    row[toColumn(field)] = value === undefined ? null : value;
  }
  return row;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Run with: node --env-file=.env.local ${process.argv[1]}`);
    process.exit(1);
  }
  return value;
}

async function readCollection(file) {
  try {
    const parsed = JSON.parse(await readFile(path.join(DATA_DIR, file), "utf8"));
    if (!Array.isArray(parsed)) throw new Error(`${file} is not a JSON array`);
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function main() {
  const supabase = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  console.log(DRY_RUN ? "DRY RUN - nothing will be written\n" : "Migrating data/*.json to Supabase\n");

  let total = 0;

  for (const { file, table } of TABLES) {
    const records = await readCollection(file);

    if (records.length === 0) {
      console.log(`  ${table.padEnd(12)} 0 records - skipped`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  ${table.padEnd(12)} ${String(records.length).padStart(3)} records would be written`);
      total += records.length;
      continue;
    }

    const { error } = await supabase
      .from(table)
      .upsert(records.map(toRow), { onConflict: "id" });

    if (error) {
      console.error(`\nFailed on "${table}": ${error.message}`);
      console.error("Nothing further was written. Fix the cause and re-run.");
      process.exit(1);
    }

    console.log(`  ${table.padEnd(12)} ${String(records.length).padStart(3)} records written`);
    total += records.length;
  }

  if (DRY_RUN) {
    console.log(`\n${total} records would be migrated. Re-run without --dry-run.`);
    return;
  }

  // Verify by counting what is actually in the database.
  console.log("\nVerifying:");
  let mismatch = false;

  for (const { file, table } of TABLES) {
    const expected = (await readCollection(file)).length;
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error(`  ${table.padEnd(12)} could not verify: ${error.message}`);
      mismatch = true;
      continue;
    }

    const ok = count >= expected;
    if (!ok) mismatch = true;
    console.log(`  ${table.padEnd(12)} json ${String(expected).padStart(3)}  db ${String(count).padStart(3)}  ${ok ? "OK" : "MISMATCH"}`);
  }

  console.log(mismatch ? "\nVerification found a mismatch." : "\nMigration complete and verified.");
  if (mismatch) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
