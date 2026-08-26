# Project Task Manager

A small, fast personal tracker for projects, tasks, and work logs.

## Stack

- Next.js (App Router) + React
- TypeScript
- Tailwind CSS
- Local JSON file storage
- Email / password authentication with server-side sessions
- Excel export via ExcelJS

## Getting started

```bash
npm install
npm run dev
```

The application runs at http://localhost:3000. No database, no environment
variables, and no external services are required.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run backup` | Copy `data/` to a timestamped, checksummed backup |

## Environment variables

**None.** The application reads no configuration beyond `NODE_ENV`, which
Next.js sets for you. `NODE_ENV=production` additionally marks the session
cookie `Secure`, so production must be served over HTTPS.

## Data storage

Records are stored as JSON files in `data/`:

```text
data/
  users.json
  sessions.json
  projects.json
  tasks.json
  work-logs.json
  activities.json
```

Each file holds a JSON array and is created automatically on first use, so a
fresh clone needs no setup. The files are git-ignored: they hold personal data,
not source code.

All file access goes through the server-side storage layer in `lib/storage/`.
UI components never read or write files themselves.

### How writes are kept safe

- **Serialised.** Every write across every collection passes through a single
  in-process queue, so two overlapping requests cannot lose one another's
  changes.
- **Atomic.** Content is written to a temporary file and then renamed over the
  target, so a reader never sees a half-written file and a crash mid-write
  cannot corrupt one.

### Limitations you must understand

1. **Single process only.** The write queue lives in memory. Two Node processes
   (a cluster, PM2 in cluster mode, or several instances behind a load
   balancer) would interleave read-modify-write cycles and lose data.
2. **A writable, persistent disk is required.** The store is
   `<project>/data` resolved from the working directory.
3. **Individual writes are atomic; sequences are not.** A crash between two
   related writes can leave partial state.
4. **No transactions or referential integrity.** Both are enforced in
   application code.
5. **Whole-file rewrite per change.** Fine for hundreds of records; it will
   degrade in the tens of thousands.
6. **All signed-in users see all data.** Task assignment records who is working
   on something; it is not access control.

## Deployment

### Supported model

A **single long-running Node process with a persistent, writable disk**:

```bash
npm ci
npm run build
npm run start          # serves on PORT, default 3000
```

Suitable targets: a VPS, a container with a mounted volume, or your own
machine. Requirements:

- Node.js 20.9+ (Next.js 16)
- Read/write permission on `data/`
- Exactly **one** application instance (see limitation 1 above)
- HTTPS in production, so the `Secure` session cookie is honoured
- `data/` on a volume that survives restarts and redeploys

### Not supported: Vercel and other serverless platforms

**Do not deploy this version to Vercel, or to any serverless or
multi-instance platform.** The build and deployment will *succeed*, which is
what makes it dangerous — the application will then lose data silently:

- The filesystem is read-only apart from a temporary directory
- Each invocation may run on a different instance, so writes are not shared
- Instances are recycled, discarding anything written

Users would register, create projects, and find them gone, with no error shown.

Serverless deployment requires replacing `lib/storage/` with an external
database. That is a deliberate future migration, not a configuration change.

## Backup and restore

`data/` is the entire application state. Back it up regularly.

### Backup

```bash
npm run backup
```

Copies every `data/*.json` file to `backups/<timestamp>/`, verifies each copy
against a SHA-256 checksum, and writes a `MANIFEST.json` recording the digests.
The command only ever reads `data/` and writes a new folder — it can never
overwrite live data. `backups/` is git-ignored.

Schedule it with cron, Task Scheduler, or a timer unit, and copy the folder
off the machine.

### Restore

Restoring is intentionally manual, so no command exists that can overwrite live
data by accident:

1. **Stop the application.**
2. Back up the current state first: `npm run backup`
3. Copy the files from the chosen backup folder over `data/`.
4. Verify against the backup's `MANIFEST.json`:

   ```bash
   node -e "const fs=require('fs'),c=require('crypto'),p=require('path');const d=process.argv[1];const m=JSON.parse(fs.readFileSync(p.join(d,'MANIFEST.json'),'utf8'));for(const f of m.files){const h=c.createHash('sha256').update(fs.readFileSync(p.join('data',f.file))).digest('hex');console.log(f.file, h===f.sha256?'OK':'MISMATCH');}" backups/<timestamp>
   ```

5. Start the application.

Sessions are part of the data. Restoring an older `sessions.json` may sign
users out, which is expected and harmless.

## Structure

```text
app/           Routes and layouts (App Router)
components/    Reusable UI components
lib/           Server-side data access, helpers, configuration
lib/storage/   JSON storage layer (server-only)
types/         Shared TypeScript types
scripts/       Maintenance scripts (backup)
data/          JSON data files (git-ignored)
backups/       Local backups (git-ignored)
```

## Known dependency advisory

`exceljs@4.4.0` pulls in `uuid@8.3.2`, which carries a moderate advisory
("missing buffer bounds check in v3/v5/v6 when `buf` is provided"). ExcelJS
4.4.0 is the latest release and npm's suggested remedy is a major downgrade.
The vulnerable path requires passing a caller-controlled buffer into `uuid`,
which ExcelJS never exposes, so it is not reachable from this application.
This is an accepted, recorded decision.
