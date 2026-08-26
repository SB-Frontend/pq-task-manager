import "server-only";

import ExcelJS from "exceljs";

import { today } from "@/lib/format";
import type { TaskExportData } from "@/lib/tasks/queries";
import type { TaskPriority, TaskStatus } from "@/types";

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  blocked: "Blocked",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF1F5F9" },
};

/** Minutes to hours, rounded to two decimals. Blank when nothing is recorded. */
function hours(minutes: number | undefined): number | null {
  if (minutes === undefined || minutes <= 0) return null;
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Dates are written as real Excel date values so they sort and filter as dates,
 * displayed as yyyy-mm-dd to match the convention used everywhere else.
 *
 * The date is built from its parts in UTC because ExcelJS converts a JS Date to
 * a serial number via UTC: constructing it any other way could shift the stored
 * day by one for anyone west of Greenwich.
 */
function day(value: string | undefined): Date | null {
  if (!value) return null;

  const [year, month, date] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !date) return null;

  return new Date(Date.UTC(year, month - 1, date));
}

interface SheetColumn {
  header: string;
  width: number;
  numeric?: boolean;
  date?: boolean;
}

const DATE_FORMAT = "yyyy-mm-dd";

/** Width from the widest cell, clamped so one long note cannot stretch a column. */
function widthFor(header: string, values: string[], max = 50): number {
  const longest = values.reduce((wide, value) => Math.max(wide, value.length), header.length);
  return Math.min(Math.max(longest + 2, 10), max);
}

function styleSheet(sheet: ExcelJS.Worksheet, columns: SheetColumn[]): void {
  sheet.columns = columns.map((column) => ({
    header: column.header,
    width: column.width,
    style: column.numeric
      ? { numFmt: "0.00" }
      : column.date
        ? { numFmt: DATE_FORMAT }
        : undefined,
  }));

  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = HEADER_FILL;
  header.alignment = { vertical: "middle" };

  // Keep the header visible while scrolling a long export.
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

/** Builds the workbook: one Tasks sheet, plus Work Logs when there are any. */
export async function buildTasksWorkbook(data: TaskExportData): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const tasksSheet = workbook.addWorksheet("Tasks");

  const rows = data.tasks.map((task) => ({
    task: task.title,
    project: task.project?.name ?? "",
    assignee: task.assignee?.name ?? "",
    status: STATUS_LABELS[task.status],
    priority: PRIORITY_LABELS[task.priority],
    dueDate: day(task.dueDate),
    startDate: day(task.startedAt),
    completionDate: day(task.completedAt),
    estimatedHours: hours(task.estimatedMinutes),
    actualHours: hours(task.actualMinutes),
    loggedHours: hours(data.loggedMinutesByTask.get(task.id)),
    tags: task.tags.join(", "),
    description: task.description ?? "",
    notes: task.notes ?? "",
    createdDate: day(task.createdAt),
    updatedDate: day(task.updatedAt),
  }));

  const text = (pick: (row: (typeof rows)[number]) => string) => rows.map(pick);

  styleSheet(tasksSheet, [
    { header: "Task", width: widthFor("Task", text((r) => r.task)) },
    { header: "Project", width: widthFor("Project", text((r) => r.project)) },
    { header: "Assignee", width: widthFor("Assignee", text((r) => r.assignee)) },
    { header: "Status", width: 14 },
    { header: "Priority", width: 10 },
    { header: "Due Date", width: 12, date: true },
    { header: "Start Date", width: 12, date: true },
    { header: "Completion Date", width: 16, date: true },
    { header: "Estimated Hours", width: 16, numeric: true },
    { header: "Actual Hours", width: 13, numeric: true },
    { header: "Logged Hours", width: 13, numeric: true },
    { header: "Tags", width: widthFor("Tags", text((r) => r.tags), 30) },
    { header: "Description", width: widthFor("Description", text((r) => r.description)) },
    { header: "Developer Notes", width: widthFor("Developer Notes", text((r) => r.notes)) },
    { header: "Created Date", width: 13, date: true },
    { header: "Updated Date", width: 13, date: true },
  ]);

  for (const row of rows) {
    tasksSheet.addRow([
      row.task,
      row.project,
      row.assignee,
      row.status,
      row.priority,
      row.dueDate,
      row.startDate,
      row.completionDate,
      row.estimatedHours,
      row.actualHours,
      row.loggedHours,
      row.tags,
      row.description,
      row.notes,
      row.createdDate,
      row.updatedDate,
    ]);
  }

  // Specification section 15: work-log detail on its own worksheet.
  if (data.workLogs.length > 0) {
    const taskById = new Map(data.tasks.map((task) => [task.id, task]));
    const logsSheet = workbook.addWorksheet("Work Logs");

    const logRows = data.workLogs
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((log) => {
        const task = taskById.get(log.taskId);
        return {
          project: task?.project?.name ?? "",
          task: task?.title ?? "",
          date: day(log.date),
          hours: hours(log.minutes),
          description: log.description,
        };
      });

    styleSheet(logsSheet, [
      { header: "Project", width: widthFor("Project", logRows.map((r) => r.project)) },
      { header: "Task", width: widthFor("Task", logRows.map((r) => r.task)) },
      { header: "Date", width: 12, date: true },
      { header: "Hours", width: 10, numeric: true },
      { header: "Description", width: widthFor("Description", logRows.map((r) => r.description)) },
    ]);

    for (const row of logRows) {
      logsSheet.addRow([row.project, row.task, row.date, row.hours, row.description]);
    }
  }

  // Copied into a standalone ArrayBuffer so it can be used directly as a
  // response body.
  const written = new Uint8Array(await workbook.xlsx.writeBuffer());
  return written.buffer as ArrayBuffer;
}

/** e.g. tasks-export-2026-08-25.xlsx, or -filtered- when a query narrowed it. */
export function exportFilename(filtered: boolean): string {
  return `tasks-export${filtered ? "-filtered" : ""}-${today()}.xlsx`;
}
