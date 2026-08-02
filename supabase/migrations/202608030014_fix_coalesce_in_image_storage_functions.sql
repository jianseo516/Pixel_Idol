begin;

create or replace function public.can_upload_idol_image_object(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_folders text[] := storage.foldername(p_object_name);
  v_filename text := storage.filename(p_object_name);
begin
  if v_user_id is null or not public.is_permanent_user() then
    return false;
  end if;
  if coalesce(pg_catalog.cardinality(v_folders), 0) <> 3 then
    return false;
  end if;
  if v_folders[1] <> v_user_id::text then
    return false;
  end if;
  if v_filename !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$' then
    return false;
  end if;

  return exists (
    select 1
    from public.players as p
    join public.seasons as s on s.id = p.season_id
    where p.user_id = v_user_id
      and p.season_id = v_folders[2]
      and p.supported_idol_id = v_folders[3]
      and s.status = 'active'
      and pg_catalog.now() >= s.starts_at
      and pg_catalog.now() < s.ends_at
  );
end;
$$;

revoke all on function public.can_upload_idol_image_object(text) from public, anon;
grant execute on function public.can_upload_idol_image_object(text) to authenticated;

create or replace function public.diagnose_idol_image_upload_path(p_storage_path text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_folders text[] := storage.foldername(p_storage_path);
  v_filename text := storage.filename(p_storage_path);
  v_extension text := pg_catalog.lower(
    coalesce(pg_catalog.substring(v_filename, '\.([^.]+)$'), '')
  );
  v_authenticated boolean := v_user_id is not null;
  v_is_permanent boolean := false;
  v_path_valid boolean := coalesce(pg_catalog.cardinality(v_folders), 0) = 3;
  v_user_matches boolean := false;
  v_player_exists boolean := false;
  v_season_matches boolean := false;
  v_idol_matches boolean := false;
  v_season_active boolean := false;
  v_season_time_valid boolean := false;
  v_filename_matches boolean := false;
  v_extension_allowed boolean := v_extension in ('png', 'jpg', 'webp');
begin
  if v_authenticated then
    v_is_permanent := public.is_permanent_user();
    v_player_exists := exists (
      select 1 from public.players as p where p.user_id = v_user_id
    );
  end if;

  if v_authenticated and v_path_valid then
    v_user_matches := v_folders[1] = v_user_id::text;
    v_season_matches := exists (
      select 1 from public.players as p
      where p.user_id = v_user_id and p.season_id = v_folders[2]
    );
    v_idol_matches := exists (
      select 1 from public.players as p
      where p.user_id = v_user_id
        and p.season_id = v_folders[2]
        and p.supported_idol_id = v_folders[3]
    );
    v_season_active := exists (
      select 1 from public.seasons as s
      where s.id = v_folders[2] and s.status = 'active'
    );
    v_season_time_valid := exists (
      select 1 from public.seasons as s
      where s.id = v_folders[2]
        and pg_catalog.now() >= s.starts_at
        and pg_catalog.now() < s.ends_at
    );
  end if;

  v_filename_matches := v_filename
    ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$';

  return pg_catalog.jsonb_build_object(
    'authenticated', v_authenticated,
    'is_permanent_user', v_is_permanent,
    'path_segment_count_valid', v_path_valid,
    'user_folder_matches', v_user_matches,
    'player_exists', v_player_exists,
    'season_matches', v_season_matches,
    'idol_matches', v_idol_matches,
    'season_status_active', v_season_active,
    'season_time_valid', v_season_time_valid,
    'filename_matches', v_filename_matches,
    'extension_allowed', v_extension_allowed,
    'can_upload', public.can_upload_idol_image_object(p_storage_path)
  );
end;
$$;

revoke all on function public.diagnose_idol_image_upload_path(text) from public, anon;
grant execute on function public.diagnose_idol_image_upload_path(text) to authenticated;

-- 013에서 생성한 storage.objects INSERT 정책은 그대로 유지한다.
-- bucket_id와 can_upload_idol_image_object(name) 조건보다 넓은 권한을 추가하지 않는다.

notify pgrst, 'reload schema';

commit;
