begin;

-- 기존 행은 갱신하지 않는다. 이 기본값은 migration 적용 이후 생성되는 player에만 적용된다.
alter table public.players
  alter column tokens set default 500;

-- 신규 회원의 활성 시즌 player 생성도 players.tokens 기본값을 단일 기준으로 사용한다.
create or replace function public.handle_pixel_idol_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_nickname text;
  v_normalized text;
  v_season_id text;
  v_idol_id text;
begin
  if coalesce(new.is_anonymous, false) then return new; end if;

  v_nickname := pg_catalog.btrim(new.raw_user_meta_data->>'nickname');
  v_normalized := pg_catalog.lower(
    pg_catalog.btrim(new.raw_user_meta_data->>'normalized_nickname')
  );

  if v_nickname is null or v_normalized is null
    or char_length(v_nickname) not between 2 and 16
    or v_normalized !~ '^[가-힣a-z0-9_]{2,16}$'
    or pg_catalog.lower(v_nickname) <> v_normalized then
    raise exception '올바르지 않은 닉네임입니다.' using errcode = 'P0001';
  end if;

  insert into public.profiles(user_id, nickname, normalized_nickname)
  values (new.id, v_nickname, v_normalized);

  select id into v_season_id
  from public.seasons
  where status = 'active'
  order by starts_at desc
  limit 1;

  select id into v_idol_id
  from public.idols
  order by sort_order, id
  limit 1;

  if v_season_id is not null and v_idol_id is not null then
    insert into public.players(season_id, user_id, supported_idol_id)
    values (v_season_id, new.id, v_idol_id)
    on conflict do nothing;
  end if;

  return new;
exception when unique_violation then
  raise exception '이미 사용 중인 닉네임입니다.' using errcode = '23505';
end;
$$;

-- 로그인 사용자가 시즌 player를 늦게 초기화하는 경로도 같은 컬럼 기본값을 사용한다.
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
  if not public.is_permanent_user() then
    raise exception '로그인이 필요합니다.' using errcode = 'P0001';
  end if;

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

  insert into public.players(season_id, user_id, supported_idol_id)
  values (p_season_id, v_user_id, v_idol_id)
  on conflict (season_id, user_id) do nothing;

  select * into v_player
  from public.players
  where season_id = p_season_id and user_id = v_user_id;

  return to_jsonb(v_player);
end;
$$;

revoke all on function public.initialize_player(text, text) from public, anon;
grant execute on function public.initialize_player(text, text) to authenticated;

commit;
