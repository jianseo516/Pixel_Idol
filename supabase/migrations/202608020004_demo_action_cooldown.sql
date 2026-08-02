-- 공개 데모의 RPC 폭주를 줄이기 위한 서버 기준 행동 쿨다운이다.
-- 클라이언트 시간이 아니라 PostgreSQL now()만 사용한다.

alter table public.players
  add column if not exists last_action_at timestamptz null;

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
  v_now timestamptz := now();
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
  if v_player.last_action_at is not null
    and v_player.last_action_at > v_now - interval '500 milliseconds' then
    raise exception '너무 빠르게 행동하고 있습니다. 잠시 후 다시 시도해 주세요.' using errcode = 'P0001';
  end if;
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

  begin
    insert into public.tiles (season_id, x, y, owner_id, hp)
      values (p_season_id, p_x, p_y, v_player.supported_idol_id, 5)
      returning * into v_tile;
  exception when unique_violation then
    raise exception '빈 영토만 점령할 수 있습니다.' using errcode = 'P0001';
  end;

  update public.players
    set tokens = tokens - 1, last_action_at = v_now, updated_at = v_now
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
  v_now timestamptz := now();
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
  if v_player.last_action_at is not null
    and v_player.last_action_at > v_now - interval '500 milliseconds' then
    raise exception '너무 빠르게 행동하고 있습니다. 잠시 후 다시 시도해 주세요.' using errcode = 'P0001';
  end if;
  if v_player.tokens < 1 then raise exception '토큰이 부족합니다.' using errcode = 'P0001'; end if;

  select * into v_tile from public.tiles
    where season_id = p_season_id and x = p_x and y = p_y for update;
  if not found then
    raise exception '상대 아이돌 소유 타일만 공격할 수 있습니다.' using errcode = 'P0001';
  end if;
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
    updated_at = v_now
    where season_id = p_season_id and x = p_x and y = p_y
    returning * into v_tile;
  update public.players
    set tokens = tokens - 1, last_action_at = v_now, updated_at = v_now
    where season_id = p_season_id and user_id = v_user_id
    returning * into v_player;
  return jsonb_build_object('player', to_jsonb(v_player), 'tile', to_jsonb(v_tile));
end;
$$;

revoke all on function public.claim_tile(text, integer, integer) from public, anon;
revoke all on function public.attack_tile(text, integer, integer) from public, anon;
grant execute on function public.claim_tile(text, integer, integer) to authenticated;
grant execute on function public.attack_tile(text, integer, integer) to authenticated;
