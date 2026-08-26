/**
 * Copies the JSON data store to a timestamped folder under backups/.
 *
 * Deliberately additive: it only ever reads data/ and writes a new folder.
 * There is no restore command on purpose - restoring is a manual copy, so no
 * script can overwrite live data by accident. See README for the procedure.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const BACKUP_ROOT = path.join(process.cwd(), "backups");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/** 2026-08-25T22-41-07 - filesystem safe and sorts chronologically. */
function stamp() {
  return new Date().toISOString().replace(/\..+$/, "").replace(/:/g, "-");
}

async function main() {
  if (!existsSync(DATA_DIR)) {
    console.error(`No data directory at ${DATA_DIR} - nothing to back up.`);
    process.exitCode = 1;
    return;
  }

  const files = (await readdir(DATA_DIR)).filter((name) => name.endsWith(".json")).sort();

  if (files.length === 0) {
    console.error("No .json files in data/ - nothing to back up.");
    process.exitCode = 1;
    return;
  }

  const target = path.join(BACKUP_ROOT, stamp());
  await mkdir(target, { recursive: true });

  const manifest = [];

  for (const name of files) {
    const source = path.join(DATA_DIR, name);
    const contents = await readFile(source);
    const digest = sha256(contents);

    await copyFile(source, path.join(target, name));

    // Verify the copy rather than assuming it succeeded.
    const copied = await readFile(path.join(target, name));
    if (sha256(copied) !== digest) {
      throw new Error(`Verification failed for ${name}: copy does not match source.`);
    }

    manifest.push({ file: name, bytes: contents.length, sha256: digest });
    console.log(`  ${name.padEnd(18)} ${String(contents.length).padStart(7)} bytes  ${digest.slice(0, 16)}`);
  }

  await writeFile(
    path.join(target, "MANIFEST.json"),
    `${JSON.stringify({ createdAt: new Date().toISOString(), files: manifest }, null, 2)}\n`,
    "utf8",
  );

  console.log(`\nBacked up ${files.length} files to ${path.relative(process.cwd(), target)}`);
  console.log("Every copy was verified against its SHA-256 checksum.");
}

main().catch((error) => {
  console.error("Backup failed:", error.message);
  process.exitCode = 1;
});
