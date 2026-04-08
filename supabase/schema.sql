create table if not exists public.club_data_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clubs (
  id text primary key,
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.club_memberships (
  club_id text not null references public.clubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'manager',
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, user_id)
);

create table if not exists public.club_players (
  club_id text not null references public.clubs (id) on delete cascade,
  id text not null,
  name text not null,
  number integer,
  position text,
  role text not null,
  active boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, id)
);

create table if not exists public.club_training_sessions (
  club_id text not null references public.clubs (id) on delete cascade,
  id text not null,
  title text not null,
  date text not null,
  location text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, id)
);

create table if not exists public.club_attendance_records (
  club_id text not null references public.clubs (id) on delete cascade,
  session_id text not null,
  player_id text not null,
  status text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, session_id, player_id)
);

create table if not exists public.club_fixtures (
  club_id text not null references public.clubs (id) on delete cascade,
  id text not null,
  opponent text not null,
  grade text,
  date text not null,
  venue text not null,
  is_home boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, id)
);

create table if not exists public.club_availability_records (
  club_id text not null references public.clubs (id) on delete cascade,
  fixture_id text not null,
  player_id text not null,
  status text not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, fixture_id, player_id)
);

create table if not exists public.club_match_stats (
  club_id text not null references public.clubs (id) on delete cascade,
  fixture_id text not null,
  metric text not null,
  team text not null check (team in ('ours', 'theirs')),
  value integer not null default 0 check (value >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, fixture_id, metric, team)
);

create table if not exists public.club_vote_entries (
  club_id text not null references public.clubs (id) on delete cascade,
  fixture_id text not null,
  player_id text not null,
  points integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, fixture_id, player_id)
);

create table if not exists public.club_fitness_results (
  club_id text not null references public.clubs (id) on delete cascade,
  player_id text not null,
  metric text not null,
  phase text not null,
  value numeric not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, player_id, metric, phase)
);

alter table public.club_data_snapshots enable row level security;
alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
alter table public.club_players enable row level security;
alter table public.club_training_sessions enable row level security;
alter table public.club_attendance_records enable row level security;
alter table public.club_fixtures enable row level security;
alter table public.club_availability_records enable row level security;
alter table public.club_match_stats enable row level security;
alter table public.club_vote_entries enable row level security;
alter table public.club_fitness_results enable row level security;

create policy "Users can read their own club data"
on public.club_data_snapshots
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own club data"
on public.club_data_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own club data"
on public.club_data_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Authenticated users can create clubs"
on public.clubs
for insert
to authenticated
with check (auth.uid() = created_by);

create policy "Club members can read clubs"
on public.clubs
for select
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = clubs.id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Users can read their own memberships"
on public.club_memberships
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own memberships"
on public.club_memberships
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Club members can read their own players"
on public.club_players
for select
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_players.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can insert players"
on public.club_players
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_players.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can update players"
on public.club_players
for update
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_players.club_id
      and club_memberships.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_players.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can delete players"
on public.club_players
for delete
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_players.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can read training sessions"
on public.club_training_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_training_sessions.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can insert training sessions"
on public.club_training_sessions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_training_sessions.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can update training sessions"
on public.club_training_sessions
for update
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_training_sessions.club_id
      and club_memberships.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_training_sessions.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can delete training sessions"
on public.club_training_sessions
for delete
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_training_sessions.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can read attendance"
on public.club_attendance_records
for select
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_attendance_records.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can insert attendance"
on public.club_attendance_records
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_attendance_records.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can update attendance"
on public.club_attendance_records
for update
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_attendance_records.club_id
      and club_memberships.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_attendance_records.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can delete attendance"
on public.club_attendance_records
for delete
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_attendance_records.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can read fixtures"
on public.club_fixtures
for select
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fixtures.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can insert fixtures"
on public.club_fixtures
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fixtures.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can update fixtures"
on public.club_fixtures
for update
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fixtures.club_id
      and club_memberships.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fixtures.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can delete fixtures"
on public.club_fixtures
for delete
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fixtures.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can read availability"
on public.club_availability_records
for select
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_availability_records.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can insert availability"
on public.club_availability_records
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_availability_records.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can update availability"
on public.club_availability_records
for update
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_availability_records.club_id
      and club_memberships.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_availability_records.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can delete availability"
on public.club_availability_records
for delete
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_availability_records.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can read match stats"
on public.club_match_stats
for select
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_stats.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can insert match stats"
on public.club_match_stats
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_stats.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can update match stats"
on public.club_match_stats
for update
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_stats.club_id
      and club_memberships.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_stats.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can delete match stats"
on public.club_match_stats
for delete
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_stats.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can read votes"
on public.club_vote_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_vote_entries.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can insert votes"
on public.club_vote_entries
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_vote_entries.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can update votes"
on public.club_vote_entries
for update
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_vote_entries.club_id
      and club_memberships.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_vote_entries.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can delete votes"
on public.club_vote_entries
for delete
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_vote_entries.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can read fitness results"
on public.club_fitness_results
for select
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fitness_results.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can insert fitness results"
on public.club_fitness_results
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fitness_results.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can update fitness results"
on public.club_fitness_results
for update
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fitness_results.club_id
      and club_memberships.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fitness_results.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can delete fitness results"
on public.club_fitness_results
for delete
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fitness_results.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create or replace function public.find_club_by_invite_code(invite_code_input text)
returns table (id text, name text, invite_code text)
language sql
security definer
set search_path = public
as $$
  select clubs.id, clubs.name, clubs.invite_code
  from public.clubs
  where clubs.invite_code = upper(trim(invite_code_input))
  limit 1;
$$;

grant execute on function public.find_club_by_invite_code(text) to authenticated;
