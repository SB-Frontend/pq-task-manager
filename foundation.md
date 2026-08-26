# Project Task Manager Foundation

## 1. Purpose

This document records the technical foundation of the Project Task Manager: the
technology choices, storage strategy, authentication model, feature set, and
project-level rules **as they are actually implemented and verified**.

The application is a small, single-user personal work tracker for a frontend
developer. It answers three questions:

- What am I working on?
- What is pending?
- What did I actually do, and when?

The governing requirement document is `Project Task Manager.txt`, referred to
throughout as **the specification**. Where this document and the specification
disagree, the disagreement is stated explicitly rather than resolved silently.

### Relationship to `Backend-Setup/foundation.md`

A separate document, `D:\Claude\Backend-Setup\foundation.md`, defines the
**Publication API Foundation** — an Express + MySQL + Sequelize REST API for a
blog/CMS. **That is a different project.** It shares no code, no runtime, no
database, and no deployment with this application. Nothing in it governs the
Project Task Manager.

The two projects did reach one decision independently and for the same stated
reasons: **server-side sessions in preference to JWT**, for immediate
revocation, real logout, and "log out of other devices" after a password
change. The reasoning carried across; the implementation did not (see §7).

---

## 2. Status Legend

Every decision in this document carries one of the following:

| Marker | Meaning |
|---|---|
| **Decided** | The choice is made and settled. |
| **Implemented** | Code exists in the repository. |
| **Verified** | Exercised end-to-end and observed working, not merely compiled. |
| **Deferred** | Deliberately postponed; not a gap. |
| **Pending** | An open decision, listed in §20. |

"Verified" is used strictly. It means the behaviour was tested against a running
application with real requests, not inferred from a passing build.

---

## 3. Technology Stack

**Decided · Implemented · Verified**

| Area | Decision |
|---|---|
| Runtime | Node.js 20.9+ (developed on 22.14.0) |
| Language | TypeScript, `strict` |
| Framework | Next.js 16.3.2, App Router |
| UI | React 19.2.8 |
| Styling | Tailwind CSS v4 |
| Persistence | JSON files on the local filesystem |
| Validation | Zod 4 |
| Password hashing | bcryptjs 3, cost factor 12 |
| Spreadsheet export | ExcelJS 4.4.0 |
| Server/client boundary | `server-only` |
| Module system | ESM |
| Linting | ESLint 9 with `eslint-config-next` |

The complete runtime dependency list is exactly seven packages:
`bcryptjs`, `exceljs`, `next`, `react`, `react-dom`, `server-only`, `zod`.

There is **no** Express, no Sequelize, no MySQL, no ORM, no state-management
library, no UI component library, and no test framework.

---

## 4. Project Principles

1. Keep the implementation small. This is a personal tracker, not a
   project-management platform.
2. Do not introduce a dependency without a concrete requirement.
3. Do not build a feature before it is required.
4. Keep data access out of UI components.
5. Create a reusable component only when it is genuinely shared.
6. Server-side validation is authoritative; client-side validation is a
   convenience only.
7. Never log passwords, password hashes, session identifiers, or cookies.
8. Destructive actions require confirmation; projects are archived, never
   deleted.
9. Derived values are computed on read and never stored.
10. Verification means exercising behaviour, not compiling it.

---

## 5. Application Architecture

**Decided · Implemented**

The application is a single Next.js App Router deployment. There is no separate
API tier.

```text
UI (Server Components / Client Components)
      │
      ▼
Server Actions  ·  server-side queries
      │
      ▼
Domain modules      lib/{auth,projects,tasks,work-logs,dashboard,settings,users}
      │
      ▼
Storage layer       lib/storage/*        ← the only code that touches the disk
      │
      ▼
JSON files          data/*.json
```

### Layer rules

- UI components never read or write files, and never import the storage layer.
- Every module under `lib/storage/` and every server-side query module begins
  with `import "server-only"`, so a client import is a **build failure**, not a
  runtime bug.
- Mutations are Server Actions. There is exactly one HTTP route handler in the
  application (§13), because a file download requires real response headers,
  which a Server Action cannot provide.
- Business calculations live in the domain modules, not in components.

**Verified:** 18 modules carry `server-only`; a scan of every `"use client"`
file's imports finds no client component importing a server-only module. Zod and
all validation schemas remain server-side.

### Directory layout

