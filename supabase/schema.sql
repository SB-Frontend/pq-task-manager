-- Project Task Manager — initial schema
--
-- Run this once in the Supabase SQL Editor.
--
-- Design notes:
--   * Ids are TEXT, preserving the application's existing prefixed ids
--     (project_..., task_...) so migrated data keeps every relationship.
--   * Statuses use CHECK constraints rather than Postgres enums: the
--     application's unions change occasionally and altering a CHECK is a
--     one-line migration.
--   * Calendar-only fields are DATE; timestamps are TIMESTAMPTZ. This mirrors
--     the application's existing convention and keeps due dates timezone-safe.
--   * Row Level Security is enabled with NO policies. The application reaches
--     Postgres only from the server using the service_role key, which bypasses
--     RLS. Any anon/publishable key therefore reads nothing.

create table if not exists users (
  id            text primary key,
  email         text not null unique,
  password_hash text not null,
  name          text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists sessions (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_id_idx on sessions (user_id);
create index if not exists sessions_expires_at_idx on sessions (expires_at);

create table if not exists projects (
  id          text primary key,
  name        text not null,
  client      text,
  description text,
  status      text not null default 'active'
              check (status in ('active','completed','archived')),
  start_date  date,
  target_date date,
  created_at  timestamptz not null,
  updated_at  timestamptz not null
);
create index if not exists projects_status_updated_idx on projects (status, updated_at desc);

create table if not exists tasks (
  id                text primary key,
  project_id        text not null references projects(id) on delete restrict,
  assignee_id       text references users(id) on delete set null,
  title             text not null,
  description       text,
  status            text not null default 'pending'
                    check (status in ('pending','in_progress','completed','blocked')),
  priority          text not null default 'medium'
                    check (priority in ('low','medium','high')),
  tags              text[] not null default '{}',
  estimated_minutes integer check (estimated_minutes >= 0),
  actual_minutes    integer check (actual_minutes >= 0),
  notes             text,
  due_date          date,
  started_at        date,
  completed_at      date,
  created_at        timestamptz not null,
  updated_at        timestamptz not null
);
create index if not exists tasks_project_updated_idx on tasks (project_id, updated_at desc);
create index if not exists tasks_assignee_idx on tasks (assignee_id);

create table if not exists work_logs (
  id          text primary key,
  task_id     text not null references tasks(id) on delete cascade,
  date        date not null,
  minutes     integer not null check (minutes > 0),
  description text not null,
  created_at  timestamptz not null
);
create index if not exists work_logs_task_date_idx on work_logs (task_id, date desc);

create table if not exists activities (
  id         text primary key,
  type       text not null,
  message    text not null,
  project_id text references projects(id) on delete set null,
  task_id    text references tasks(id)    on delete set null,
  created_at timestamptz not null
);
create index if not exists activities_created_at_idx on activities (created_at desc);

-- Deny everything to anon / publishable keys. The server uses service_role,
-- which bypasses RLS by design.
alter table users      enable row level security;
alter table sessions   enable row level security;
alter table projects   enable row level security;
alter table tasks      enable row level security;
alter table work_logs  enable row level security;
alter table activities enable row level security;
