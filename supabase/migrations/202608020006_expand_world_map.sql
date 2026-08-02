begin;

do $$
declare
  v_width integer;
  v_height integer;
begin
  select map_width, map_height into v_width, v_height
  from public.seasons where id = 'season-1' for update;
  if not found then
    raise exception 'season-1을 찾을 수 없습니다.';
  end if;
  if v_width = 360 and v_height = 216 then
    raise exception 'season-1 지도 확장이 이미 적용되어 있습니다.';
  end if;
  if v_width <> 90 or v_height <> 54 then
    raise exception '예상하지 못한 season-1 지도 크기입니다: %x%', v_width, v_height;
  end if;
end;
$$;

create temporary table season_1_tiles_before_expansion
on commit drop
as
select season_id, x, y, owner_id, hp, updated_at
from public.tiles
where season_id = 'season-1';

delete from public.tiles where season_id = 'season-1';

update public.seasons
set map_width = 360, map_height = 216
where id = 'season-1';

insert into public.tiles (season_id, x, y, owner_id, hp, updated_at)
select season_id, x + 135, y + 81, owner_id, hp, updated_at
from season_1_tiles_before_expansion;

do $$
declare
  v_before bigint;
  v_after bigint;
begin
  select count(*) into v_before from season_1_tiles_before_expansion;
  select count(*) into v_after from public.tiles where season_id = 'season-1';
  if v_before <> v_after then
    raise exception 'season-1 타일 수가 지도 확장 중 변경되었습니다.';
  end if;
  if exists (
    select 1 from public.tiles
    where season_id = 'season-1' and (x < 0 or x >= 360 or y < 0 or y >= 216)
  ) then
    raise exception '지도 확장 후 범위를 벗어난 타일이 있습니다.';
  end if;
end;
$$;

commit;
