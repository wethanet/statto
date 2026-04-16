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
  role text not null default 'player',
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, user_id)
);

create table if not exists public.club_member_invites (
  club_id text not null references public.clubs (id) on delete cascade,
  email text not null,
  role text not null default 'player',
  player_id text,
  squads jsonb not null default '[]'::jsonb,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, email)
);

create table if not exists public.club_players (
  club_id text not null references public.clubs (id) on delete cascade,
  id text not null,
  name text not null,
  nickname text,
  number integer,
  squad text check (squad in ('cup', 'plate')),
  role text not null,
  active boolean not null default true,
  primary_position text,
  secondary_position text,
  running_profile text,
  rotation_group_overrides jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, id)
);

create table if not exists public.club_training_sessions (
  club_id text not null references public.clubs (id) on delete cascade,
  id text not null,
  title text not null,
  date text not null,
  location text not null,
  focus text,
  run_plan jsonb not null default '[]'::jsonb,
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
  quarter text not null default 'game' check (quarter in ('game', 'q1', 'q2', 'q3', 'q4')),
  primary key (club_id, fixture_id, quarter, metric, team)
);

create table if not exists public.club_match_lineup_assignments (
  club_id text not null references public.clubs (id) on delete cascade,
  fixture_id text not null,
  player_id text not null,
  position text not null check (position in ('B', 'HB', 'W', 'C', 'HF', 'F', 'Fol', 'Int')),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, fixture_id, player_id)
);

create table if not exists public.club_match_rotation_assignments (
  club_id text not null references public.clubs (id) on delete cascade,
  fixture_id text not null,
  player_id text not null,
  rotation_group text not null check (
    rotation_group in ('inside-mids', 'running-players', 'key-position-players', 'utility-players')
  ),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, fixture_id, player_id)
);

create table if not exists public.club_player_development_entries (
  club_id text not null references public.clubs (id) on delete cascade,
  player_id text not null,
  week_start date not null,
  focus_areas jsonb not null default '[]'::jsonb,
  coaching_note text,
  progress_status text not null default 'not-started',
  proficiency integer,
  progress_note text,
  generated_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, player_id, week_start)
);

create table if not exists public.club_vote_entries (
  club_id text not null references public.clubs (id) on delete cascade,
  fixture_id text not null,
  player_id text not null,
  vote_type text not null default 'players',
  points integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (club_id, fixture_id, player_id, vote_type)
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

create table if not exists public.club_fines (
  club_id text not null references public.clubs (id) on delete cascade,
  id text not null,
  player_id text not null,
  reason text not null,
  amount numeric not null check (amount > 0),
  issued_at timestamptz not null default timezone('utc', now()),
  paid boolean not null default false,
  primary key (club_id, id)
);

alter table if exists public.club_training_sessions
  add column if not exists focus text;

alter table if exists public.club_training_sessions
  add column if not exists run_plan jsonb not null default '[]'::jsonb;

alter table public.club_players
add column if not exists squad text;

alter table public.club_players
add column if not exists nickname text;

alter table public.club_players
add column if not exists primary_position text;

alter table public.club_players
add column if not exists secondary_position text;

alter table public.club_players
add column if not exists running_profile text;

alter table public.club_players
add column if not exists rotation_group_overrides jsonb;

alter table public.club_players
add column if not exists season_goals text;

alter table public.club_players
add column if not exists skill_summary text;

alter table public.club_players
add column if not exists development_level text;

alter table public.club_players
drop column if exists position;

alter table public.club_match_stats
add column if not exists quarter text not null default 'game';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_players_squad_check'
  ) then
    alter table public.club_players
    add constraint club_players_squad_check
    check (squad in ('cup', 'plate') or squad is null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_players_development_level_check'
  ) then
    alter table public.club_players
    add constraint club_players_development_level_check
    check (development_level in ('emerging', 'developing', 'reliable', 'advanced') or development_level is null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_players_primary_position_check'
  ) then
    alter table public.club_players
    add constraint club_players_primary_position_check
    check (primary_position in ('B', 'HB', 'W', 'C', 'HF', 'F', 'Fol') or primary_position is null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_player_development_entries_progress_status_check'
  ) then
    alter table public.club_player_development_entries
    add constraint club_player_development_entries_progress_status_check
    check (progress_status in ('not-started', 'building', 'on-track', 'banked'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_player_development_entries_proficiency_check'
  ) then
    alter table public.club_player_development_entries
    add constraint club_player_development_entries_proficiency_check
    check (proficiency between 1 and 5 or proficiency is null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_players_secondary_position_check'
  ) then
    alter table public.club_players
    add constraint club_players_secondary_position_check
    check (secondary_position in ('B', 'HB', 'W', 'C', 'HF', 'F', 'Fol') or secondary_position is null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_players_running_profile_check'
  ) then
    alter table public.club_players
    add constraint club_players_running_profile_check
    check (running_profile in ('high', 'balanced', 'managed') or running_profile is null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_match_stats_quarter_check'
  ) then
    alter table public.club_match_stats
    add constraint club_match_stats_quarter_check
    check (quarter in ('game', 'q1', 'q2', 'q3', 'q4'));
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'club_match_stats_pkey'
      and conrelid = 'public.club_match_stats'::regclass
  ) then
    alter table public.club_match_stats
    drop constraint club_match_stats_pkey;
  end if;

  alter table public.club_match_stats
  add constraint club_match_stats_pkey
  primary key (club_id, fixture_id, quarter, metric, team);
