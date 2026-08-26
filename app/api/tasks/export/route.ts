import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/auth";
import { buildTasksWorkbook, exportFilename } from "@/lib/tasks/export";
import { hasActiveFilters, parseTaskQuery } from "@/lib/tasks/filters";
import { listTasksForExport } from "@/lib/tasks/queries";

// ExcelJS needs the Node.js runtime, and a download must never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Streams the current task list as a workbook.
 *
 * A file download needs real response headers, which a Server Action cannot
 * provide, so this is the one place a route handler is warranted. It accepts
 * only the same query parameters the task list uses - never a path or a
 * filename - so it cannot be pointed at anything else.
 */
export async function GET(request: Request) {
  // Redirects to /login when there is no valid session.
  await requireUser();

  const { searchParams } = new URL(request.url);
  const query = parseTaskQuery(Object.fromEntries(searchParams));
  const data = await listTasksForExport(query);

  // An empty workbook would look like "you have no tasks" rather than
  // "nothing matched", so say so instead of downloading a misleading file.
  if (data.tasks.length === 0) {
    return new NextResponse("No tasks to export.", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const workbook = await buildTasksWorkbook(data);

  return new NextResponse(workbook, {
    headers: {
      "content-type": XLSX_CONTENT_TYPE,
      "content-disposition": `attachment; filename="${exportFilename(hasActiveFilters(query))}"`,
      "cache-control": "no-store",
    },
  });
}
