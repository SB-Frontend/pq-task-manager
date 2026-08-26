# Project Task Manager

A small, fast personal tracker for projects, tasks, and work logs.

## Stack

- Next.js (App Router) + React
- TypeScript
- Tailwind CSS
- **Supabase (PostgreSQL)** for all persistent data
- Email / password authentication with server-side sessions
- Excel export via ExcelJS

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run dev
```

The application runs at http://localhost:3000.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Safe in the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Bypasses RLS and grants full database access. |
| `ALLOW_REGISTRATION` | Optional. `true` temporarily opens registration. See below. |

`SUPABASE_SERVICE_ROLE_KEY` must **never** carry a `NEXT_PUBLIC_` prefix and must
never be committed. Find it in Supabase under Project Settings → API →
`service_role`.

`NODE_ENV=production` additionally marks the session cookie `Secure`, so
production must be served over HTTPS.

## Database

All application data lives in Supabase PostgreSQL:

| Table | Contents |
| --- | --- |
| `users` | Accounts and bcrypt password hashes |
| `sessions` | Server-side sessions |
| `projects` | Projects |
| `tasks` | Tasks, including `assignee_id` |
| `work_logs` | Work sessions, linked to a task |
| `activities` | Lightweight activity history |

### First-time setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL Editor. It creates all six tables with
   foreign keys and indexes, and enables Row Level Security.
3. Put the URL and `service_role` key in `.env.local`.

### Access model

The application authenticates users itself and reaches Postgres **only from the
server**, using the service-role key. Row Level Security is enabled on every
table with **no policies**, so the publishable key — which does reach browsers —
can read and write nothing. Verified: with real data present, the public key
returns zero rows and its inserts, updates and deletes are all rejected.

All database access goes through `lib/storage/`, which is `server-only`. A
client component importing it is a build failure, not a runtime bug.

## Registration

**Registration is closed by default.** It is open only when:

1. No account exists yet, so a fresh deployment can be bootstrapped, or
2. `ALLOW_REGISTRATION=true` is explicitly set.

This matters because the application has **no per-user data scoping** — every
signed-in user sees every project, task and work log. Task assignment records
who is working on something; it is not access control. Leaving registration open
on a public URL would let anyone read and edit everything.

To add someone: set `ALLOW_REGISTRATION=true`, have them register, then remove
the variable and redeploy.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run backup` | Copy the legacy `data/` JSON files to a checksummed backup |
| `npm run migrate:supabase` | One-off import of `data/*.json` into Supabase |

## Deployment

Supabase handles persistence, so the application is **stateless** and deploys
anywhere that runs Node.js 20.9+ — including **Vercel and other serverless
platforms**.

Set both environment variables on the host, then deploy:

```bash
npm ci
npm run build
npm run start
```

On Vercel, add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` under
Settings → Environment Variables. The service-role key must not be prefixed
`NEXT_PUBLIC_`.

> **Earlier versions stored data in local JSON files and could not run on
> Vercel** — the filesystem is read-only and instances are not shared, so writes
> were silently lost. That limitation is gone.

### Recommended before exposing a public URL

Because there is no per-user data scoping, restrict who can reach the
deployment — for example Vercel Deployment Protection, or hosting it behind a
private network — and keep registration closed.

## Backups

Supabase provides automatic backups on its paid plans; on the free plan, take
your own periodically (Supabase Dashboard → Database → Backups, or `pg_dump`).

`npm run backup` copies the **legacy** `data/*.json` files with SHA-256
verification. Those files are the pre-migration snapshot, retained as a
fallback. They are no longer read or written by the application.

## Structure

```text
app/           Routes and layouts (App Router)
components/    Reusable UI components
lib/           Server-side data access, helpers, configuration
lib/storage/   Supabase data layer (server-only)
types/         Shared TypeScript types
scripts/       Maintenance scripts (backup, migration)
supabase/      schema.sql
data/          Legacy JSON snapshot, git-ignored, no longer used at runtime
```

## Known dependency advisory

`exceljs@4.4.0` pulls in `uuid@8.3.2`, which carries a moderate advisory
("missing buffer bounds check in v3/v5/v6 when `buf` is provided"). ExcelJS
4.4.0 is the latest release and npm's suggested remedy is a major downgrade. The
vulnerable path requires passing a caller-controlled buffer into `uuid`, which
ExcelJS never exposes, so it is not reachable from this application. This is an
accepted, recorded decision.