exception
  when duplicate_object then
    null;
end $$;

alter table public.club_data_snapshots enable row level security;
alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
alter table public.club_member_invites enable row level security;
alter table public.club_players enable row level security;
alter table public.club_training_sessions enable row level security;
alter table public.club_attendance_records enable row level security;
alter table public.club_fixtures enable row level security;
alter table public.club_availability_records enable row level security;
alter table public.club_match_stats enable row level security;
alter table public.club_match_lineup_assignments enable row level security;
alter table public.club_match_rotation_assignments enable row level security;
alter table public.club_player_development_entries enable row level security;
alter table public.club_vote_entries enable row level security;
alter table public.club_fitness_results enable row level security;
alter table public.club_fines enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

do $$
declare
  realtime_table text;
begin
  foreach realtime_table in array array[
    'club_players',
    'club_training_sessions',
    'club_attendance_records',
    'club_fixtures',
    'club_availability_records',
    'club_match_stats',
    'club_match_lineup_assignments',
    'club_match_rotation_assignments',
    'club_player_development_entries',
    'club_vote_entries',
    'club_fitness_results',
    'club_fines'
  ] loop
    begin
      execute format(
        'alter publication supabase_realtime add table public.%I',
        realtime_table
      );
    exception
      when duplicate_object then
        null;
    end;
  end loop;
end $$;

