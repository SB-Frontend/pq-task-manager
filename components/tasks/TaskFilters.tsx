"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { buttonClassName } from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";

export type FilterField =
  | "search"
  | "project"
  | "assignee"
  | "status"
  | "priority"
  | "due"
  | "sort";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "blocked", label: "Blocked" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const DUE_OPTIONS = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "week", label: "Due this week" },
  { value: "none", label: "No due date" },
];

const SORT_OPTIONS = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Created date" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
];

interface TaskFiltersProps {
  fields: readonly FilterField[];
  projectOptions?: { id: string; name: string }[];
  assigneeOptions?: { id: string; name: string }[];
  resultCount: number;
  totalCount: number;
  /** True when any filter is narrowing or re-ordering the list. */
  active: boolean;
  /** The task list offers an export of exactly what is on screen. */
  showExport?: boolean;
}

const SEARCH_DEBOUNCE_MS = 250;

/**
 * Reads and writes the query string, and nothing else.
 *
 * The URL is the single source of truth: this component holds no data, fetches
 * nothing, and keeps only the search box's own keystrokes in state.
 */
export default function TaskFilters({
  fields,
  projectOptions = [],
  assigneeOptions = [],
  resultCount,
  totalCount,
  active,
  showExport = false,
}: TaskFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const urlSearch = params.get("q") ?? "";
  const [search, setSearch] = useState(urlSearch);
  // Remembers what this component last wrote, so a change arriving from
  // elsewhere (back/forward, Clear) can be told apart from our own update.
  const lastWritten = useRef(urlSearch);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);

    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  // Adopt external navigation without clobbering what is being typed.
  useEffect(() => {
    if (urlSearch !== lastWritten.current) {
      lastWritten.current = urlSearch;
      setSearch(urlSearch);
    }
  }, [urlSearch]);

  // Debounced so results follow typing without a navigation per keystroke.
  useEffect(() => {
    if (search === urlSearch) return;

    const timer = setTimeout(() => {
      lastWritten.current = search;
      setParam("q", search);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, urlSearch]);

  const has = (field: FilterField) => fields.includes(field);

  // The export carries the current query string verbatim, so the workbook and
  // the visible list can never disagree about what is being shown.
  const queryString = params.toString();
  const exportHref = queryString
    ? `/api/tasks/export?${queryString}`
    : "/api/tasks/export";

  return (
    <div className="space-y-3">
      <form
        role="search"
        // Without JavaScript this still submits as a normal GET request.
        action={pathname}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {has("search") && (
          <div className="min-w-0 sm:col-span-2 lg:col-span-4">
            <SearchInput
              name="q"
              label="Search tasks"
              placeholder="Search title, description, project or tags"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        )}

        {has("project") && (
          <div className="min-w-0">
            <Select
              label="Project"
              name="project"
              options={projectOptions.map((project) => ({
                value: project.id,
                label: project.name,
              }))}
              placeholder="All projects"
              value={params.get("project") ?? ""}
              onChange={(event) => setParam("project", event.target.value)}
            />
          </div>
        )}

        {has("assignee") && (
          <div className="min-w-0">
            <Select
              label="Assignee"
              name="assignee"
              options={[
                { value: "none", label: "Unassigned" },
                ...assigneeOptions.map((user) => ({
                  value: user.id,
                  label: user.name,
                })),
              ]}
              placeholder="Anyone"
              value={params.get("assignee") ?? ""}
              onChange={(event) => setParam("assignee", event.target.value)}
            />
          </div>
        )}

        {has("status") && (
          <div className="min-w-0">
            <Select
              label="Status"
              name="status"
              options={STATUS_OPTIONS}
              placeholder="All statuses"
              value={params.get("status") ?? ""}
              onChange={(event) => setParam("status", event.target.value)}
            />
          </div>
        )}

        {has("priority") && (
          <div className="min-w-0">
            <Select
              label="Priority"
              name="priority"
              options={PRIORITY_OPTIONS}
              placeholder="All priorities"
              value={params.get("priority") ?? ""}
              onChange={(event) => setParam("priority", event.target.value)}
            />
          </div>
        )}

        {has("due") && (
          <div className="min-w-0">
            <Select
              label="Due date"
              name="due"
              options={DUE_OPTIONS}
              placeholder="Any due date"
              value={params.get("due") ?? ""}
              onChange={(event) => setParam("due", event.target.value)}
            />
          </div>
        )}

        {has("sort") && (
          <div className="min-w-0">
            <Select
              label="Sort by"
              name="sort"
              options={SORT_OPTIONS}
              value={params.get("sort") ?? "updated"}
              onChange={(event) => setParam("sort", event.target.value)}
            />
          </div>
        )}

        {/* Only reachable without JavaScript; the selects apply on change. */}
        <noscript>
          <button
            type="submit"
            className="h-9 rounded-md border border-border px-4 text-sm"
          >
            Apply
          </button>
        </noscript>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-xs text-muted">
          {active
            ? `${resultCount} of ${totalCount} ${totalCount === 1 ? "task" : "tasks"}`
            : `${totalCount} ${totalCount === 1 ? "task" : "tasks"}`}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {active && (
            <Link
              href={pathname}
              className="rounded text-xs text-muted underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
            >
              Clear filters
            </Link>
          )}

          {showExport &&
            (resultCount > 0 ? (
              // A plain anchor, not a Link: the router must not intercept a
              // file download.
              <a
                href={exportHref}
                className={buttonClassName({ variant: "secondary", size: "sm" })}
              >
                Export Excel
              </a>
            ) : (
              <>
                <span className="text-xs text-muted">No tasks to export.</span>
                <button
                  type="button"
                  disabled
                  className={buttonClassName({ variant: "secondary", size: "sm" })}
                >
                  Export Excel
                </button>
              </>
            ))}
        </div>
      </div>
    </div>
  );
}
