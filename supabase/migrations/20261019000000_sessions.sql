-- Practice session history, synced from the app (src/sync/supabaseRemote.ts).
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table public.sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id text not null,
  plan_name text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  completed boolean not null,
  planned_total_sec integer not null,
  actual_total_ms bigint not null,
  paused_total_ms bigint not null,
  sections jsonb not null,
  -- When the record was last changed, by the device that changed it. Newest change wins.
  modified_at timestamptz not null,
  -- Soft delete, so deletions reach other devices.
  deleted_at timestamptz,
  -- Set by the server on every write; the app's pull cursor.
  updated_at timestamptz not null default now()
);

create index sessions_user_updated_at_idx on public.sessions (user_id, updated_at);

alter table public.sessions enable row level security;

create policy "Read own sessions" on public.sessions
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Insert own sessions" on public.sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Update own sessions" on public.sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No delete policy: the app soft-deletes via deleted_at.

-- Stamp updated_at, and ignore writes older than what's stored (last write wins).
create function public.sessions_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.modified_at < old.modified_at then
      return null;
    end if;
    new.user_id := old.user_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger sessions_before_write
  before insert or update on public.sessions
  for each row execute function public.sessions_before_write();