drop policy if exists "Users can read their own club data" on public.club_data_snapshots;
drop policy if exists "Users can insert their own club data" on public.club_data_snapshots;
drop policy if exists "Users can update their own club data" on public.club_data_snapshots;
drop policy if exists "Authenticated users can create clubs" on public.clubs;
drop policy if exists "Club members can read clubs" on public.clubs;
drop policy if exists "Users can read their own memberships" on public.club_memberships;
drop policy if exists "Users can create their own memberships" on public.club_memberships;
drop policy if exists "Admins can update memberships" on public.club_memberships;
drop policy if exists "Users can read relevant memberships" on public.club_memberships;
drop policy if exists "Admins can read member invites" on public.club_member_invites;
drop policy if exists "Admins can create member invites" on public.club_member_invites;
drop policy if exists "Admins can update member invites" on public.club_member_invites;
drop policy if exists "Admins can delete member invites" on public.club_member_invites;
drop policy if exists "Users can read their own member invites" on public.club_member_invites;
drop policy if exists "Club members can read their own players" on public.club_players;
drop policy if exists "Club members can insert players" on public.club_players;
drop policy if exists "Club members can update players" on public.club_players;
drop policy if exists "Club members can delete players" on public.club_players;
drop policy if exists "Members can read scoped players" on public.club_players;
drop policy if exists "Admins and coaches can insert scoped players" on public.club_players;
drop policy if exists "Admins and coaches can update scoped players" on public.club_players;
drop policy if exists "Admins and coaches can delete scoped players" on public.club_players;
drop policy if exists "Club members can read training sessions" on public.club_training_sessions;
drop policy if exists "Club members can insert training sessions" on public.club_training_sessions;
drop policy if exists "Club members can update training sessions" on public.club_training_sessions;
drop policy if exists "Club members can delete training sessions" on public.club_training_sessions;
drop policy if exists "Members can read scoped training sessions" on public.club_training_sessions;
drop policy if exists "Admins and coaches can manage scoped training sessions" on public.club_training_sessions;
drop policy if exists "Admins and coaches can update scoped training sessions" on public.club_training_sessions;
drop policy if exists "Admins and coaches can delete scoped training sessions" on public.club_training_sessions;
drop policy if exists "Club members can read attendance" on public.club_attendance_records;
drop policy if exists "Club members can insert attendance" on public.club_attendance_records;
drop policy if exists "Club members can update attendance" on public.club_attendance_records;
drop policy if exists "Club members can delete attendance" on public.club_attendance_records;
drop policy if exists "Club members can read fixtures" on public.club_fixtures;
drop policy if exists "Club members can insert fixtures" on public.club_fixtures;
drop policy if exists "Club members can update fixtures" on public.club_fixtures;
drop policy if exists "Club members can delete fixtures" on public.club_fixtures;
drop policy if exists "Members can read scoped fixtures" on public.club_fixtures;
drop policy if exists "Admins and coaches can manage scoped fixtures" on public.club_fixtures;
drop policy if exists "Admins and coaches can update scoped fixtures" on public.club_fixtures;
drop policy if exists "Admins and coaches can delete scoped fixtures" on public.club_fixtures;
drop policy if exists "Club members can read availability" on public.club_availability_records;
drop policy if exists "Club members can insert availability" on public.club_availability_records;
drop policy if exists "Club members can update availability" on public.club_availability_records;
drop policy if exists "Club members can delete availability" on public.club_availability_records;
drop policy if exists "Users can read allowed availability" on public.club_availability_records;
drop policy if exists "Users can insert allowed availability" on public.club_availability_records;
drop policy if exists "Users can update allowed availability" on public.club_availability_records;
drop policy if exists "Users can delete allowed availability" on public.club_availability_records;
drop policy if exists "Club members can read match stats" on public.club_match_stats;
drop policy if exists "Club members can insert match stats" on public.club_match_stats;
drop policy if exists "Club members can update match stats" on public.club_match_stats;
drop policy if exists "Club members can delete match stats" on public.club_match_stats;
drop policy if exists "Club members can read match lineup assignments" on public.club_match_lineup_assignments;
drop policy if exists "Club members can insert match lineup assignments" on public.club_match_lineup_assignments;
drop policy if exists "Club members can update match lineup assignments" on public.club_match_lineup_assignments;
drop policy if exists "Club members can delete match lineup assignments" on public.club_match_lineup_assignments;
drop policy if exists "Club members can read match rotation assignments" on public.club_match_rotation_assignments;
drop policy if exists "Club members can insert match rotation assignments" on public.club_match_rotation_assignments;
drop policy if exists "Club members can update match rotation assignments" on public.club_match_rotation_assignments;
drop policy if exists "Club members can delete match rotation assignments" on public.club_match_rotation_assignments;
drop policy if exists "Club members can read player development entries" on public.club_player_development_entries;
drop policy if exists "Club members can insert player development entries" on public.club_player_development_entries;
drop policy if exists "Club members can update player development entries" on public.club_player_development_entries;
drop policy if exists "Club members can delete player development entries" on public.club_player_development_entries;
drop policy if exists "Club members can read votes" on public.club_vote_entries;
drop policy if exists "Club members can insert votes" on public.club_vote_entries;
drop policy if exists "Club members can update votes" on public.club_vote_entries;
drop policy if exists "Club members can delete votes" on public.club_vote_entries;
drop policy if exists "Club members can read fitness results" on public.club_fitness_results;
drop policy if exists "Club members can insert fitness results" on public.club_fitness_results;
drop policy if exists "Club members can update fitness results" on public.club_fitness_results;
drop policy if exists "Club members can delete fitness results" on public.club_fitness_results;
drop policy if exists "Club members can read fines" on public.club_fines;
drop policy if exists "Club members can insert fines" on public.club_fines;
drop policy if exists "Club members can update fines" on public.club_fines;
drop policy if exists "Club members can delete fines" on public.club_fines;
drop policy if exists "Users can read allowed fines" on public.club_fines;
drop policy if exists "Admins and coaches can insert fines" on public.club_fines;
drop policy if exists "Users can update allowed fines" on public.club_fines;
drop policy if exists "Admins and coaches can delete fines" on public.club_fines;

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

