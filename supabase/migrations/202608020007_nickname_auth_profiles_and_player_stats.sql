begin;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 16),
  normalized_nickname text not null unique
    check (normalized_nickname ~ '^[가-힣a-z0-9_]{2,16}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "authenticated users read public nicknames" on public.profiles;
create policy "authenticated users read public nicknames"
  on public.profiles for select to authenticated using (true);
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.profiles to authenticated;
revoke all on public.profiles from anon;

create or replace function public.prevent_profile_identity_change()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if new.nickname is distinct from old.nickname
    or new.normalized_nickname is distinct from old.normalized_nickname
    or new.user_id is distinct from old.user_id then
    raise exception '닉네임은 현재 변경할 수 없습니다.' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists prevent_profile_identity_change on public.profiles;
create trigger prevent_profile_identity_change before update on public.profiles
for each row execute function public.prevent_profile_identity_change();

alter table public.players
  add column if not exists claimed_tiles_count integer not null default 0 check (claimed_tiles_count >= 0),
  add column if not exists successful_attacks_count integer not null default 0 check (successful_attacks_count >= 0),
  add column if not exists total_attacks_count integer not null default 0 check (total_attacks_count >= 0);

drop policy if exists "anonymous users read seasons" on public.seasons;
drop policy if exists "anonymous users read idols" on public.idols;
drop policy if exists "anonymous users read tiles" on public.tiles;
create policy "anonymous users read seasons" on public.seasons for select to anon using (true);
create policy "anonymous users read idols" on public.idols for select to anon using (true);
create policy "anonymous users read tiles" on public.tiles for select to anon using (true);
grant select on public.seasons, public.idols, public.tiles to anon;

create or replace function public.is_permanent_user()
returns boolean language sql stable security invoker set search_path = pg_catalog
as $$ select auth.uid() is not null and coalesce(auth.jwt()->>'is_anonymous', 'false') <> 'true' $$;

create or replace function public.handle_pixel_idol_auth_user()
returns trigger language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare
  v_nickname text;
  v_normalized text;
  v_season_id text;
  v_idol_id text;
begin
  if coalesce(new.is_anonymous, false) then return new; end if;
  v_nickname := pg_catalog.btrim(new.raw_user_meta_data->>'nickname');
  v_normalized := pg_catalog.lower(pg_catalog.btrim(new.raw_user_meta_data->>'normalized_nickname'));
  if v_nickname is null or v_normalized is null
    or char_length(v_nickname) not between 2 and 16
    or v_normalized !~ '^[가-힣a-z0-9_]{2,16}$'
    or pg_catalog.lower(v_nickname) <> v_normalized then
    raise exception '올바르지 않은 닉네임입니다.' using errcode = 'P0001';
  end if;
  insert into public.profiles(user_id, nickname, normalized_nickname)
  values (new.id, v_nickname, v_normalized);
  select id into v_season_id from public.seasons where status = 'active' order by starts_at desc limit 1;
  select id into v_idol_id from public.idols order by sort_order, id limit 1;
  if v_season_id is not null and v_idol_id is not null then
    insert into public.players(season_id, user_id, supported_idol_id, tokens)
    values (v_season_id, new.id, v_idol_id, 100) on conflict do nothing;
  end if;
  return new;
exception when unique_violation then
  raise exception '이미 사용 중인 닉네임입니다.' using errcode = '23505';
end;
$$;

drop trigger if exists on_pixel_idol_auth_user_created on auth.users;
create trigger on_pixel_idol_auth_user_created
  after insert on auth.users for each row execute function public.handle_pixel_idol_auth_user();

create or replace function public.initialize_player(p_season_id text, p_supported_idol_id text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user_id uuid := auth.uid(); v_idol_id text; v_player public.players;
begin
  if not public.is_permanent_user() then raise exception '로그인이 필요합니다.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.seasons where id = p_season_id) then raise exception '시즌을 찾을 수 없습니다.' using errcode = 'P0001'; end if;
  v_idol_id := p_supported_idol_id;
  if v_idol_id is null then select id into v_idol_id from public.idols order by sort_order, id limit 1; end if;
  if not exists (select 1 from public.idols where id = v_idol_id) then raise exception '응원할 아이돌을 찾을 수 없습니다.' using errcode = 'P0001'; end if;
  insert into public.players(season_id,user_id,supported_idol_id,tokens)
  values(p_season_id,v_user_id,v_idol_id,100) on conflict(season_id,user_id) do nothing;
  select * into v_player from public.players where season_id=p_season_id and user_id=v_user_id;
  return to_jsonb(v_player);
end $$;

create or replace function public.change_supported_idol(p_season_id text, p_idol_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_player public.players;
begin
  if not public.is_permanent_user() then raise exception '로그인이 필요합니다.' using errcode='P0001'; end if;
  if not exists(select 1 from public.idols where id=p_idol_id) then raise exception '응원할 아이돌을 찾을 수 없습니다.' using errcode='P0001'; end if;
  update public.players set supported_idol_id=p_idol_id,updated_at=now()
  where season_id=p_season_id and user_id=auth.uid() returning * into v_player;
  if not found then raise exception '플레이어를 먼저 초기화해 주세요.' using errcode='P0001'; end if;
  return to_jsonb(v_player);
end $$;

create or replace function public.claim_tile(p_season_id text,p_x integer,p_y integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user_id uuid:=auth.uid(); v_now timestamptz:=now(); v_season public.seasons; v_player public.players; v_tile public.tiles;
begin
  if not public.is_permanent_user() then raise exception '로그인이 필요합니다.' using errcode='P0001'; end if;
  v_season:=public.assert_active_season(p_season_id);
  if p_x<0 or p_y<0 or p_x>=v_season.map_width or p_y>=v_season.map_height then raise exception '지도 범위를 벗어난 좌표입니다.' using errcode='P0001'; end if;
  select * into v_player from public.players where season_id=p_season_id and user_id=v_user_id for update;
  if not found then raise exception '플레이어를 먼저 초기화해 주세요.' using errcode='P0001'; end if;
  if v_player.last_action_at is not null and v_player.last_action_at>v_now-interval '500 milliseconds' then raise exception '너무 빠르게 행동하고 있습니다. 잠시 후 다시 시도해 주세요.' using errcode='P0001'; end if;
  if v_player.tokens<1 then raise exception '토큰이 부족합니다.' using errcode='P0001'; end if;
  if exists(select 1 from public.tiles where season_id=p_season_id and x=p_x and y=p_y) then raise exception '빈 영토만 점령할 수 있습니다.' using errcode='P0001'; end if;
  if not exists(select 1 from public.tiles where season_id=p_season_id and owner_id=v_player.supported_idol_id and abs(x-p_x)+abs(y-p_y)=1) then raise exception '내 영토와 상하좌우로 인접해야 합니다.' using errcode='P0001'; end if;
  begin
    insert into public.tiles(season_id,x,y,owner_id,hp) values(p_season_id,p_x,p_y,v_player.supported_idol_id,5) returning * into v_tile;
  exception when unique_violation then raise exception '빈 영토만 점령할 수 있습니다.' using errcode='P0001'; end;
  update public.players set tokens=tokens-1,last_action_at=v_now,claimed_tiles_count=claimed_tiles_count+1,updated_at=v_now
  where season_id=p_season_id and user_id=v_user_id returning * into v_player;
  return jsonb_build_object('player',to_jsonb(v_player),'tile',to_jsonb(v_tile));
end $$;

create or replace function public.attack_tile(p_season_id text,p_x integer,p_y integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user_id uuid:=auth.uid(); v_now timestamptz:=now(); v_season public.seasons; v_player public.players; v_tile public.tiles; v_captured boolean;
begin
  if not public.is_permanent_user() then raise exception '로그인이 필요합니다.' using errcode='P0001'; end if;
  v_season:=public.assert_active_season(p_season_id);
  if p_x<0 or p_y<0 or p_x>=v_season.map_width or p_y>=v_season.map_height then raise exception '지도 범위를 벗어난 좌표입니다.' using errcode='P0001'; end if;
  select * into v_player from public.players where season_id=p_season_id and user_id=v_user_id for update;
  if not found then raise exception '플레이어를 먼저 초기화해 주세요.' using errcode='P0001'; end if;
  if v_player.last_action_at is not null and v_player.last_action_at>v_now-interval '500 milliseconds' then raise exception '너무 빠르게 행동하고 있습니다. 잠시 후 다시 시도해 주세요.' using errcode='P0001'; end if;
  if v_player.tokens<1 then raise exception '토큰이 부족합니다.' using errcode='P0001'; end if;
  select * into v_tile from public.tiles where season_id=p_season_id and x=p_x and y=p_y for update;
  if not found then raise exception '상대 아이돌 소유 타일만 공격할 수 있습니다.' using errcode='P0001'; end if;
  if v_tile.owner_id=v_player.supported_idol_id then raise exception '내 영토입니다.' using errcode='P0001'; end if;
  if not exists(select 1 from public.tiles where season_id=p_season_id and owner_id=v_player.supported_idol_id and abs(x-p_x)+abs(y-p_y)=1) then raise exception '내 영토와 상하좌우로 인접해야 합니다.' using errcode='P0001'; end if;
  v_captured:=v_tile.hp<=1;
  update public.tiles set owner_id=case when v_captured then v_player.supported_idol_id else owner_id end,hp=case when v_captured then 5 else hp-1 end,updated_at=v_now
  where season_id=p_season_id and x=p_x and y=p_y returning * into v_tile;
  update public.players set tokens=tokens-1,last_action_at=v_now,total_attacks_count=total_attacks_count+1,
    successful_attacks_count=successful_attacks_count+case when v_captured then 1 else 0 end,updated_at=v_now
  where season_id=p_season_id and user_id=v_user_id returning * into v_player;
  return jsonb_build_object('player',to_jsonb(v_player),'tile',to_jsonb(v_tile));
end $$;

drop policy if exists "users upload supported idol images" on storage.objects;
create policy "users upload supported idol images" on storage.objects for insert to authenticated with check (
  public.is_permanent_user() and bucket_id='idol-community-images' and owner_id=auth.uid()::text
  and name ~ '^[^/]+/[^/]+/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$'
  and exists(select 1 from public.players p join public.seasons s on s.id=p.season_id where p.user_id=auth.uid()
    and p.season_id=(storage.foldername(name))[1] and p.supported_idol_id=(storage.foldername(name))[2]
    and s.status='active' and now()>=s.starts_at and now()<s.ends_at)
);

create or replace function public.require_permanent_image_submitter()
returns trigger language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
begin
  if not public.is_permanent_user() then raise exception '로그인이 필요합니다.' using errcode='P0001'; end if;
  return new;
end $$;
drop trigger if exists require_permanent_image_submitter on public.idol_image_submissions;
create trigger require_permanent_image_submitter before insert on public.idol_image_submissions
for each row execute function public.require_permanent_image_submitter();

revoke all on function public.is_permanent_user() from public,anon;
grant execute on function public.is_permanent_user() to authenticated;
revoke all on function public.initialize_player(text,text) from public,anon;
revoke all on function public.change_supported_idol(text,text) from public,anon;
revoke all on function public.claim_tile(text,integer,integer) from public,anon;
revoke all on function public.attack_tile(text,integer,integer) from public,anon;
grant execute on function public.initialize_player(text,text),public.change_supported_idol(text,text),public.claim_tile(text,integer,integer),public.attack_tile(text,integer,integer) to authenticated;

commit;
