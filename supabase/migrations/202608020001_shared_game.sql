create table public.seasons (
  id text primary key,
  name text not null check (char_length(name) between 1 and 100),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('active', 'ended')),
  map_width integer not null check (map_width > 0),
  map_height integer not null check (map_height > 0),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create unique index seasons_single_active_idx
  on public.seasons ((status)) where status = 'active';

create table public.idols (
  id text primary key,
  name text not null check (char_length(name) between 1 and 100),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  representative_image_src text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.tiles (
  season_id text not null references public.seasons(id) on delete cascade,
  x integer not null check (x >= 0),
  y integer not null check (y >= 0),
  owner_id text not null references public.idols(id),
  hp integer not null check (hp between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (season_id, x, y)
);

create index tiles_season_owner_idx on public.tiles (season_id, owner_id);

create table public.players (
  season_id text not null references public.seasons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  supported_idol_id text not null references public.idols(id),
  tokens integer not null default 100 check (tokens >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (season_id, user_id)
);

alter table public.seasons enable row level security;
alter table public.idols enable row level security;
alter table public.tiles enable row level security;
alter table public.players enable row level security;

create policy "authenticated users read seasons"
  on public.seasons for select to authenticated using (true);
create policy "authenticated users read idols"
  on public.idols for select to authenticated using (true);
create policy "authenticated users read tiles"
  on public.tiles for select to authenticated using (true);
create policy "players read own state"
  on public.players for select to authenticated using (user_id = auth.uid());

grant select on public.seasons, public.idols, public.tiles to authenticated;
grant select on public.players to authenticated;
revoke insert, update, delete on public.seasons, public.idols, public.tiles, public.players from anon, authenticated;

create or replace function public.assert_active_season(p_season_id text)
returns public.seasons
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_season public.seasons;
begin
  select * into v_season from public.seasons where id = p_season_id for share;
  if not found then raise exception '시즌을 찾을 수 없습니다.' using errcode = 'P0001'; end if;
  if v_season.status <> 'active' or now() < v_season.starts_at or now() >= v_season.ends_at then
    raise exception '종료되었거나 진행 중이 아닌 시즌에서는 행동할 수 없습니다.' using errcode = 'P0001';
  end if;
  return v_season;
end;
$$;

create or replace function public.initialize_player(
  p_season_id text,
  p_supported_idol_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_idol_id text;
  v_player public.players;
begin
  if v_user_id is null then raise exception '로그인이 필요합니다.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.seasons where id = p_season_id) then
    raise exception '시즌을 찾을 수 없습니다.' using errcode = 'P0001';
  end if;
  v_idol_id := p_supported_idol_id;
  if v_idol_id is null then
    select id into v_idol_id from public.idols order by sort_order, id limit 1;
  end if;
  if not exists (select 1 from public.idols where id = v_idol_id) then
    raise exception '응원할 아이돌을 찾을 수 없습니다.' using errcode = 'P0001';
  end if;
  insert into public.players (season_id, user_id, supported_idol_id, tokens)
  values (p_season_id, v_user_id, v_idol_id, 100)
  on conflict (season_id, user_id) do nothing;
  select * into v_player from public.players
    where season_id = p_season_id and user_id = v_user_id;
  return to_jsonb(v_player);
end;
$$;

create or replace function public.change_supported_idol(
  p_season_id text,
  p_idol_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_player public.players;
begin
  if v_user_id is null then raise exception '로그인이 필요합니다.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.idols where id = p_idol_id) then
    raise exception '응원할 아이돌을 찾을 수 없습니다.' using errcode = 'P0001';
  end if;
  update public.players
    set supported_idol_id = p_idol_id, updated_at = now()
    where season_id = p_season_id and user_id = v_user_id
    returning * into v_player;
  if not found then raise exception '플레이어를 먼저 초기화해 주세요.' using errcode = 'P0001'; end if;
  return to_jsonb(v_player);
end;
$$;

create or replace function public.claim_tile(
  p_season_id text,
  p_x integer,
  p_y integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_season public.seasons;
  v_player public.players;
  v_tile public.tiles;
begin
  if v_user_id is null then raise exception '로그인이 필요합니다.' using errcode = 'P0001'; end if;
  v_season := public.assert_active_season(p_season_id);
  if p_x < 0 or p_y < 0 or p_x >= v_season.map_width or p_y >= v_season.map_height then
    raise exception '지도 범위를 벗어난 좌표입니다.' using errcode = 'P0001';
  end if;
  select * into v_player from public.players
    where season_id = p_season_id and user_id = v_user_id for update;
  if not found then raise exception '플레이어를 먼저 초기화해 주세요.' using errcode = 'P0001'; end if;
  if v_player.tokens < 1 then raise exception '토큰이 부족합니다.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.tiles where season_id = p_season_id and x = p_x and y = p_y) then
    raise exception '빈 영토만 점령할 수 있습니다.' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.tiles
    where season_id = p_season_id
      and owner_id = v_player.supported_idol_id
      and abs(x - p_x) + abs(y - p_y) = 1
  ) then
    raise exception '내 영토와 상하좌우로 인접해야 합니다.' using errcode = 'P0001';
  end if;
  insert into public.tiles (season_id, x, y, owner_id, hp)
    values (p_season_id, p_x, p_y, v_player.supported_idol_id, 5)
    returning * into v_tile;
  update public.players set tokens = tokens - 1, updated_at = now()
    where season_id = p_season_id and user_id = v_user_id
    returning * into v_player;
  return jsonb_build_object('player', to_jsonb(v_player), 'tile', to_jsonb(v_tile));
end;
$$;

create or replace function public.attack_tile(
  p_season_id text,
  p_x integer,
  p_y integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_season public.seasons;
  v_player public.players;
  v_tile public.tiles;
begin
  if v_user_id is null then raise exception '로그인이 필요합니다.' using errcode = 'P0001'; end if;
  v_season := public.assert_active_season(p_season_id);
  if p_x < 0 or p_y < 0 or p_x >= v_season.map_width or p_y >= v_season.map_height then
    raise exception '지도 범위를 벗어난 좌표입니다.' using errcode = 'P0001';
  end if;
  select * into v_player from public.players
    where season_id = p_season_id and user_id = v_user_id for update;
  if not found then raise exception '플레이어를 먼저 초기화해 주세요.' using errcode = 'P0001'; end if;
  if v_player.tokens < 1 then raise exception '토큰이 부족합니다.' using errcode = 'P0001'; end if;
  select * into v_tile from public.tiles
    where season_id = p_season_id and x = p_x and y = p_y for update;
  if not found then raise exception '상대 아이돌 소유 타일만 공격할 수 있습니다.' using errcode = 'P0001'; end if;
  if v_tile.owner_id = v_player.supported_idol_id then
    raise exception '내 영토입니다.' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.tiles
    where season_id = p_season_id
      and owner_id = v_player.supported_idol_id
      and abs(x - p_x) + abs(y - p_y) = 1
  ) then
    raise exception '내 영토와 상하좌우로 인접해야 합니다.' using errcode = 'P0001';
  end if;
  update public.tiles set
    owner_id = case when hp <= 1 then v_player.supported_idol_id else owner_id end,
    hp = case when hp <= 1 then 5 else hp - 1 end,
    updated_at = now()
    where season_id = p_season_id and x = p_x and y = p_y
    returning * into v_tile;
  update public.players set tokens = tokens - 1, updated_at = now()
    where season_id = p_season_id and user_id = v_user_id
    returning * into v_player;
  return jsonb_build_object('player', to_jsonb(v_player), 'tile', to_jsonb(v_tile));
end;
$$;

revoke all on function public.assert_active_season(text) from public, anon, authenticated;
revoke all on function public.initialize_player(text, text) from public, anon;
revoke all on function public.change_supported_idol(text, text) from public, anon;
revoke all on function public.claim_tile(text, integer, integer) from public, anon;
revoke all on function public.attack_tile(text, integer, integer) from public, anon;
grant execute on function public.initialize_player(text, text) to authenticated;
grant execute on function public.change_supported_idol(text, text) to authenticated;
grant execute on function public.claim_tile(text, integer, integer) to authenticated;
grant execute on function public.attack_tile(text, integer, integer) to authenticated;