create policy "Club members can read match lineup assignments"
on public.club_match_lineup_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_lineup_assignments.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can insert match lineup assignments"
on public.club_match_lineup_assignments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_lineup_assignments.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can update match lineup assignments"
on public.club_match_lineup_assignments
for update
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_lineup_assignments.club_id
      and club_memberships.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_lineup_assignments.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can delete match lineup assignments"
on public.club_match_lineup_assignments
for delete
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_lineup_assignments.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can read match rotation assignments"
on public.club_match_rotation_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_rotation_assignments.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can insert match rotation assignments"
on public.club_match_rotation_assignments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_rotation_assignments.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can update match rotation assignments"
on public.club_match_rotation_assignments
for update
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_rotation_assignments.club_id
      and club_memberships.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_rotation_assignments.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can delete match rotation assignments"
on public.club_match_rotation_assignments
for delete
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_match_rotation_assignments.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can read player development entries"
on public.club_player_development_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_player_development_entries.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can insert player development entries"
on public.club_player_development_entries
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_player_development_entries.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can update player development entries"
on public.club_player_development_entries
for update
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_player_development_entries.club_id
      and club_memberships.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_player_development_entries.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can delete player development entries"
on public.club_player_development_entries
for delete
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_player_development_entries.club_id
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

create policy "Club members can read fines"
on public.club_fines
for select
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fines.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can insert fines"
on public.club_fines
for insert
to authenticated
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fines.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can update fines"
on public.club_fines
for update
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fines.club_id
      and club_memberships.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fines.club_id
      and club_memberships.user_id = auth.uid()
  )
);

