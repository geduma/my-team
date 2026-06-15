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

-- tournaments
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  title text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  display_name text not null,
  team_name text not null,
  user_id text,
  created_at timestamptz default now()
);

create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  round integer not null,
  home_participant_id uuid references public.tournament_participants(id),
  away_participant_id uuid references public.tournament_participants(id),
  home_score integer,
  away_score integer,
  status text default 'pending',
  details text,
  created_at timestamptz default now()
);

create index idx_tournament_participants_tournament_id on public.tournament_participants(tournament_id);
create index idx_tournament_matches_tournament_id on public.tournament_matches(tournament_id);

alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.tournament_matches enable row level security;

create policy "Anyone can read tournaments"
  on public.tournaments for select using (true);

create policy "Anyone can insert tournaments"
  on public.tournaments for insert with check (true);

create policy "Anyone can update tournaments"
  on public.tournaments for update using (true);

create policy "Anyone can delete tournaments"
  on public.tournaments for delete using (true);

create policy "Anyone can read tournament_participants"
  on public.tournament_participants for select using (true);

create policy "Anyone can insert tournament_participants"
  on public.tournament_participants for insert with check (true);

create policy "Anyone can delete tournament_participants"
  on public.tournament_participants for delete using (true);

create policy "Anyone can read tournament_matches"
  on public.tournament_matches for select using (true);

create policy "Anyone can insert tournament_matches"
  on public.tournament_matches for insert with check (true);

create policy "Anyone can update tournament_matches"
  on public.tournament_matches for update using (true);

create policy "Anyone can delete tournament_matches"
  on public.tournament_matches for delete using (true);
