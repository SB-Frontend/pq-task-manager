import "server-only";

import { createId } from "@/lib/storage/ids";
import { getSupabase } from "@/lib/storage/supabase";
import type { BaseRecord } from "@/types";

/**
 * Table-backed collections.
 *
 * This is the only module that talks to the database, exactly as the JSON
 * implementation was the only module that touched the filesystem. The
 * application above it is unchanged.
 *
 * Two conventions are translated here and nowhere else:
 *   * TypeScript uses camelCase; Postgres columns are snake_case.
 *   * TypeScript uses optional properties; Postgres uses NULL.
 */
type Row = Record<string, unknown>;

function toColumn(field: string): string {
  return field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toField(column: string): string {
  return column.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/** An absent optional property is written as NULL, which clears the column. */
function toRow(record: Record<string, unknown>): Row {
  const row: Row = {};

  for (const [field, value] of Object.entries(record)) {
    row[toColumn(field)] = value === undefined ? null : value;
  }

  return row;
}

/** A NULL column is omitted entirely, matching the optional-property style. */
function fromRow<T>(row: Row): T {
  const record: Record<string, unknown> = {};

  for (const [column, value] of Object.entries(row)) {
    if (value === null) continue;
    record[toField(column)] = value;
  }

  return record as T;
}

/** Filters are equality matches on one or more fields. */
export type Filter<T> = Partial<Record<keyof T, unknown>>;

export interface Collection<T extends BaseRecord> {
  /** Every record, in insertion order. */
  list(): Promise<T[]>;
  /** One record by id, or null when it does not exist. */
  find(id: string): Promise<T | null>;
  /** Every record matching an equality filter, e.g. { projectId }. */
  findWhere(filter: Filter<T>): Promise<T[]>;
  /** The first record matching an equality filter, or null. */
  findOneWhere(filter: Filter<T>): Promise<T | null>;
  /** Inserts a record, generating a prefixed id unless one is supplied. */
  insert(data: Omit<T, "id">, id?: string): Promise<T>;
  /** Updates the given fields. An undefined value clears the column. */
  update(id: string, changes: Partial<Omit<T, "id">>): Promise<T | null>;
  /** Deletes a record. Returns false when it did not exist. */
  remove(id: string): Promise<boolean>;
  /** Deletes every record matching a filter. Returns how many were removed. */
  removeWhere(filter: Filter<T>): Promise<number>;
}

/** Database errors are thrown so the route's error boundary can surface them. */
function fail(table: string, action: string, message: string): never {
  throw new Error(`Storage ${action} failed on "${table}": ${message}`);
}

export function createCollection<T extends BaseRecord>(
  table: string,
  idPrefix: string,
): Collection<T> {
  const from = () => getSupabase().from(table);

  return {
    async list() {
      const { data, error } = await from()
        .select("*")
        .order("created_at", { ascending: true });

      if (error) fail(table, "list", error.message);
      return (data ?? []).map((row) => fromRow<T>(row));
    },

    async find(id) {
      const { data, error } = await from().select("*").eq("id", id).maybeSingle();

      if (error) fail(table, "find", error.message);
      return data ? fromRow<T>(data) : null;
    },

    async findWhere(filter) {
      const { data, error } = await from()
        .select("*")
        .match(toRow(filter as Record<string, unknown>))
        .order("created_at", { ascending: true });

      if (error) fail(table, "findWhere", error.message);
      return (data ?? []).map((row) => fromRow<T>(row));
    },

    async findOneWhere(filter) {
      const { data, error } = await from()
        .select("*")
        .match(toRow(filter as Record<string, unknown>))
        .limit(1);

      if (error) fail(table, "findOneWhere", error.message);
      return data && data[0] ? fromRow<T>(data[0]) : null;
    },

    async insert(data, id) {
      const record = { ...data, id: id ?? createId(idPrefix) } as T;

      const { data: inserted, error } = await from()
        .insert(toRow(record as Record<string, unknown>))
        .select("*")
        .single();

      if (error) fail(table, "insert", error.message);
      return fromRow<T>(inserted);
    },

    async update(id, changes) {
      const { data, error } = await from()
        .update(toRow(changes as Record<string, unknown>))
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) fail(table, "update", error.message);
      return data ? fromRow<T>(data) : null;
    },

    async remove(id) {
      const { data, error } = await from().delete().eq("id", id).select("id");

      if (error) fail(table, "remove", error.message);
      return (data ?? []).length > 0;
    },

    async removeWhere(filter) {
      const { data, error } = await from()
        .delete()
        .match(toRow(filter as Record<string, unknown>))
        .select("id");

      if (error) fail(table, "removeWhere", error.message);
      return (data ?? []).length;
    },
  };
}