create policy "Club members can delete fines"
on public.club_fines
for delete
to authenticated
using (
  exists (
    select 1
    from public.club_memberships
    where club_memberships.club_id = club_fines.club_id
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

create or replace function public.join_club_by_invite_code(invite_code_input text)
returns table (
  id text,
  name text,
  invite_code text,
  membership_role text,
  player_id text,
  squads jsonb
)
language plpgsql
set search_path = public
as $$
declare
  target_club public.clubs%rowtype;
  normalized_email text;
  pending_role text;
  pending_player_id text;
  pending_squads jsonb;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to join a club.';
  end if;

  select *
  into target_club
  from public.clubs
  where invite_code = upper(trim(invite_code_input))
  limit 1;

  if not found then
    return;
  end if;

  normalized_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  pending_role := 'player';
  pending_player_id := null;
  pending_squads := '[]'::jsonb;

  if normalized_email <> '' then
    select
      case
        when club_member_invites.role in ('admin', 'coach', 'player') then club_member_invites.role
        else 'player'
      end,
      club_member_invites.player_id,
      coalesce(club_member_invites.squads, '[]'::jsonb)
    into pending_role, pending_player_id, pending_squads
    from public.club_member_invites
    where club_member_invites.club_id = target_club.id
      and club_member_invites.email = normalized_email
    limit 1;
  end if;

  insert into public.club_memberships (club_id, user_id, role, email, player_id, squads)
  values (
    target_club.id,
    auth.uid(),
    pending_role,
    nullif(normalized_email, ''),
    pending_player_id,
    pending_squads
  )
  on conflict (club_id, user_id) do update
  set
    role = excluded.role,
    email = excluded.email,
    player_id = excluded.player_id,
    squads = excluded.squads;

  if normalized_email <> '' then
    delete from public.club_member_invites
    where club_id = target_club.id
      and email = normalized_email;
  end if;

  return query
  select
    target_club.id,
    target_club.name,
    target_club.invite_code,
    pending_role,
    pending_player_id,
    pending_squads;
end;
$$;

grant execute on function public.join_club_by_invite_code(text) to authenticated;

alter table public.club_memberships
add column if not exists email text;

alter table public.club_memberships
add column if not exists player_id text;

alter table public.club_memberships
add column if not exists squads jsonb not null default '[]'::jsonb;

alter table public.club_memberships
alter column role set default 'player';

alter table public.club_training_sessions
add column if not exists squad text;

alter table public.club_fixtures
add column if not exists squad text;

alter table public.club_member_invites
alter column role set default 'player';

update public.club_member_invites
set email = lower(trim(email))
where email <> lower(trim(email));

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.normalize_club_role(input_role text)
returns text
language sql
immutable
as $$
  select case
    when input_role in ('admin', 'coach', 'player') then input_role
    when input_role in ('owner', 'manager') then 'admin'
    else 'player'
  end;
$$;

create or replace function private.prepare_club_membership_row()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  new.role := private.normalize_club_role(new.role);
  new.squads := coalesce(new.squads, '[]'::jsonb);

  if tg_table_name = 'club_member_invites' then
    new.email := lower(trim(coalesce(new.email, '')));
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_club_membership_row on public.club_memberships;
create trigger prepare_club_membership_row
before insert or update on public.club_memberships
for each row execute function private.prepare_club_membership_row();

drop trigger if exists prepare_club_member_invite_row on public.club_member_invites;
create trigger prepare_club_member_invite_row
before insert or update on public.club_member_invites
for each row execute function private.prepare_club_membership_row();

do $$
declare
  existing_club_count integer;
  existing_club_id text;
begin
  select count(*)::integer, min(id)
  into existing_club_count, existing_club_id
  from public.clubs;

  if existing_club_count = 1 and existing_club_id is not null then
    insert into public.club_memberships (club_id, user_id, role, email, player_id, squads)
    select
      existing_club_id,
      auth_users.id,
      'admin',
      auth_users.email,
      null,
      '[]'::jsonb
    from auth.users as auth_users
    where not exists (
      select 1
      from public.club_memberships
      where club_memberships.user_id = auth_users.id
    )
    on conflict (club_id, user_id) do nothing;
  end if;
end $$;

update public.club_memberships
set role = private.normalize_club_role(role);

update public.club_member_invites
set role = private.normalize_club_role(role),
    email = lower(trim(email)),
    squads = coalesce(squads, '[]'::jsonb);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_memberships_role_check'
  ) then
    alter table public.club_memberships
    add constraint club_memberships_role_check
    check (role in ('admin', 'coach', 'player'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_member_invites_role_check'
  ) then
    alter table public.club_member_invites
    add constraint club_member_invites_role_check
    check (role in ('admin', 'coach', 'player'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_member_invites_squads_is_array_check'
  ) then
    alter table public.club_member_invites
    add constraint club_member_invites_squads_is_array_check
    check (jsonb_typeof(squads) = 'array');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_memberships_squads_is_array_check'
  ) then
    alter table public.club_memberships
    add constraint club_memberships_squads_is_array_check
    check (jsonb_typeof(squads) = 'array');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_training_sessions_squad_check'
  ) then
    alter table public.club_training_sessions
    add constraint club_training_sessions_squad_check
    check (squad in ('cup', 'plate') or squad is null);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_fixtures_squad_check'
  ) then
    alter table public.club_fixtures
    add constraint club_fixtures_squad_check
    check (squad in ('cup', 'plate') or squad is null);
  end if;
end $$;

