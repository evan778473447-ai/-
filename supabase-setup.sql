
-- Run this once in Supabase: SQL Editor → New query.
create table if not exists public.todo_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  groups jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.todo_states enable row level security;

create policy "Users manage only their own todo state"
on public.todo_states
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- In Authentication → Providers, ensure Email is enabled.

