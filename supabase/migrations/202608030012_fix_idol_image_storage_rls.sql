begin;

-- Storage 경로를 사용자별로 격리한다.
-- {auth.uid()}/{seasonId}/{idolId}/{submissionUuid}.{ext}
drop policy if exists "users upload supported idol images" on storage.objects;
create policy "users upload supported idol images"
  on storage.objects for insert to authenticated
  with check (
    public.is_permanent_user()
    and bucket_id = 'idol-community-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[^/]+/[^/]+/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$'
    and exists (
      select 1
      from public.players as p
      join public.seasons as s on s.id = p.season_id
      where p.user_id = auth.uid()
        and p.season_id = (storage.foldername(name))[2]
        and p.supported_idol_id = (storage.foldername(name))[3]
        and s.status = 'active'
        and pg_catalog.now() >= s.starts_at
        and pg_catalog.now() < s.ends_at
    )
  );

create or replace function public.submit_raw_idol_image(
  p_season_id text,
  p_idol_id text,
  p_submission_id uuid,
  p_storage_path text,
  p_original_file_name text,
  p_mime_type text,
  p_file_size integer,
  p_width integer,
  p_height integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := pg_catalog.now();
  v_player public.players;
  v_extension text;
  v_expected_path text;
  v_issuer text;
  v_project_url text;
  v_public_url text;
  v_submission public.idol_image_submissions;
  v_idol public.idols;
begin
  if v_user_id is null or not public.is_permanent_user() then
    raise exception '로그인이 필요합니다.' using errcode = 'P0001';
  end if;
  perform public.assert_active_season(p_season_id);
  select * into v_player
  from public.players
  where season_id = p_season_id and user_id = v_user_id
  for update;
  if not found then
    raise exception '플레이어를 먼저 초기화해 주세요.' using errcode = 'P0001';
  end if;
  if v_player.supported_idol_id <> p_idol_id then
    raise exception '현재 응원하는 아이돌의 이미지만 변경할 수 있습니다.' using errcode = 'P0001';
  end if;
  if p_mime_type not in ('image/png', 'image/jpeg', 'image/webp') then
    raise exception 'PNG, JPEG, WebP 이미지만 업로드할 수 있습니다.' using errcode = 'P0001';
  end if;
  if p_file_size <= 0 or p_file_size > 3145728 then
    raise exception '이미지 크기는 3MB 이하여야 합니다.' using errcode = 'P0001';
  end if;
  if pg_catalog.char_length(p_original_file_name) < 1
    or pg_catalog.char_length(p_original_file_name) > 255 then
    raise exception '파일 이름이 너무 깁니다.' using errcode = 'P0001';
  end if;
  if p_width <= 0 or p_height <= 0 or p_width > 5000 or p_height > 5000 then
    raise exception '올바르지 않은 이미지 크기입니다.' using errcode = 'P0001';
  end if;

  v_extension := case p_mime_type
    when 'image/png' then 'png'
    when 'image/jpeg' then 'jpg'
    else 'webp'
  end;
  v_expected_path := v_user_id::text || '/' || p_season_id || '/'
    || p_idol_id || '/' || p_submission_id::text || '.' || v_extension;
  if p_storage_path <> v_expected_path then
    raise exception '올바르지 않은 Storage 경로입니다.' using errcode = 'P0001';
  end if;

  v_issuer := auth.jwt()->>'iss';
  if v_issuer is null
    or v_issuer !~ '^https?://[a-zA-Z0-9.-]+(:[0-9]+)?/auth/v1/?$' then
    raise exception '공개 이미지 URL을 생성할 수 없습니다.' using errcode = 'P0001';
  end if;
  v_project_url := pg_catalog.regexp_replace(v_issuer, '/auth/v1/?$', '');
  v_public_url := v_project_url
    || '/storage/v1/object/public/idol-community-images/' || p_storage_path;

  if exists (
    select 1 from public.idol_image_submissions
    where user_id = v_user_id and created_at > v_now - interval '60 seconds'
  ) then
    raise exception '대표 이미지는 1분에 한 번만 변경할 수 있습니다.' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'idol-community-images'
      and name = p_storage_path
      and owner_id = v_user_id::text
      and (metadata->>'mimetype') = p_mime_type
      and pg_catalog.coalesce((metadata->>'size')::bigint, 0) = p_file_size
  ) then
    raise exception '업로드한 Storage 객체를 확인할 수 없습니다.' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_season_id || ':' || p_idol_id, 0)
  );
  update public.idol_image_submissions
  set status = 'replaced', replaced_at = v_now
  where season_id = p_season_id and idol_id = p_idol_id and status = 'active';

  insert into public.idol_image_submissions (
    id, season_id, idol_id, user_id, storage_path, public_url,
    original_file_name, mime_type, file_size, width, height
  ) values (
    p_submission_id, p_season_id, p_idol_id, v_user_id, p_storage_path, v_public_url,
    p_original_file_name, p_mime_type, p_file_size, p_width, p_height
  ) returning * into v_submission;

  update public.idols
  set representative_image_src = v_public_url
  where id = p_idol_id
  returning * into v_idol;

  return pg_catalog.jsonb_build_object(
    'submission', pg_catalog.to_jsonb(v_submission),
    'idol', pg_catalog.to_jsonb(v_idol)
  );
end;
$$;

revoke all on function public.submit_raw_idol_image(
  text, text, uuid, text, text, text, integer, integer, integer
) from public, anon;
grant execute on function public.submit_raw_idol_image(
  text, text, uuid, text, text, text, integer, integer, integer
) to authenticated;

commit;