create or replace function private.current_membership_role(target_club_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select private.normalize_club_role(club_memberships.role)
  from public.club_memberships
  where club_memberships.club_id = target_club_id
    and club_memberships.user_id = auth.uid()
  limit 1;
$$;

create or replace function private.current_membership_player_id(target_club_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select club_memberships.player_id
  from public.club_memberships
  where club_memberships.club_id = target_club_id
    and club_memberships.user_id = auth.uid()
  limit 1;
$$;

create or replace function private.current_membership_squads(target_club_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(club_memberships.squads, '[]'::jsonb)
  from public.club_memberships
  where club_memberships.club_id = target_club_id
    and club_memberships.user_id = auth.uid()
  limit 1;
$$;

create or replace function private.is_club_admin(target_club_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_membership_role(target_club_id) = 'admin', false);
$$;

create or replace function private.current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function private.is_club_coach_or_admin(target_club_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_membership_role(target_club_id) in ('admin', 'coach'), false);
$$;

create or replace function private.has_squad_membership(target_club_id text, target_squad text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from jsonb_array_elements_text(coalesce(private.current_membership_squads(target_club_id), '[]'::jsonb)) squad
    where squad.value = target_squad
  );
$$;

create or replace function private.can_view_squad_item(target_club_id text, target_squad text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when private.current_membership_role(target_club_id) = 'admin' then true
    when private.current_membership_role(target_club_id) in ('coach', 'player') and target_squad is null then true
    when private.current_membership_role(target_club_id) in ('coach', 'player')
      then private.has_squad_membership(target_club_id, target_squad)
    else false
  end;
$$;

create or replace function private.can_manage_squad_item(target_club_id text, target_squad text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when private.current_membership_role(target_club_id) = 'admin' then true
    when private.current_membership_role(target_club_id) = 'coach' and target_squad is not null
      then private.has_squad_membership(target_club_id, target_squad)
    else false
  end;
$$;

create or replace function private.can_manage_player(target_club_id text, target_player_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when private.current_membership_role(target_club_id) = 'admin' then true
    when private.current_membership_role(target_club_id) = 'coach' then exists (
      select 1
      from public.club_players
      where club_players.club_id = target_club_id
        and club_players.id = target_player_id
        and club_players.squad is not null
        and private.has_squad_membership(target_club_id, club_players.squad)
    )
    else false
  end;
$$;

create or replace function private.can_view_player(target_club_id text, target_player_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when private.current_membership_role(target_club_id) = 'admin' then true
    when private.current_membership_player_id(target_club_id) = target_player_id then true
    when private.current_membership_role(target_club_id) in ('coach', 'player') then exists (
      select 1
      from public.club_players
      where club_players.club_id = target_club_id
        and club_players.id = target_player_id
        and (
          club_players.squad is null
          or private.has_squad_membership(target_club_id, club_players.squad)
        )
    )
    else false
  end;
$$;

grant usage on schema private to authenticated;
revoke all on all functions in schema private from public;
revoke all on all functions in schema private from anon;
grant execute on all functions in schema private to authenticated;

drop policy if exists "Users can read their own memberships" on public.club_memberships;
drop policy if exists "Users can create their own memberships" on public.club_memberships;
drop policy if exists "Club members can read their own players" on public.club_players;
drop policy if exists "Club members can insert players" on public.club_players;
drop policy if exists "Club members can update players" on public.club_players;
drop policy if exists "Club members can delete players" on public.club_players;
drop policy if exists "Club members can read training sessions" on public.club_training_sessions;
drop policy if exists "Club members can insert training sessions" on public.club_training_sessions;
drop policy if exists "Club members can update training sessions" on public.club_training_sessions;
drop policy if exists "Club members can delete training sessions" on public.club_training_sessions;
drop policy if exists "Club members can read fixtures" on public.club_fixtures;
drop policy if exists "Club members can insert fixtures" on public.club_fixtures;
drop policy if exists "Club members can update fixtures" on public.club_fixtures;
drop policy if exists "Club members can delete fixtures" on public.club_fixtures;
drop policy if exists "Club members can read availability" on public.club_availability_records;
drop policy if exists "Club members can insert availability" on public.club_availability_records;
drop policy if exists "Club members can update availability" on public.club_availability_records;
drop policy if exists "Club members can delete availability" on public.club_availability_records;
drop policy if exists "Club members can read fines" on public.club_fines;
drop policy if exists "Club members can insert fines" on public.club_fines;
drop policy if exists "Club members can update fines" on public.club_fines;
drop policy if exists "Club members can delete fines" on public.club_fines;

create policy "Users can read relevant memberships"
on public.club_memberships
for select
to authenticated
using (
  auth.uid() = user_id
  or private.is_club_admin(club_id)
);

create policy "Users can create their own memberships"
on public.club_memberships
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Admins can update memberships"
on public.club_memberships
for update
to authenticated
using (private.is_club_admin(club_id))
with check (private.is_club_admin(club_id));

create policy "Admins can read member invites"
on public.club_member_invites
for select
to authenticated
using (private.is_club_admin(club_id));

create policy "Users can read their own member invites"
on public.club_member_invites
for select
to authenticated
using (lower(email) = private.current_user_email());

create policy "Admins can create member invites"
on public.club_member_invites
for insert
to authenticated
with check (private.is_club_admin(club_id));

create policy "Admins can update member invites"
on public.club_member_invites
for update
to authenticated
using (private.is_club_admin(club_id))
with check (private.is_club_admin(club_id));

create policy "Admins can delete member invites"
on public.club_member_invites
for delete
to authenticated
using (private.is_club_admin(club_id));

create policy "Members can read scoped players"
on public.club_players
for select
to authenticated
using (private.can_view_player(club_id, id));

create policy "Admins and coaches can insert scoped players"
on public.club_players
for insert
to authenticated
with check (
  private.current_membership_role(club_id) = 'admin'
  or (
    private.current_membership_role(club_id) = 'coach'
    and squad is not null
    and private.has_squad_membership(club_id, squad)
  )
);

create policy "Admins and coaches can update scoped players"
on public.club_players
for update
to authenticated
using (private.can_manage_player(club_id, id))
with check (
  private.current_membership_role(club_id) = 'admin'
  or (
    private.current_membership_role(club_id) = 'coach'
    and squad is not null
    and private.has_squad_membership(club_id, squad)
  )
);

create policy "Admins and coaches can delete scoped players"
on public.club_players
for delete
to authenticated
using (private.can_manage_player(club_id, id));

create policy "Members can read scoped training sessions"
on public.club_training_sessions
for select
to authenticated
using (private.can_view_squad_item(club_id, squad));

create policy "Admins and coaches can manage scoped training sessions"
on public.club_training_sessions
for insert
to authenticated
with check (private.can_manage_squad_item(club_id, squad));

create policy "Admins and coaches can update scoped training sessions"
on public.club_training_sessions
for update
to authenticated
using (private.can_manage_squad_item(club_id, squad))
with check (private.can_manage_squad_item(club_id, squad));

create policy "Admins and coaches can delete scoped training sessions"
on public.club_training_sessions
for delete
to authenticated
using (private.can_manage_squad_item(club_id, squad));

create policy "Members can read scoped fixtures"
on public.club_fixtures
for select
to authenticated
using (private.can_view_squad_item(club_id, squad));

create policy "Admins and coaches can manage scoped fixtures"
on public.club_fixtures
for insert
to authenticated
with check (private.can_manage_squad_item(club_id, squad));

create policy "Admins and coaches can update scoped fixtures"
on public.club_fixtures
for update
to authenticated
using (private.can_manage_squad_item(club_id, squad))
with check (private.can_manage_squad_item(club_id, squad));

create policy "Admins and coaches can delete scoped fixtures"
on public.club_fixtures
for delete
to authenticated
using (private.can_manage_squad_item(club_id, squad));

create policy "Users can read allowed availability"
on public.club_availability_records
for select
to authenticated
using (
  private.current_membership_role(club_id) = 'admin'
  or private.can_manage_player(club_id, player_id)
  or private.current_membership_player_id(club_id) = player_id
);

create policy "Users can insert allowed availability"
on public.club_availability_records
for insert
to authenticated
with check (
  private.current_membership_role(club_id) = 'admin'
  or private.can_manage_player(club_id, player_id)
  or private.current_membership_player_id(club_id) = player_id
);

create policy "Users can update allowed availability"
on public.club_availability_records
for update
to authenticated
using (
  private.current_membership_role(club_id) = 'admin'
  or private.can_manage_player(club_id, player_id)
  or private.current_membership_player_id(club_id) = player_id
)
with check (
  private.current_membership_role(club_id) = 'admin'
  or private.can_manage_player(club_id, player_id)
  or private.current_membership_player_id(club_id) = player_id
);

create policy "Users can delete allowed availability"
on public.club_availability_records
for delete
to authenticated
using (
  private.current_membership_role(club_id) = 'admin'
  or private.can_manage_player(club_id, player_id)
  or private.current_membership_player_id(club_id) = player_id
);

create policy "Users can read allowed fines"
on public.club_fines
for select
to authenticated
using (
  private.current_membership_role(club_id) = 'admin'
  or private.can_manage_player(club_id, player_id)
  or private.current_membership_player_id(club_id) = player_id
);

create policy "Admins and coaches can insert fines"
on public.club_fines
for insert
to authenticated
with check (
  private.current_membership_role(club_id) = 'admin'
  or private.can_manage_player(club_id, player_id)
);

create policy "Users can update allowed fines"
on public.club_fines
for update
to authenticated
using (
  private.current_membership_role(club_id) = 'admin'
  or private.can_manage_player(club_id, player_id)
  or private.current_membership_player_id(club_id) = player_id
)
with check (
  private.current_membership_role(club_id) = 'admin'
  or private.can_manage_player(club_id, player_id)
  or private.current_membership_player_id(club_id) = player_id
);

create policy "Admins and coaches can delete fines"
on public.club_fines
for delete
to authenticated
using (
  private.current_membership_role(club_id) = 'admin'
  or private.can_manage_player(club_id, player_id)
);
