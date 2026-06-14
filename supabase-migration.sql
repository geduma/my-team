create table public.events (
  id uuid primary key default gen_random_uuid(),
  hash text unique not null,
  owner_id text not null,
  title text not null,
  date text not null,
  time text not null,
  location text not null,
  type text default 'match',
  max_players integer default 22,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  user_id text not null,
  display_name text not null,
  photo_url text,
  team text,
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

create index idx_players_event_id on public.players(event_id);

-- anonymous read/write access
alter table public.events enable row level security;
alter table public.players enable row level security;

create policy "Anyone can read events"
  on public.events for select using (true);

create policy "Anyone can insert events"
  on public.events for insert with check (true);

create policy "Anyone can update events"
  on public.events for update using (true);

create policy "Anyone can delete events"
  on public.events for delete using (true);

create policy "Anyone can read players"
  on public.players for select using (true);

create policy "Anyone can insert players"
  on public.players for insert with check (true);

create policy "Anyone can delete players"
  on public.players for delete using (true);
