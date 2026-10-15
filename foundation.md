# Project Task Manager Foundation

## 1. Purpose

This document records the technical foundation of the Project Task Manager: the
technology choices, storage strategy, authentication model, feature set, and
project-level rules **as they are actually implemented and verified**.

The application is a small work tracker for a frontend developer and the few
people working alongside them. It answers three questions:

- What am I working on?
- What is pending?
- What did I actually do, and when?

> **Amended — the application is multi-account, not single-user.** It began as a
> single-user tracker and the specification is written that way. It is now
> deliberately multi-account: accounts are created by the instance owner from
> Settings (§7, §14), tasks can be assigned to a named person (§10), and every
> account has its own credentials and sessions.
>
> **Work is scoped by assignment (§24).** A member sees the tasks assigned to
> them and the projects holding those tasks, and nothing else. The owner sees
> everything and is the only person who creates projects and tasks or decides
> who holds them. Adding an account is still a meaningful act, which is why
> public registration is closed (§7) and account creation belongs to the owner.
>
> This is scoping, not tenancy: there is one instance, one owner, and one shared
> database, and the owner can see everyone's work.

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
| Persistence | **Supabase (PostgreSQL)** via `@supabase/supabase-js` |
| Validation | Zod 4 |
| Password hashing | bcryptjs 3, cost factor 12 |
| Spreadsheet export | ExcelJS 4.4.0 |
| Server/client boundary | `server-only` |
| Module system | ESM |
| Linting | ESLint 9 with `eslint-config-next` |

The complete runtime dependency list is nine packages:
`@supabase/supabase-js`, `@supabase/ssr`, `bcryptjs`, `exceljs`, `next`,
`react`, `react-dom`, `server-only`, `zod`.