```text
app/            Routes and layouts (App Router)
components/     UI components (ui, layout, auth, projects, tasks, work-logs,
                dashboard, settings)
lib/            Domain modules, storage layer, helpers
lib/storage/    JSON storage layer (server-only)
types/          Shared TypeScript types
scripts/        Maintenance scripts (backup)
data/           JSON data files (git-ignored)
backups/        Local backups (git-ignored)
```

`hooks/` and `public/` exist from the specification's suggested structure (§28
of the specification) and are currently empty. They are retained deliberately.

---

## 6. Data Persistence

**Decided · Implemented · Verified**

The specification (§4) asks for "the simplest appropriate solution" for a
single-user application, and requires that "the architecture should allow the
storage layer to be replaced later if required."

The storage layer is JSON files, one per collection, behind a single typed
interface.

### Collections

| File | Record | Id prefix |
|---|---|---|
| `users.json` | `User` | `user_` |
| `sessions.json` | `Session` | 32 random bytes, base64url (§7) |
| `projects.json` | `Project` | `project_` |
| `tasks.json` | `Task` | `task_` |
| `work-logs.json` | `WorkLog` | `worklog_` |
| `activities.json` | `Activity` | `activity_` |

Each file holds a JSON array and is created automatically on first use, so a
fresh clone requires no setup.

### The storage interface

`lib/storage/json.ts` exports one factory, `createCollection<T>(fileName,
idPrefix)`, returning:

```ts
list()          find(id)          findWhere(predicate)   findOneWhere(predicate)
insert(data, id?)                 update(id, changes)
remove(id)      removeWhere(predicate)
```

Every entity module is three lines. Filesystem logic exists in exactly one
place; no collection duplicates it.

### Write safety

- **Serialised.** Every write across every collection passes through a single
  in-process promise queue. A read-modify-write cycle is not atomic on its own,
  so two overlapping requests would otherwise drop one of the two changes.
- **Atomic.** Content is written to a temporary file and then renamed over the
  target, so a reader never observes a half-written file and a crash mid-write
  cannot corrupt one.

**Verified:** 25 concurrent inserts produced 25 persisted records, none lost.

### Identifiers

Ids are prefixed, sortable, opaque strings — `prefix_` + base36 timestamp +
random hex, e.g. `task_mt8fih2gb6b87544d0`. Array indexes are never used as
identifiers. The format is deliberately migration-friendly: a future database
can store the same string as a primary key.

### Dates

- **Timestamps** (`createdAt`, `updatedAt`) are full ISO 8601 strings.
- **Calendar-only values** (`Project.startDate`, `Project.targetDate`,
  `Task.dueDate`, `Task.startedAt`, `Task.completedAt`, `WorkLog.date`) are
  `YYYY-MM-DD` strings.

Calendar dates are never parsed through `new Date()` for display or comparison.
They are compared as strings (which sorts correctly) and formatted by splitting
on `-`. This removes an entire class of timezone off-by-one-day bugs.

### Derived data is never stored

Project progress, task counts, logged time, and all dashboard statistics are
computed on read from the underlying records. No progress field, no counter, and
no dashboard collection exists.

### Current storage decision

**Decided:** JSON storage is retained for this version. A migration to
Supabase/PostgreSQL was investigated in detail and **deliberately deferred**
until application behaviour is stable. Supabase is explicitly **out of scope**
for the current version. See §21 and §23.

---

## 7. Authentication and Sessions

**Decided · Implemented · Verified**

### Model

Email/password authentication with **server-side sessions**, transported as an
**HTTP-only cookie** containing only an opaque session identifier. No user data
is stored in the cookie.

```text
Browser
   │  HTTP-only cookie (session id only)
   ▼
Next.js server (Server Actions / Server Components)
   │
   ▼
lib/auth/session.ts
   │
   ▼
data/sessions.json
```

### Why sessions rather than JWT

The credential travels in an HTTP-only cookie either way, so the only
meaningful difference is whether the server looks the identifier up. Looking it
up provides immediate revocation, real logout rather than the client discarding
a still-valid token, and "sign out of other devices" after a password change.

This is the same reasoning recorded in the Publication API foundation. **The
implementation is entirely different** and shares no code — see below.

### Session store — correction of a common misreading

> **Not applicable to this project:** `express-session` and
> `connect-session-sequelize`. Those belong to the Publication API foundation
> (§15 of that document), which stores sessions in a MySQL `sessions` table.
>
> This project uses **none** of them. There is no Express, no Sequelize, no
> MySQL, and no `SESSION_SECRET`. Verified: a search for
> `express|sequelize|mysql` across `package.json`, `lib/`, `app/` and
> `components/` returns nothing.

The actual implementation:

| Concern | Decision |
|---|---|
| Session creation | `lib/auth/session.ts` |
| Identifier | `node:crypto` `randomBytes(32)`, base64url (43 chars) |
| Cookie handling | `next/headers` `cookies()` |
| Store | `data/sessions.json`, via the standard storage layer |
| Lifetime | 7 days |
| Expired-session cleanup | Swept on session creation; an expired session is also removed the moment it is read |

### Session rules

- The session identifier is regenerated on successful login. `createSession()`
  destroys any existing session first, so a pre-login identifier can never
  become the authenticated one (session fixation).
- Logout destroys the session **server-side**, not merely clearing the cookie.
- Identifiers are never derived from the user, the email, a counter, or a
  timestamp alone.
- Session identifiers and hashes are never logged.

### Cookie configuration

| Attribute | Value |
|---|---|
| `HttpOnly` | true |
| `SameSite` | `Lax` |
| `Path` | `/` |
| `Secure` | `process.env.NODE_ENV === "production"` |
| `Max-Age` | 604800 (7 days) |

### Password handling

- bcrypt, cost factor 12. Salting is internal to bcrypt.
- Only `passwordHash` is stored — never a plaintext or reversible value.
- Passwords longer than 72 bytes are **rejected**, not silently truncated
  (bcrypt's limit).
- `PublicUser` is constructed field by field rather than by deleting
  `passwordHash`, so a sensitive field added later cannot leak by omission.

### Route protection

Authentication is enforced server-side. `requireUser()` is called by the
protected layout, by **every** protected page, by every mutating Server Action,
and by the export route handler. No client-side authentication logic exists, and
no middleware is used — the check lives next to the data it protects.

### Verified behaviour

- Logged-out access to every protected route → `307 → /login`
- Forged cookie → `307 → /login`
- Expired session → rejected and swept from storage
- Logout → session count decreases server-side; protected routes then refuse
- Session survives reload
- Fresh identifier issued per login (fixation prevented)
- Password hash never appears in any rendered HTML
- Login errors are identical for unknown email and wrong password, so accounts
  cannot be enumerated

### Deliberately excluded

Email verification, password reset, OAuth/social login, 2FA, roles, and
permissions are **Deferred** — excluded by specification §17 for v1.

Registration is currently **open**: anyone reaching `/register` can create an
account. This is a recorded, accepted decision for the current single-user
scope.

---

## 8. Data Model

**Implemented**

```ts
User     { id, email, passwordHash, name, createdAt, updatedAt }
Session  { id, userId, expiresAt, createdAt }
Project  { id, name, client?, description?, status, startDate?, targetDate?,
           createdAt, updatedAt }
Task     { id, projectId, assigneeId?, title, description?, status, priority,
           tags[], estimatedMinutes?, actualMinutes?, notes?, dueDate?,
           startedAt?, completedAt?, createdAt, updatedAt }
WorkLog  { id, taskId, date, minutes, description, createdAt }
Activity { id, type, message, projectId?, taskId?, createdAt }
```

Enumerations:

- `ProjectStatus` — `active` · `completed` · `archived`
- `TaskStatus` — `pending` · `in_progress` · `completed` · `blocked`
- `TaskPriority` — `low` · `medium` · `high`

Relationships are plain string foreign keys, resolved in memory. Referential
integrity is enforced in application code: a task's project must exist, a work
log's task must exist, and an assignee must exist.

Optional fields are **absent** from the stored record rather than stored as
empty strings, so clearing a field removes it.

Durations are stored as **minutes** and presented as hours. The form accepts
decimal hours; storage keeps integers.

---

## 9. Projects

**Implemented · Verified**

- Project CRUD: list, create, detail, edit.
- Fields: name (required), client, description, status, start date, target date.
- Statuses: Active, Completed, Archived.
- **Archive, never delete.** Archiving is confirmed through a dialog, changes
  status to `archived`, and preserves the project and all related data.
  Archived projects are excluded from the default list and remain reachable
  through an Active/Archived view.
- Restoring is done by editing the status back to Active.
- Progress is derived as `completed tasks / total tasks × 100`, never stored.
- Project detail shows task counts, progress, and total logged time — all
  derived.
- Validation: name required, target date not before start date, dates
  `YYYY-MM-DD`.
- Activity is recorded for creation, update, and archiving.

---

## 10. Tasks

**Implemented · Verified**

### Task management

- Task CRUD: list, create, detail, edit, **delete**.
- Tasks are deleted outright — unlike projects, the specification defines no
  archive requirement for them. Deletion is confirmed through a dialog and also
  removes the task's work logs, so no orphans remain.
- Fields: title (required), project (required), description, status, priority,
  tags, estimated hours, actual hours, developer notes, due date, start date,
  completion date, assignee.
- One shared `TaskForm` serves both create and edit; there is no duplicate form.

### Status behaviour

Implemented from specification §17, deliberately simple:

- Moving to **In Progress** fills an empty start date with today.
- Moving to **Completed** fills an empty completion date with today.
- A date is only ever filled when empty, so a hand-entered date is never
  overwritten and no confirmation is required.
- **Reopening** a completed task clears the completion date and records the
  previous one in the activity history.

### Time tracking

- `estimatedMinutes` and `actualMinutes` are entered as decimal hours.
- **Logged** time is derived from the task's work logs and displayed alongside
  actual time.
- `actualMinutes` is **never** modified automatically by work-log writes. The
  specification calls that calculation optional, so logged time is shown
  separately rather than overwriting a manual value.

### Task assignment

**Decided · Implemented · Verified**

A task may be assigned to another user via optional `assigneeId`.

- Assignment is **collaboration metadata, not access control.** It records who
  is working on something and grants no ownership, visibility, or permission of
  any kind.
- Assignment is optional; unassigned tasks remain valid, and tasks created
  before the feature existed continue to work unchanged.
- Assigning and unassigning are both supported.
- The selected user is validated to exist; an unknown id is rejected and nothing
  is persisted.
- Assignment changes record a `task_assigned` activity entry, including
  unassignment.
- The assignee is shown on the task list and task detail, is included in the
  Excel export, is searchable by name, and is filterable (including an
  "Unassigned" option).
- The assignee is **not** shown on the dashboard — deliberately out of scope.

Ownership, visibility scoping, roles, and permissions are **Deferred** and were
explicitly excluded.

---

## 11. Work Logs

**Implemented · Verified**

A work log belongs to a task and records what was done in one session.

```ts
WorkLog { id, taskId, date, minutes, description, createdAt }
```

- **A work log has no project reference.** The project is resolved *through* the
  task. Project data is never duplicated onto the log.
- Fields: task (required), date (required, defaults to today), duration
  (required, decimal hours → minutes), description (required).
- Create, edit, and delete are all supported; deletion is confirmed and removes
  only the entry — never the task or project.
- Validation: duration greater than zero and at most 24 hours per entry, valid
  calendar date, description required and at most 2000 characters, and the task
  must exist at the moment of writing so an orphan cannot be created.
- Totals are always computed, never stored: task detail shows "Total logged",
  and project detail shows a logged total derived through its tasks.
- Activity is recorded for added, updated, and deleted work logs.

---

## 12. Search, Filtering, and Sorting

**Implemented · Verified**

### Source of truth

The **URL query string is the single source of truth.** There is no global
state, no state-management library, and no client-side data fetching. Server
Components read `searchParams`; the client filter bar only reads and writes the
URL.

### Parameters

| Parameter | Values | Default |
|---|---|---|
| `q` | free text (≤100) | — |
| `project` | project id | all |
| `assignee` | user id, or `none` for unassigned | anyone |
| `status` | `pending` · `in_progress` · `completed` · `blocked` | all |
| `priority` | `low` · `medium` · `high` | all |
| `due` | `overdue` · `today` · `week` · `none` | any |
| `sort` | `updated` · `created` · `priority` · `status` | `updated` |

### Behaviour

- **Search** matches case-insensitively across task title, description, project
  name, tags, and assignee name. A whitespace-only search is treated as no
  search.
- **Search is debounced (~250 ms)**; select filters apply immediately. Four
  keystrokes produce one navigation, and the input keeps focus.
- **Filter state is shareable and deep-linkable.** A pasted URL reproduces the
  exact view and hydrates every control.
- **Invalid values fall back safely.** A URL is user-editable, so
  `?status=banana` shows everything rather than raising an error. Parsing uses
  Zod with `.catch()` defaults.
- Empty parameters are dropped from the URL. A bare `/app/tasks` behaves exactly
  as it did before search existed.
- **Sort orders:** priority is High → Medium → Low; status is In Progress →
  Pending → Blocked → Completed. Every ordering tie-breaks on most-recently
  updated, so results are stable.
- **"Overdue" excludes completed tasks** — finished work is not chased for being
  late.
- Filter changes use `router.replace`, so debounced typing does not flood
  browser history. "Clear filters" is a real link and therefore a history entry.
- **No pagination.** Not specified, and not appropriate at personal scale.

### Scope

- The **global task list** has search, all five filters, and sorting.
- **Project detail** has a status filter and sorting **but no search** —
  specification §9 defines it that way.
- **Projects** and **work logs** have no search or filters; the specification
  does not ask for them.

### Implementation rule

All filtering and sorting logic lives in **one** module,
`lib/tasks/filters.ts`. The global list, project detail, and the Excel export
all call the same `parseTaskQuery` and `applyTaskQuery` functions, so the
visible list and an exported file can never disagree.

### Performance

The task list performs exactly **three** storage reads (`tasks`, `projects`,
`users`) regardless of how many filters are active. Records are joined in memory
and filtered in a single pass. There is no N+1 behaviour anywhere.

---

## 13. Excel Export

**Implemented · Verified**

### Mechanism

A single authenticated route handler, `GET /api/tasks/export`, accepts the same
query parameters as the task list and streams an `.xlsx` file.

This is the **only** HTTP route handler in the application. A download requires
real `Content-Type` and `Content-Disposition` headers, which a Server Action
cannot provide.

### Export variants

All three are the same endpoint with different parameters:

| Variant | Request |
|---|---|
| Export all tasks | no parameters |
| Export filtered tasks | the current query string, verbatim |
| Export project | `?project=<id>` — offered on project detail |

Because the export reuses `parseTaskQuery` and `applyTaskQuery`, the exported
rows and the visible list are produced by the same code.

### Workbook

**Sheet 1 — Tasks**, 16 columns: Task · Project · Assignee · Status · Priority ·
Due Date · Start Date · Completion Date · Estimated Hours · Actual Hours ·
Logged Hours · Tags · Description · Developer Notes · Created Date · Updated
Date.

**Sheet 2 — Work Logs**: Project · Task · Date · Hours · Description, containing
only logs belonging to the exported tasks. Omitted when there are none.

### Formatting

- Header row bold on a light fill, and **frozen**.
- Column widths computed from content and capped, so one long note cannot
  stretch a column.
- Hours are numeric with a `0.00` format.
- **Dates are native Excel date cells formatted `yyyy-mm-dd`**, so they sort and
  filter as dates. They are constructed in UTC from their parts, because ExcelJS
  converts a JS `Date` to a serial number via UTC — any other construction could
  shift the stored day.
- Statuses and priorities are written as readable labels, not raw enum values.
- Tags are comma-separated.
- No autofilter, no charts, no colour, no decoration.

### Filename

`tasks-export-YYYY-MM-DD.xlsx`, or `tasks-export-filtered-YYYY-MM-DD.xlsx` when
a query narrowed the list.

### Security

- The endpoint calls `requireUser()`; unauthenticated requests redirect to
  `/login`.
- It accepts **only** filter parameters — never a path or a filename — so
  arbitrary file access is impossible by construction.
- **A zero-match export is rejected** with HTTP 400 and the message
  "No tasks to export." An empty workbook would imply "you have no tasks" rather
  than "nothing matched". The UI disables the control before that state is
  reachable.

### Known dependency advisory — Accepted / Deferred

`exceljs@4.4.0` depends on `uuid@8.3.2`, which carries a **moderate** advisory:
*missing buffer bounds check in v3/v5/v6 when `buf` is provided.*

- ExcelJS 4.4.0 is the latest release; npm's suggested remedy is a major
  downgrade to 3.4.0.
- The vulnerable path requires passing a caller-controlled buffer into `uuid`,
  which ExcelJS never exposes.
- **Decision: accepted and deferred**, not blocking. ExcelJS is not to be
  replaced.

ExcelJS is imported in exactly one file, `lib/tasks/export.ts`, whose first line
is `import "server-only"`. It cannot enter the browser bundle.

---

## 14. Settings

**Implemented · Verified**

Settings is deliberately small and contains two **independent** concerns.

```text
settings
├── appearance → theme preference        (no authentication involved)
└── account    → password change         (authentication + sessions)
```

### Appearance

- Light · Dark · System.
- **Stored as a cookie**, not on the user record and not in the session. The
  theme is a device preference, not account data.
- Read on the server in the root layout, which sets `data-theme` on `<html>`.
  The correct palette is therefore present in the **first paint** — there is no
  flash of the wrong theme and no client-side anti-flash script.
- "System" sets no attribute, leaving the CSS `prefers-color-scheme` query in
  charge; an explicit choice always wins.
- `color-scheme` follows the theme so native controls (selects, date pickers)
  match.
- An unrecognised cookie value falls back to System.

**Architectural rule:** the theme modules import nothing from authentication,
sessions, or storage. Theme and account state cannot become entangled.

### Password change

- Fields: current password, new password, confirm new password.
- Reuses the existing password rule from registration, so the two cannot
  diverge, and the existing `hashPassword` / `verifyPassword` helpers.
- Validation: current password required and verified, new password at least 8
  characters and within bcrypt's 72-byte limit, confirmation must match, and the
  new password must differ from the current one.
- The current password is required **even though the caller is already
  authenticated**, so a borrowed session cannot silently take over the account.
- On success the password hash is updated and **all other sessions are revoked
  while the current session is retained.**
- The password hash is never exposed in any response.
- No activity entry is recorded for a password change — the activity history is
  about work, not security events.

### Deliberately excluded

Default task priority and default task status are listed in specification §24
but were **intentionally scoped out**. Profile management, avatar upload, and
notification preferences are likewise excluded.

---

## 15. Dashboard

**Implemented · Verified**

Every figure is derived from persisted records. There are no fake statistics and
no stored metrics.

- **Projects:** total, active, completed, archived.
- **Tasks and time:** total, pending, in progress, completed, and total logged
  time.
- **Task summary:** Pending · In Progress · Completed · Blocked, with an overall
  completion bar.
- **Active projects** (up to 5) with task completion, progress, and target date.
- **Recent tasks** (up to 5) with project, status, priority, and due date.
- **Recent activity** (up to 8), newest first.

Aggregation happens in one module, `lib/dashboard/queries.ts`, which reads each
of the four collections **once** in parallel and groups tasks by project in a
single pass. Adding a project never adds a storage read.

Empty states are graded: with nothing created at all, the page shows one
sentence and a "Create Project" action rather than a grid of zeros; individual
sections have their own empty states; and logged time reads "None yet" rather
than "0m".

There are no charts. The only visual is the progress bar the specification asks
for.

---

## 16. Activity History

**Implemented · Verified**

A lightweight, append-only history answering "what did I work on recently?" It
is deliberately not an audit system — a type, a human-readable message, and the
ids it relates to.

Recorded types:

```
project_created      project_updated
task_created         task_updated      task_status_changed
task_completed       task_deleted      task_assigned
work_log_added       work_log_updated  work_log_deleted
```

Activity entries survive the deletion of their subject, so the history stays
readable ("Created task X" … "Deleted task X").

---

## 17. User Interface Foundation

### Component architecture

**Implemented**

Reusable primitives live in `components/ui/`; feature components live beside
their feature. A component exists only because it is genuinely shared.

`Button` · `ButtonLink` · `Input` · `Textarea` · `Select` · `DateInput` ·
`SearchInput` · `FormField` · `Modal` · `ConfirmDialog` · `StatusBadge` ·
`PriorityBadge` · `ProgressBar` · `PageHeader` · `EmptyState` · `LoadingState` ·
`ErrorState` · `icons`.

No UI component library is used. Icons are a small hand-drawn inline set rather
than an icon package.

`FormField` carries all label, description, and error markup and exports the
shared aria wiring, so Input, Textarea, Select, and DateInput do not repeat it.

### Layout

`AppShell` composes a sticky sidebar (≥1024px), a top bar, and a single content
column. Below `lg`, navigation becomes a drawer opened from the top bar. Pages
render only their own content; layout markup is never repeated.

Navigation: Dashboard · Projects · Tasks · Work logs · Settings.

> **Recorded deviation.** Specification §5 lists four navigation items;
> "Work logs" is a fifth, added deliberately when the work-log list route was
> introduced, because an unreachable route is worse than a fifth item.

### Responsive design

**Verified at 1280 / 768 / 375 / 320**

- **No horizontal overflow at any width**, on every route.
- **The task table becomes cards below 1024px.** This is a deliberate decision:
  once the Assignee column made it a nine-column table, 768px could not display
  it — the status badge and the Edit link were both clipped, and neither can
  ellipsis. Rather than sacrifice a column or accept clipped controls, the table
  is shown only where nine columns are legible, and tablets receive the card
  layout, which shows the same information including the assignee.
- Table column widths are `table-fixed` and sum to **exactly 100%**. Exceeding
  100% pushes the final column outside the container — this caused two separate
  clipping defects during development and is now an explicit rule.
- `min-w-0` is applied to grid and flex children that can receive long content.
  A grid item defaults to `min-width: auto`, so a truncated (`nowrap`) heading
  otherwise holds its track open and forces the whole page to scroll sideways.
  This caused defects in three separate features and is applied proactively.

### Visual direction

Restrained and developer-focused: neutral background, white/dark cards, small
radii, subtle borders, minimal shadow. **No gradients**, no decorative
illustration, no excessive animation, no charts.

**Light-theme contrast** was corrected during final hardening. The original
tokens placed a white card on a `#f8fafc` background (1.05:1) with `#e2e8f0`
borders (1.23:1) — measurably imperceptible. Tokens are now `--background:
#f1f5f9` and `--border: #cbd5e1`, raising border-vs-card to 1.48:1 and making
card edges visible. The fix is token-only; no component was changed and no
gradient was introduced.

### Accessibility

**Verified**

- Semantic HTML: `main`, `nav`, `header`, `aside`; links are `<a>` and actions
  are `<button>`. No clickable `<div>` elements.
- Correct heading hierarchy — one `h1` per page, `h2` for sections.
- Every form control has a real `<label>`; the search field's is `sr-only`.
- Errors are linked with `aria-describedby` and `aria-invalid`.
- **Zero duplicate DOM ids.** Modals generate unique ids with `useId()` — a
  defect found when a page rendered four dialogs that all shared
  `id="modal-title"`, so every dialog announced the first one's heading.
- Dialogs and the mobile drawer use the native `<dialog>` element with
  `showModal()`, so the focus trap, Escape handling, background inertness, and
  focus restoration come from the platform rather than hand-written handlers.
- Visible `focus-visible` rings on every interactive element; everything is
  keyboard reachable.
- The filter bar is a `role="search"` landmark, and result counts are announced
  through an `aria-live="polite"` region.
- Progress bars carry `role="progressbar"` with `aria-valuenow`, `aria-valuemin`,
  `aria-valuemax`, and `aria-valuetext`, and clamp invalid values (negatives,
  >100, `NaN`, `Infinity`).
- **No colour-only meaning** — status and priority badges always carry text.

---

## 18. Application States

**Implemented · Verified**

| State | Implementation |
|---|---|
| **Loading** | `app/app/loading.tsx` renders `LoadingState`; Next applies it to every route under `/app`. |
| **Error** | `app/app/error.tsx` renders `ErrorState` with a working retry. |
| **Not found** | `not-found.tsx` for each dynamic route — projects, tasks, work logs. |
| **Empty** | Graded empty states throughout, distinguishing "nothing exists yet" from "nothing matches your filters". |

**Retry behaviour.** The retry calls `router.refresh()` **and** `reset()` inside
a transition. `reset()` alone re-renders the cached failure and the error simply
reappears — this was found and fixed during hardening by corrupting a data file,
observing the boundary, repairing the file, and confirming recovery without a
page reload.

**Invalid identifiers** render the correct "not found" UI. See §20.1 for the
status-code consequence of the loading boundary.

---

## 19. Deployment

**Decided · Documented**

### Supported model

A **single long-running Node process with a persistent, writable disk**:

```bash
npm ci
npm run build
npm run start
```

Requirements:

| Requirement | Reason |
|---|---|
| Node.js 20.9+ | Next.js 16 |
| Persistent writable disk | The store is `<project>/data` |
| **Exactly one instance** | The write queue is in-process |
| HTTPS in production | The session cookie is `Secure` when `NODE_ENV=production` |
| `data/` on a volume surviving restarts | Otherwise all state is lost |

### Environment variables

**None.** The application reads no configuration beyond `NODE_ENV`, which
Next.js sets. There are no secrets to manage and no `.env` file is required.

### Vercel and serverless are unsupported

**Decided.** This version must **not** be deployed to Vercel or any serverless
or multi-instance platform:

- The filesystem is read-only apart from a temporary directory.
- Each invocation may run on a different instance, so writes are not shared.
- Instances are recycled, discarding anything written.

The build and deployment would **succeed**, which is precisely the danger: the
application then loses data silently. Serverless deployment requires replacing
`lib/storage/` with an external database — a deliberate future migration, not a
configuration change.

### Backup and restore

**Implemented · Verified**

`data/` is the entire application state.

- `npm run backup` copies every `data/*.json` file to `backups/<timestamp>/`,
  **verifies each copy against a SHA-256 checksum**, and writes a
  `MANIFEST.json` recording the digests.
- The script is **additive only** — it reads `data/` and writes a new folder. It
  can never overwrite live data.
- **Restore is deliberately manual**, so no command exists that can destroy live
  data by accident: stop the application, take a fresh backup, copy the files
  over `data/`, verify against the manifest, restart.
- `backups/` is git-ignored.

Scheduling backups and copying them off the machine is a deployment
responsibility (§20).

### Repository hygiene

**Implemented · Verified**

- `.env.local` **removed** — it held stale MongoDB credentials from an abandoned
  investigation. No `.env` file remains and none is needed.
- Git-ignored: `data/*.json`, `backups/`, `.claude/`, `node_modules`, `.next`,
  `.env*`.
- Verified that no secret or personal data would be committed.

---

## 20. Pending / Deployment Decisions

These are **open**. They are not gaps in the implementation.

### 20.1 Loading state vs exact HTTP 404 semantics

- **Current choice:** keep `app/app/loading.tsx`.
- **Known consequence:** `loading.tsx` wraps the segment in Suspense, so Next
  flushes HTTP 200 before the page runs `notFound()`. In-route not-found
  responses therefore return **HTTP 200** instead of 404. Confirmed in the
  production build, not only in development.
- **User-visible behaviour is unaffected** — the correct "Project not found" /
  "Task not found" UI still renders, and genuinely unknown URLs still return a
  true 404.
- **Alternative if exact semantics become important:** restructure `/app` with a
  route group so the loading boundary applies only where `notFound()` is never
  called. This moves route files and was judged too invasive for a hardening
  pass.

### 20.2 Deployment host

- Must support a **single persistent Node process** with a **writable persistent
  disk**.
- **Vercel/serverless is unsupported** for the current architecture (§19).
- The host has not been chosen.

### 20.3 First Git commit

- The repository is **prepared** — `.gitignore` verified, no secrets would be
  committed.
- **The first commit has not been made.** The project currently exists only as
  working-directory files, with no history and no rollback.

### 20.4 Backup operations

- `npm run backup` **exists and is verified**.
- **Scheduling it and copying backups off the machine remains a deployment
  responsibility.** No schedule is configured.

---

## 21. Known Limitations of JSON Storage

**Accepted for this version.**

1. **Single process only.** The write queue lives in memory. Two Node processes
   would interleave read-modify-write cycles and lose data.
2. **A writable, persistent disk is required.**
3. **Individual writes are atomic; sequences are not.** A crash between two
   related writes can leave partial state.
4. **No transactions and no database-level referential integrity** — both are
   enforced in application code.
5. **Whole-file rewrite per change.** Suitable for hundreds of records; it will
   degrade in the tens of thousands.
6. **All signed-in users see all data.** Task assignment records who is working
   on something; it is not access control.
7. **Backups are not automatic.**

**Assessment:** safe for the current scope — a single user, on one machine, with
a persistent disk. Not safe for multi-instance or serverless hosting.

---

## 22. Verification and QA Process

**Established · Applied throughout**

Every feature was verified against a running application. The protocol for any
change touching data:

1. **Back up** the real data files and record SHA-256 checksums.
2. **Seed temporary QA records** — projects, tasks in every status and priority,
   varied due dates, tags, work logs, and additional user accounts as needed.
3. **Test end-to-end**: CRUD, search, filtering, sorting, assignment, export,
   authentication and session behaviour, accessibility, and responsive layout at
   1280 / 768 / 375 / 320.
4. **Remove all QA records**, including QA user accounts and sessions.
5. **Restore the real data** and verify every file is **byte-identical** by
   SHA-256.
6. **Confirm no QA residue** remains by scanning the data files.

This protocol was followed for every section and every restoration verified
byte-for-byte.

### Standing checks

`npm run typecheck` · `npm run lint` · `npm run build` — all must pass before a
section is considered complete. There is no automated test framework; the
verification is manual, evidence-based, and recorded.

---

## 23. Scope of This Foundation

**In scope and implemented:** projects, tasks, work logs, task assignment,
search/filter/sort, dashboard, activity history, Excel export, authentication
and sessions, appearance and password settings, loading/error/not-found/empty
states, backup, and deployment documentation.

**Deferred, deliberately:**

- Supabase or any database migration (§6)
- Ownership, visibility scoping, roles, and permissions (§10)
- Email verification, password reset, OAuth, 2FA (§7)
- Default task priority and status preferences (§14)
- Pagination (§12)
- Assignee on the dashboard (§10)
- An automated test framework (§22)

**Not to be changed without a new decision:** the JSON storage architecture, the
authentication and session model, ExcelJS and its accepted advisory, the 1024px
task-table breakpoint, and the single-implementation rule for task filtering.
