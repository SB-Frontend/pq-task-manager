import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { createId } from "@/lib/storage/ids";
import type { BaseRecord } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");

/**
 * All writes across every collection run one at a time through this chain.
 *
 * A read-modify-write cycle is not atomic on its own, so two overlapping
 * requests could otherwise drop one of the two changes. Serialising them is
 * enough for a single-user application and needs no extra dependency.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation, operation);
  // Keep the chain alive regardless of whether an operation failed.
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function readFile<T>(fileName: string): Promise<T[]> {
  const filePath = path.join(DATA_DIR, fileName);

  try {
    const contents = await fs.readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(contents);

    if (!Array.isArray(parsed)) {
      throw new Error(`${fileName} does not contain a JSON array.`);
    }

    return parsed as T[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // First run: create the file so later reads and writes succeed.
      await writeFile<T>(fileName, []);
      return [];
    }
    throw error;
  }
}

/**
 * Writes to a temporary file and renames it over the target, so a crash or a
 * concurrent read can never observe a half-written file.
 */
async function writeFile<T>(fileName: string, records: T[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const filePath = path.join(DATA_DIR, fileName);
  const tempPath = `${filePath}.${process.pid}.tmp`;

  await fs.writeFile(tempPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, filePath);
}

export interface Collection<T extends BaseRecord> {
  /** Every record in the collection. */
  list(): Promise<T[]>;
  /** One record by id, or null when it does not exist. */
  find(id: string): Promise<T | null>;
  /** Every record matching a predicate, e.g. every task of one project. */
  findWhere(predicate: (record: T) => boolean): Promise<T[]>;
  /** The first record matching a predicate, or null. */
  findOneWhere(predicate: (record: T) => boolean): Promise<T | null>;
  /**
   * Appends a record. Generates a prefixed id unless one is supplied, which
   * lets a caller that needs its own id format (such as a session id) provide
   * one without introducing a second storage mechanism.
   */
  insert(data: Omit<T, "id">, id?: string): Promise<T>;
  /** Merges a partial change into a record. Returns null when not found. */
  update(id: string, changes: Partial<Omit<T, "id">>): Promise<T | null>;
  /** Deletes a record. Returns false when it did not exist. */
  remove(id: string): Promise<boolean>;
  /** Deletes every record matching a predicate. Returns how many were removed. */
  removeWhere(predicate: (record: T) => boolean): Promise<number>;
}

/**
 * Builds the file-backed accessor for one collection. This is the only place
 * in the application that touches the filesystem.
 */
export function createCollection<T extends BaseRecord>(
  fileName: string,
  idPrefix: string,
): Collection<T> {
  return {
    list() {
      return readFile<T>(fileName);
    },

    async find(id) {
      const records = await readFile<T>(fileName);
      return records.find((record) => record.id === id) ?? null;
    },

    async findWhere(predicate) {
      const records = await readFile<T>(fileName);
      return records.filter(predicate);
    },

    async findOneWhere(predicate) {
      const records = await readFile<T>(fileName);
      return records.find(predicate) ?? null;
    },

    insert(data, id) {
      return serialize(async () => {
        const records = await readFile<T>(fileName);

        if (id !== undefined && records.some((record) => record.id === id)) {
          throw new Error(`A record with that id already exists in ${fileName}.`);
        }

        const record = { ...data, id: id ?? createId(idPrefix) } as T;

        await writeFile(fileName, [...records, record]);
        return record;
      });
    },

    update(id, changes) {
      return serialize(async () => {
        const records = await readFile<T>(fileName);
        const index = records.findIndex((record) => record.id === id);

        if (index === -1) return null;

        // id can never be overwritten by a caller.
        const updated = { ...records[index], ...changes, id } as T;
        const next = [...records];
        next[index] = updated;

        await writeFile(fileName, next);
        return updated;
      });
    },

    remove(id) {
      return serialize(async () => {
        const records = await readFile<T>(fileName);
        const next = records.filter((record) => record.id !== id);

        if (next.length === records.length) return false;

        await writeFile(fileName, next);
        return true;
      });
    },

    removeWhere(predicate) {
      return serialize(async () => {
        const records = await readFile<T>(fileName);
        const next = records.filter((record) => !predicate(record));
        const removed = records.length - next.length;

        if (removed > 0) await writeFile(fileName, next);
        return removed;
      });
    },
  };
}