> **Amended (Supabase migration).** Persistence moved from local JSON files to
> Supabase PostgreSQL. The reason was concrete: the application was deployed to
> Vercel and login did not work, because a serverless filesystem is read-only
> and instances are not shared, so sessions never persisted.
>
> `@supabase/ssr` is currently unused — it exists to refresh *Supabase Auth*
> sessions, and this project keeps its own authentication (§7).

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
Storage layer       lib/storage/*        ← the only code that reaches the database
      │
      ▼
Supabase PostgreSQL
```

### Layer rules

- UI components never reach the database, and never import the storage layer.
- Every module under `lib/storage/` and every server-side query module begins
  with `import "server-only"`, so a client import is a **build failure**, not a
  runtime bug.
- Mutations are Server Actions. There is exactly one HTTP route handler in the
  application (§13), because a file download requires real response headers,
  which a Server Action cannot provide.
- Business calculations live in the domain modules, not in components.

**Verified:** 21 modules carry `server-only`; a scan of every `"use client"`
file's imports finds no client component importing a server-only module. Zod and
all validation schemas remain server-side.

### Directory layout

```text
app/            Routes and layouts (App Router)
components/     UI components (ui, layout, auth, projects, tasks, work-logs,
                dashboard, settings)
lib/            Domain modules, storage layer, helpers
lib/storage/    Supabase data layer (server-only)
types/          Shared TypeScript types
scripts/        Maintenance scripts (backup, Supabase migration)
supabase/       schema.sql
data/           Legacy JSON snapshot (git-ignored, no longer used at runtime)
backups/        Local backups of the legacy snapshot (git-ignored)
```

`hooks/` and `public/` exist from the specification's suggested structure (§28
of the specification) and are currently empty. They are retained deliberately.

---

## 6. Data Persistence

**Decided · Implemented · Verified**

Persistence is **Supabase PostgreSQL**, reached from the server through
`@supabase/supabase-js`.

> **Amended.** This section previously specified local JSON files. That choice
> satisfied specification §4 ("the simplest appropriate solution") for local
> single-user use, but it made the application undeployable: on Vercel the
> filesystem is read-only and instances are not shared, so login silently failed
> because sessions never persisted. Specification §4 also required that "the
> architecture should allow the storage layer to be replaced later if required",
> and that is exactly what happened — the swap changed `lib/storage/*` and nine
> call sites, and **no route, component, form, or validation schema changed.**

### Collections

| Table | Record | Id prefix |
|---|---|---|
| `users` | `User` | `user_` |
| `sessions` | `Session` | 32 random bytes, base64url (§7) |
| `projects` | `Project` | `project_` |
| `tasks` | `Task` | `task_` |
| `work_logs` | `WorkLog` | `worklog_` |
| `activities` | `Activity` | `activity_` |

The schema lives in `supabase/schema.sql` and is applied once through the
Supabase SQL Editor.

### The storage interface

`lib/storage/collection.ts` exports one factory, `createCollection<T>(table,
idPrefix)`, returning:

```ts
list()          find(id)          findWhere(filter)   findOneWhere(filter)
insert(data, id?)                 update(id, changes)
remove(id)      removeWhere(filter)
```

**Amended:** `findWhere` / `findOneWhere` / `removeWhere` previously took a
JavaScript predicate. A predicate cannot cross a database boundary, so they now
take an equality filter object. Every call site was a simple equality except two
comparisons — the session expiry sweep and "revoke all sessions but this one" —
which became explicit queries in `lib/storage/sessions.ts`.

Two conventions are translated in the storage layer and nowhere else:

- TypeScript camelCase ↔ Postgres snake_case.
- TypeScript optional properties ↔ SQL `NULL`. A `NULL` column is omitted from
  the record; an absent property is written as `NULL`, which clears the column.

### Write safety

- **Atomic per statement.** An update is a single SQL statement, so the
  read-modify-write race the JSON layer had to guard against no longer exists.
- **Concurrency handled by Postgres.** The in-process write queue is gone; it
  was a single-instance construct and is unnecessary here.
- **Referential integrity enforced by the database** through foreign keys, not
  only by application code.

### Identifiers

Ids remain prefixed, sortable, opaque strings — `prefix_` + base36 timestamp +
random hex — stored as `text` primary keys. Keeping the existing format meant
every migrated record retained its id and every relationship survived intact.

### Dates

- **Timestamps** (`createdAt`, `updatedAt`) are `timestamptz`.
- **Calendar-only values** (`Project.startDate`, `Project.targetDate`,
  `Task.dueDate`, `Task.startedAt`, `Task.completedAt`, `WorkLog.date`) are
  `date` columns, still surfaced as `YYYY-MM-DD` strings.

The database now enforces the calendar/timestamp split that was previously only
a convention.

### Derived data is never stored

Unchanged. Project progress, task counts, logged time, and all dashboard
statistics are computed on read.

### Access model and security

The application authenticates users itself (§7) and reaches Postgres **only from
the server**, using the **service-role key**. Row Level Security is enabled on
every table with **no policies**, so the publishable key — which does reach
browsers — can read and write nothing.

RLS is declared in `supabase/schema.sql`, which ends with
`alter table … enable row level security` for **all six** tables — `users`,
`sessions`, `projects`, `tasks`, `work_logs`, `activities` — and defines no
policy on any of them.

**Verified with real data present:** the service-role client sees all rows; the
publishable key returns **zero** rows on all six tables, and its `INSERT` is
rejected with `42501` while `UPDATE` and `DELETE` affect no rows.

> **Audit note — how to re-run that check.** The publishable/anon key is
> deliberately **not** in `.env.local`, because the application never uses one.
> The zero-rows test above therefore cannot be repeated from the repository
> alone, and PostgREST does not expose `pg_catalog`, so RLS state cannot be read
> back through the API either. What *was* re-confirmed during the pre-production
> audit: the schema enables RLS on all six tables with no policies, and REST
> requests to all six with **no key** and with an **invalid key** are rejected
> `401`. To re-prove enforcement directly, run in the Supabase SQL Editor:
>
> ```sql
> select relname, relrowsecurity
>   from pg_class
>  where relname in ('users','sessions','projects','tasks','work_logs','activities');
> select tablename, policyname from pg_policies where schemaname = 'public';
> ```
>
> Expected: `relrowsecurity = true` on all six rows, and the second query
> returning nothing.

### The legacy JSON snapshot

`data/*.json` is retained as a pre-migration fallback. It is **not read or
written by the application** — verified: zero filesystem calls and zero
references to `data/` anywhere in `lib/`, `app/`, or `components/`.

### Migration

`scripts/migrate-to-supabase.mjs` performed a one-off import. It upserts by
primary key, so it is re-runnable, and it never modifies the JSON files.
**Verified:** all 10 records migrated and compared field-by-field against the
source, including the bcrypt hash byte-for-byte, session id and expiry, and
every foreign key resolving to the correct parent row.

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
Supabase `sessions` table
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
| Store | Supabase `sessions` table, via the standard storage layer |
| Lifetime | 7 days |
| Expired-session cleanup | Swept on session creation via a SQL `delete ... where expires_at < now()`; an expired session is also removed the moment it is read |

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

**Users and sessions both live in Supabase.** Login reads the `users` row and
inserts a `sessions` row; every request resolves the cookie against that table;
logout deletes the row. Nothing about a signed-in user is held in process
memory, which is precisely why the application survives on serverless (§6, §19).

- Logged-out access to every protected route → `307 → /login`
- Forged cookie → `307 → /login`
- Expired session → rejected and swept from storage
- Logout → the session row is deleted from Supabase; protected routes then
  refuse, and `/app` redirects to `/login`
- Session survives reload — **and survives a full server restart**, because the
  session is a database row, not process state. Confirmed twice during the
  pre-production audit: the browser stayed signed in across restarts of
  `next start`.
- Fresh identifier issued per login (fixation prevented)
- The session cookie is unreadable from JavaScript — `document.cookie` returns
  empty while signed in, and returns only `theme=…` once a theme is chosen
- Password hash never appears in any rendered HTML
- Login errors are identical for unknown email and wrong password, so the
  *response body* cannot be used to discover which emails are registered.
  **Corrected:** the response *time* still differs — a miss returns before any
  bcrypt work, a hit pays the full cost-12 compare. Enumeration by timing is
  therefore possible. Recorded as a limitation, not fixed (§21).

### Deliberately excluded

Email verification, password reset, OAuth/social login, 2FA, roles, and
permissions are **Deferred** — excluded by specification §17 for v1.

### Registration

**Amended — public registration is now closed by default, and `/register`
redirects to `/login` when closed.**

Previously anyone reaching `/register` could create an account. Combined with
the absence of per-user data scoping (§21), a public deployment would have let
any visitor read and edit everything. Public registration resolves in this order, an explicit setting always winning:

1. **`ALLOW_REGISTRATION=true`** → open. Deliberate, for development or an
   emergency where no owner account can sign in.
2. **`ALLOW_REGISTRATION=false`** → closed, unconditionally. **This is the
   production configuration.** The bootstrap path below is **not** consulted.
3. **Unset** → closed, unless no account exists yet, so a fresh deployment can
   be bootstrapped by its first user.

**Production sets `ALLOW_REGISTRATION=false` explicitly, and `.env.example`
ships that line.** Unset would also be closed in practice once an account
exists, but only as a consequence of the data — the explicit setting states the
intent and is not silently re-opened by an empty table. The emergency route is
retained deliberately: `ALLOW_REGISTRATION=true` re-opens self-registration for
development, or for recovery when no owner account can sign in.

When closed, `/register` **redirects to `/login`** rather than rendering a form
that cannot be used, and the login page shows no register link. Both are
presentation: the security boundary is the check inside `registerUser()`.

The owner's Settings → Accounts flow is governed by `isOwner()` and is
**unaffected** by this setting.

The check lives in `isRegistrationOpen()` and is enforced inside
`registerUser()` — the single function that inserts a user — **before** the
write, so a direct Server Action call cannot bypass it. The `/register`
redirect and the hidden login link are presentation only.

**Verified against a production build with `ALLOW_REGISTRATION=false`:**

- `GET /register` → `307 → /login`.
- The login page contains zero register links.
- `registerAction` invoked **directly over HTTP**, bypassing the UI entirely —
  correct `Next-Action` id, correct RSC argument encoding, valid `Origin`, and a
  complete, schema-valid payload — returned
  `{"message":"Registration is closed. Ask the owner of this instance for an
  account."}`, issued no redirect, and wrote nothing. The guard, not the UI, is
  what refuses.
- With `ALLOW_REGISTRATION=true` the same form creates an account and signs the
  new user in, so the emergency route remains available.

### Instance owner

**The first account created owns the instance.** Ownership is derived from the
oldest `created_at`, so it needs no configuration and cannot be mistyped into
locking everyone out the way an environment variable could.

The owner has exactly **one** additional capability: adding accounts from
Settings (§14). Nothing else differs. This stays inside specification §17, which
excludes roles and permissions — there is no role column, no permission model,
and no second privilege.

`createUserAccount()` performs no authorisation of its own; each caller decides
who may reach it. Self-registration guards with `isRegistrationOpen()`, and the
Settings path guards with `isOwner()` **before** any write. Accounts created by
the owner are **not** signed in — the owner keeps their own session.

**Verified against a production build:**

- A non-owner's Settings page contains no Accounts section, and the only email
  in the response is their own — the other accounts do not leak.
- The owner's Settings page lists every account, marks the owner, and creates an
  account successfully.
- The created account exists in Supabase with **zero** sessions: it is not
  signed in, and the owner keeps their own session.
- Password mismatch and duplicate email are both rejected.
- **`createUserAction` invoked directly over HTTP by a non-owner** — valid
  session, correct `Next-Action` id, correct argument encoding — returned
  "Only the owner of this instance can add accounts." and wrote nothing. The
  same call with no session redirected to `/login`. Hiding the section is
  presentation; `isOwner()` is the boundary.

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

- Assignment is **the access grant** (§24). It records who is working on
  something *and* determines who can see it: a member sees a task only when it
  is assigned to them, and the project only because it holds that task.

  > **Amended.** This read "collaboration metadata, not access control … grants
  > no ownership, visibility, or permission of any kind." That was true until
  > per-user scoping was adopted (§24). The field did not change shape — no
  > migration was needed — it changed meaning.

- **Assigning is owner-only**, and so is moving a task between projects. A
  member may edit a task assigned to them but may not hand it on, because
  either act would move the work out of their own view.
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
- On success the new hash is written to the Supabase `users` row, and **all
  other sessions for that user are deleted from the Supabase `sessions` table
  while the current session is retained** (`deleteOtherSessions`). Both are
  database writes; nothing is held in process memory.
- The password hash is never exposed in any response.
- No activity entry is recorded for a password change — the activity history is
  about work, not security events.

**Verified against a production build:** with four sessions open for one
account, changing the password rewrote the `password_hash` in Supabase (the old
password no longer verifies, the new one does) and left exactly **one** session
row — the one that made the change. The other three were gone from the
database, not merely from a cookie.

### Accounts (owner only)

The owner sees an additional **Accounts** section listing every account with an
"Owner" marker, plus a form to add one. It reuses the registration schema, so
password rules cannot diverge from self-registration, and the existing hashing
helpers.

The copy tells the owner what an account actually grants: the new person sees
only the tasks assigned to them and the projects holding those tasks (§24), and
cannot create or change projects. It is a limited invitation, and the copy says
so rather than overstating it in either direction.

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
| **Loading** | **Removed.** See the note below. |
| **Error** | `app/app/error.tsx` renders `ErrorState` with a working retry. |
| **Not found** | `not-found.tsx` for each dynamic route — projects, tasks, work logs. |
| **Empty** | Graded empty states throughout, distinguishing "nothing exists yet" from "nothing matches your filters". |

**Retry behaviour.** The retry calls `router.refresh()` **and** `reset()` inside
a transition. `reset()` alone re-renders the cached failure and the error simply
reappears — this was found and fixed during hardening, when the store was still
JSON, by corrupting a data file, observing the boundary, repairing the file, and
confirming recovery without a page reload. The fix is storage-independent; the
equivalent trigger now is the database being unreachable.

**Invalid identifiers** render the correct "not found" UI. See §20.1 for the
status-code consequence of the loading boundary.

---

## 19. Deployment

**Decided · Documented**

### Supported model

**Amended.** Supabase holds all state, so the application is **stateless** and
runs anywhere with Node.js 20.9+ — **including Vercel and other serverless
platforms.**

```bash
npm ci
npm run build
npm run start
```

Requirements:

| Requirement | Reason |
|---|---|
| Node.js 20.9+ | Next.js 16 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only database access |
| HTTPS in production | The session cookie is `Secure` when `NODE_ENV=production` |

No writable disk, no single-instance constraint, and no persistent volume are
required any more.

### Environment variables

**Amended — the application previously required none.**

| Variable | Scope |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public; safe in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Bypasses RLS. Never `NEXT_PUBLIC_`, never committed |
| `ALLOW_REGISTRATION` | **Set to `false` in production.** `false` closes public registration unconditionally; `true` opens it deliberately (emergency/development); unset closes it unless no account exists. See §7 |

All three are documented with empty values in **`.env.example`**, which is the
only `.env*` file in git. `SUPABASE_SERVICE_ROLE_KEY` must never carry a
`NEXT_PUBLIC_` prefix.

**Verified:** the service-role key appears **zero** times across the 36 files of
the built client bundle, the string `SERVICE_ROLE` appears in none of them, and
a byte-exact search for the key's own value across the **whole** of `.next` —
server output included — returns no match.

### Final deployment architecture

**Decided.** This is the shape the application deploys in; nothing below is
open.

```text
Browser
   │  HTTPS. HTTP-only, SameSite=Lax, Secure session cookie (opaque id only)
   ▼
Next.js 16 App Router, Node.js 20.9+     ← stateless; any number of instances
   │  requireUser() at the layout, every page, every action, the export route
   ▼
lib/storage/*  (server-only, service-role key)
   ▼
Supabase PostgreSQL                      ← the single source of truth
```

- **One process type.** No separate API tier, no worker, no scheduler, no
  middleware, no websocket.
- **No local state.** No writable disk, no session affinity, no persistent
  volume. Instances are interchangeable, which is what makes serverless viable.
- **One outbound dependency at runtime:** Supabase over HTTPS.
- **Constraints that must hold in production:** HTTPS (the session cookie is
  `Secure`); both Supabase variables set on the host; `ALLOW_REGISTRATION=false`;
  and network-level restriction of who can reach the deployment, because there
  is no per-user data scoping (§21).
- **`data/*.json` has no runtime role.** It is a pre-migration snapshot, kept as
  a fallback, git-ignored, and never read or written by the application.
  Verified: no filesystem API and no reference to `data/` appears anywhere in
  `lib/`, `app/` or `components/`, and the files' checksums and mtimes are
  unchanged after a full production exercise of every feature.

### Previous limitation, now resolved

Earlier versions stored data in local JSON files and **could not run on Vercel**:
the filesystem is read-only, instances are not shared, and writes were silently
lost. This was observed in production — login appeared to succeed and the
session immediately vanished. It is what prompted the migration.

### Remaining deployment caution

Work is scoped by assignment (§24), so an account no longer implies sight of
everything — but **the owner account still does**, and scoping is enforced in
the application rather than at the database. Registration is closed by default,
which removes the anonymous path. For a public URL, also restrict who can reach
the deployment — for example Vercel Deployment Protection.

### Backup and restore

**Amended.** Supabase now holds all state, so backups are a database concern.

- Supabase provides automatic backups on its paid plans. On the free plan, take
  them manually (Dashboard → Database → Backups, or `pg_dump`).
- `npm run backup` still exists but now copies only the **legacy**
  `data/*.json` snapshot, with SHA-256 verification. Those files are the
  pre-migration record and are no longer read or written by the application.

Scheduling database backups is a deployment responsibility (§20).

### Repository hygiene

**Implemented · Verified**

> **Amended.** This section previously read "`.env.local` **removed** … No
> `.env` file remains and none is needed." That was true only before the
> Supabase migration, when the application required no configuration at all. A
> local `.env.local` is now **required** — `getSupabase()` throws without
> `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (§19). The earlier
> statement contradicted the environment-variable table in this same section and
> has been corrected.

- **`.env.local` is required and git-ignored.** It holds the Supabase URL, the
  service-role key, and `ALLOW_REGISTRATION=false`.
- **`.env.example` is committed** and documents all three variables with no
  values. It is the only `.env*` file in git.
- Git-ignored: `.env*` (except `.env.example`), `data/*.json`, `backups/`,
  `.claude/`, `node_modules`, `.next`, `*.tsbuildinfo`.
- **Verified:** `git log --all --name-only` shows no `.env` file and no
  `data/` file has **ever** been committed, in any commit; `git check-ignore`
  confirms `.env.local` is ignored; and the service-role key appears zero times
  anywhere in `.next` (§19).

---

## 20. Pending / Deployment Decisions

These are **open**. They are not gaps in the implementation.

### 20.1 Loading state vs exact HTTP 404 semantics — **RESOLVED**

- **Outcome:** `app/app/loading.tsx` was **removed**, because after the Supabase
  migration it left every `/app` route stuck on the loading fallback in the
  browser — the page never rendered (§18). Removing it also restored true
  **404** responses for `notFound()`, so both costs disappeared together.
- **Re-verified in the production build during the pre-production audit:** no
  `loading.tsx` exists anywhere under `app/`; every route renders its real
  content in the browser with no stuck fallback; and unknown URLs return a true
  `404`. The removal is settled and is not to be reversed without re-testing
  browser rendering against Supabase.
- Historical detail follows.

- **Former choice:** keep `app/app/loading.tsx`.
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

### 20.2 Deployment host — **RESOLVED**

- **Vercel**, now supported: Supabase holds all state, so the application is
  stateless (§19).
- Both environment variables must be set on the host, with
  `SUPABASE_SERVICE_ROLE_KEY` **not** prefixed `NEXT_PUBLIC_`.
- **Still open:** restricting who can reach a public URL, because there is no
  per-user data scoping (§21). Registration is closed by default (§7); Vercel
  Deployment Protection is the recommended additional guard.

### 20.3 Git history — **RESOLVED**

> **Amended.** This section previously read "The first commit has not been made
> … no history and no rollback." That is no longer true and has been corrected.

- The repository is under version control with a remote at
  `SB-Frontend/pq-task-manager`, and history begins at `de3af36 Initial commit`.
- Subsequent commits: `cbb18a0` (Supabase migration), `c29992a` (owner-managed
  accounts and registration lockdown, merged as `8cd3d4f`), `cb369b2`
  (foundation corrections).
- Current working branch: `feat/owner-accounts-and-registration-lockdown`.
- `.gitignore` verified; no secret or personal data has been committed at any
  point in the history (§19).

### 20.4 Backup operations

- **Amended:** backups are now a **database** concern. Supabase provides them
  automatically on paid plans; on the free plan they must be taken manually.
- `npm run backup` now covers only the legacy JSON snapshot.
- **Still open:** no database backup schedule is configured.

### 20.5 Per-user data scoping — **RESOLVED**

> **Amended.** This was previously open: "Every signed-in user sees all data …
> **Open:** whether to add ownership/visibility scoping." The decision has now
> been taken and implemented. See §24.

- **Outcome: assignment-based scoping.** A member sees a task only when it is
  assigned to them, and a project only when it holds such a task. The owner is
  unscoped.
- The deciding reason was practical rather than theoretical: with several
  accounts in use, every member could edit every project and every task, which
  is not what an assignment is meant to mean.
- Deliberately **not** adopted: a role or permission system, per-record
  ownership columns, or Supabase Auth / RLS policies for user data. The rule is
  derived from `tasks.assignee_id`, which already existed.

---

## 21. Known Limitations

**Amended.** The previous list described JSON-file constraints. Most are gone;
what remains is architectural.

### Resolved by the Supabase migration

| Former limitation | Status |
|---|---|
| Single process only | **Resolved** — Postgres handles concurrency |
| Writable persistent disk required | **Resolved** — no disk state |
| No transactions or referential integrity | **Resolved** — foreign keys enforced by the database |
| Whole-file rewrite per change | **Resolved** |
| Cannot deploy to serverless | **Resolved** |
| Backups not automatic | **Partly** — a database concern now (§19) |

### Still true

1. **Scoping is assignment-based, not ownership-based.** A member sees exactly
   the tasks assigned to them and the projects holding them (§24). What this
   does **not** give you: a member cannot be granted sight of a project without
   being given work in it, there is no "team" or "read-only observer", and
   unassigned work is owner-only. Those would need a real permission model,
   which remains deliberately out of scope.

   > **Superseded.** This entry previously read "No per-user data scoping.
   > Every signed-in user sees every project, task and work log … anyone
   > holding an account sees everything." That is no longer true; see §24.

2. **No rate limiting on login.** bcrypt at cost 12 makes guessing slow but not
   impossible. Best handled at a reverse proxy.
3. **Multi-statement sequences are not transactional.** Related writes are
   issued separately, so a failure between them can leave partial state.
   Individual statements are atomic.
4. **Spreadsheet formula injection is not guarded.** User-supplied text is
   written verbatim into Excel cells; a value beginning `=`, `+`, `-` or `@`
   is interpreted as a formula by Excel.
5. **Login is enumerable by timing.** The error message is identical for an
   unknown email and a wrong password, but an unknown email returns before any
   bcrypt work while a known one pays the full cost-12 compare. The usual remedy
   is to verify against a fixed dummy hash on the miss path. **Recorded during
   the pre-production audit; deliberately not fixed in this pass**, because it
   changes the login path and the deployment is access-restricted (§19).
6. **No HTTP security headers.** `next.config.ts` sets no `headers()`, so there
   is no Content-Security-Policy, `X-Frame-Options`/`frame-ancestors`,
   `Referrer-Policy` or HSTS, and `X-Powered-By: Next.js` is served. Nothing in
   the application depends on their absence; adding them is a configuration
   change, deferred to the deployment decision (§19).

**Assessment:** the storage architecture is suitable for real deployment,
including serverless. The remaining items are product and hardening decisions,
not storage constraints. Items 5 and 6 were found during the final
pre-production audit and are **accepted and deferred**, not overlooked.

---

## 22. Verification and QA Process

**Established · Applied throughout**

Every feature is verified against a running application.

> **Amended.** This protocol was written for the JSON store and told the reader
> to back up and restore `data/*.json`. **Those files are no longer the source of
> truth and copying them proves nothing** — the live data is in Supabase. The
> steps below operate on the database instead. The shape of the protocol is
> unchanged: snapshot, seed, exercise, remove, prove the real data is untouched.

The protocol for any change touching data:

1. **Snapshot the six Supabase tables.** For each table record the row count,
   the sorted list of ids, and a SHA-256 digest over the rows canonicalised
   (rows sorted by id, keys sorted). This is the baseline; it never leaves the
   machine and no credential is printed.
2. **Seed temporary QA records** — projects, tasks in every status and priority,
   varied due dates, tags, work logs, and additional accounts as needed. Seed by
   insertion only; **never modify an existing row**, so the real data cannot be
   damaged by the test itself. Ownership can be exercised without touching the
   real owner by inserting a QA account whose `created_at` predates it, since
   ownership is derived from the oldest `created_at` (§7).
3. **Test end-to-end** against a **production build** (`npm run build` +
   `npm run start`), not the dev server: CRUD, search, filtering, sorting,
   assignment, export, authentication and session behaviour, ownership and
   registration gating, accessibility, and responsive layout at
   1280 / 768 / 375 / 320.
4. **Remove every row that is not in the baseline**, in foreign-key-safe order
   (`work_logs`, `activities`, `tasks`, `sessions`, `projects`, `users`).
   Remember that ordinary use writes `activities` rows as a side effect — they
   are QA residue too.
5. **Re-read all six tables and compare digests to the baseline.** Every table
   must come back **identical**, with no extra and no missing ids. A differing
   digest means residue or damage, and is a failure.
6. **Confirm the legacy snapshot was not touched** — `data/*.json` checksums and
   mtimes must be unchanged, which is also evidence the application never reads
   or writes them.

Authorisation must be tested **below the UI**. Hiding a control proves nothing:
invoke the Server Action directly over HTTP with the correct `Next-Action` id
and argument encoding, once with no session, once as a non-owner, and confirm
the server refuses and writes nothing.

This protocol was followed for the final pre-production audit and the
restoration verified digest-for-digest across all six tables.

### Standing checks

`npm run typecheck` · `npm run lint` · `npm run build` — all must pass before a
section is considered complete. There is no automated test framework; the
verification is manual, evidence-based, and recorded.

---

## 23. Scope of This Foundation

**In scope and implemented:** Supabase persistence, projects, tasks, work logs, task assignment,
search/filter/sort, dashboard, activity history, Excel export, authentication
and sessions, appearance and password settings, loading/error/not-found/empty
states, backup, and deployment documentation.

**Deferred, deliberately:**


- Per-user data scoping, visibility rules, roles, and permissions (§10, §21).
  Instance ownership (§7) is the one exception and is not a role system.
- Email verification, password reset, OAuth, 2FA (§7)
- Default task priority and status preferences (§14)
- Pagination (§12)
- Assignee on the dashboard (§10)
- An automated test framework (§22)
- Login rate limiting and constant-time login (§21)
- HTTP security headers (§21)

**Not to be changed without a new decision:** the Supabase storage architecture
and its service-role/RLS access model, the custom authentication and
server-side session model, the closed-by-default registration gate and its
`ALLOW_REGISTRATION` escape hatch, owner-derived-from-oldest-account, the
absence of `loading.tsx` under `/app`, ExcelJS and its accepted advisory, the
1024px task-table breakpoint, and the single-implementation rule for task
filtering.

**Explicitly not adopted:** Supabase Auth, JWT authentication, authentication
middleware, a browser-side Supabase client, and any second persistence layer.
The application keeps its own authentication and reaches Postgres only from the
server (§6, §7).

**Completed since the original foundation:** the migration from local JSON files
to Supabase PostgreSQL (§6), owner-managed account creation (§7, §14), closing
public registration and making `ALLOW_REGISTRATION=false` the explicit
production configuration (§7), removal of `loading.tsx` (§20.1), and the final
pre-production audit that corrected the stale sections of this document
(§1, §7, §19, §20.3, §22).

---

## 24. Per-User Scoping

**Decided · Implemented · Verified**

> **Amended.** §21 previously recorded "No per-user data scoping" as a standing
> limitation and §20.5 left the decision open. Both are now superseded by this
> section.

### The rule

Visibility follows **assignment**. There is still no role column and no
permission table; the two states are derived from facts that already existed.

| | Owner | Member |
|---|---|---|
| Tasks visible | all | those with `assigneeId` = them |
| Projects visible | all | those holding at least one visible task |
| Work logs visible | all | those on a visible task |
| Activity visible | all | entries naming a visible task |
| Edit a visible task | yes | yes |
| Set a task's assignee or project | yes | **no** |
| Create a task | yes | **no** |
| Delete a task | yes | **no** |
| Create, edit or archive a project | yes | **no** |
| Log work on a visible task | yes | yes |

Three consequences, all deliberate:

- **Unassigned tasks are owner-only.** Assignment is the grant; without one
  there is nothing to see.
- **A member's project list is a by-product of their assignments.** A project
  appears when they are given work in it and disappears when that work is
  reassigned away. Nothing else adds or removes a project from their view.
- **A member's project figures describe their own work.** "1 of 2 complete"
  counts their tasks, not the project's. Counting tasks they cannot open would
  disclose how much hidden work exists.

### Why assignment rather than ownership

The alternative was a `created_by` column on projects and tasks, with
visibility following creation. It was rejected: it needs a schema migration and
a backfill, it invents a second notion of "whose" alongside the assignee that
already existed, and it answers a question nobody asked — the requirement was
"the person I assigned it to should see it", not "the person who typed it in
should keep it".

The assignee was already there, already meant exactly this, and needed **no
schema change**. `tasks.assignee_id` changed meaning rather than shape: it was
collaboration metadata (§10), and it is now the access grant. §10 is amended
accordingly.

### Where the rule lives

**`lib/auth/scope.ts` is the single implementation**, in the same way
`lib/tasks/filters.ts` is the single implementation of filtering. Every query
module and every mutating action derives its answer from it, so the list, the
detail page, the dashboard and the Excel export cannot disagree about what a
person may see. `requireViewer()` replaces `requireUser()` wherever a scoping
decision follows.

### Missing, not forbidden

A record the viewer may not see is reported as **absent**. Queries return
`null`, the route calls `notFound()`, and the response is a true 404 — the same
answer an id that was never real would get. A "forbidden" response would confirm
the id exists. Owner-only routes (`/app/projects/new`, `/app/tasks/new`,
`/app/projects/[id]/edit`) answer 404 for a member for the same reason.

The one deliberate exception is `updateTaskAction`, which answers "You can only
edit tasks that are assigned to you." The caller already holds the id, task ids
are not enumerable, and a task reassigned away mid-edit deserves a real reason
rather than a lie.

### The form is not the boundary

`updateTaskAction` **pins `projectId` and `assigneeId` to their stored values**
for anyone who may not set them, rather than trusting the submission. Hiding the
two selects (`lockPlacement` on `TaskForm`) keeps the form honest; the pinning is
what makes it true. A forged or stale post cannot move a task between projects
or hand it to someone else.

### Cost

Scoping adds no storage read. A member's tasks are narrowed by the database in
the query that already fetched them (`tasks.findWhere({ assigneeId })`), and
their project list is derived from the tasks already in hand. The task list is
still exactly three reads. Ownership resolution moved to a one-row query
(`getOldestUserId()`) because it is now consulted on nearly every request.

A member's reads also load fewer rows than an owner's, and `listAssignableUsers`
returns only the member themselves — a member never learns who else holds an
account.

### Verified against a production build

Exercised with a seeded member account holding one task, alongside the real
data, following the §22 protocol. Inserts only; no existing row was modified,
and all six tables were digest-identical to the baseline afterwards.

- **Member's view:** their project and task only — zero real project names and
  zero real task titles rendered anywhere, including the dashboard.
- **Direct URL access** to a project, task, task-edit, project-edit, work-log
  edit, `/app/projects/new` and `/app/tasks/new` → **404** for the member,
  **200** for the owner.
- **Server Actions invoked directly over HTTP**, bypassing the UI, with correct
  `Next-Action` ids and argument encoding:
  - member re-pointing `updateTaskAction` at a task that is not theirs →
    refused, nothing written;
  - member calling `createProjectAction` → refused;
  - member calling `createTaskAction` → refused;
  - member logging work on a task that is not theirs → refused;
  - member calling `deleteTaskAction` and `archiveProjectAction` → no-ops, the
    task still present and the project still active.
- **Pinning:** a member editing their **own** task while submitting a foreign
  `projectId` and `assigneeId` succeeded for title, status, priority and notes,
  and left `project_id` and `assignee_id` **unchanged**.
- **The intended story:** the owner assigned the member a task in a real
  project; that project then appeared in the member's list, showing **1** task
  to the member and **13** to the owner on the same page.
- **Export:** the member's workbook contained exactly their 2 tasks; the
  owner's contained all 27. An export can never hold a row its requester could
  not see on screen.
- **Owner's experience is unchanged** throughout.

### Still open

Scoping governs the application. It is **not** enforced at the database: the
server still reaches Postgres with the service-role key, so a defect in a query
module is not caught by a second layer. That remains acceptable for the same
reason as §6 — `lib/storage/` is `server-only` and every request passes through
`requireViewer()` — but it is the obvious next hardening step if the instance
ever carries data that must not mix.
