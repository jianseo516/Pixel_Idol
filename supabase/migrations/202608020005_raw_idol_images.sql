begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'idol-community-images', 'idol-community-images', true, 3145728,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.idol_image_submissions (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.seasons(id),
  idol_id text not null references public.idols(id),
  user_id uuid not null references auth.users(id),
  storage_path text not null unique check (char_length(storage_path) <= 500),
  public_url text not null check (char_length(public_url) <= 2048),
  original_file_name text not null check (char_length(original_file_name) between 1 and 255),
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  file_size integer not null check (file_size > 0 and file_size <= 3145728),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  status text not null default 'active' check (status in ('active', 'replaced', 'removed')),
  created_at timestamptz not null default now(),
  replaced_at timestamptz null
);

create unique index idol_image_one_active_idx
  on public.idol_image_submissions (season_id, idol_id)
  where status = 'active';
create index idol_image_user_recent_idx
  on public.idol_image_submissions (user_id, created_at desc);

alter table public.idol_image_submissions enable row level security;
create policy "users read own image submissions"
  on public.idol_image_submissions for select to authenticated
  using (user_id = auth.uid());
grant select on public.idol_image_submissions to authenticated;
revoke insert, update, delete on public.idol_image_submissions from anon, authenticated;

create view public.active_idol_images
with (security_invoker = true)
as select id, season_id, idol_id, public_url, mime_type, file_size, width, height, created_at
from public.idol_image_submissions where status = 'active';
grant select on public.active_idol_images to authenticated;

create policy "users upload supported idol images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'idol-community-images'
    and owner_id = auth.uid()::text
    and name ~ '^[^/]+/[^/]+/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$'
    and exists (
      select 1 from public.players p
      join public.seasons s on s.id = p.season_id
      where p.user_id = auth.uid()
        and p.season_id = (storage.foldername(name))[1]
        and p.supported_idol_id = (storage.foldername(name))[2]
        and s.status = 'active'
        and pg_catalog.now() >= s.starts_at
        and pg_catalog.now() < s.ends_at
    )
  );

create policy "users delete own idol image objects"
  on storage.objects for delete to authenticated
  using (bucket_id = 'idol-community-images' and owner_id = auth.uid()::text);

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
  v_now timestamptz := now();
  v_player public.players;
  v_extension text;
  v_expected_path text;
  v_issuer text;
  v_project_url text;
  v_public_url text;
  v_submission public.idol_image_submissions;
  v_idol public.idols;
begin
  if v_user_id is null then raise exception '로그인이 필요합니다.' using errcode = 'P0001'; end if;
  perform public.assert_active_season(p_season_id);
  select * into v_player from public.players
    where season_id = p_season_id and user_id = v_user_id for update;
  if not found then raise exception '플레이어를 먼저 초기화해 주세요.' using errcode = 'P0001'; end if;
  if v_player.supported_idol_id <> p_idol_id then
    raise exception '현재 응원하는 아이돌의 이미지만 변경할 수 있습니다.' using errcode = 'P0001';
  end if;
  if p_mime_type not in ('image/png', 'image/jpeg', 'image/webp') then
    raise exception 'PNG, JPEG, WebP 이미지만 업로드할 수 있습니다.' using errcode = 'P0001';
  end if;
  if p_file_size <= 0 or p_file_size > 3145728 then
    raise exception '이미지 크기는 3MB 이하여야 합니다.' using errcode = 'P0001';
  end if;
  if char_length(p_original_file_name) < 1 or char_length(p_original_file_name) > 255 then
    raise exception '파일 이름이 너무 깁니다.' using errcode = 'P0001';
  end if;
  if p_width <= 0 or p_height <= 0 or p_width > 5000 or p_height > 5000 then
    raise exception '올바르지 않은 이미지 크기입니다.' using errcode = 'P0001';
  end if;
  v_extension := case p_mime_type when 'image/png' then 'png' when 'image/jpeg' then 'jpg' else 'webp' end;
  v_expected_path := p_season_id || '/' || p_idol_id || '/' || p_submission_id::text || '.' || v_extension;
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
    where bucket_id = 'idol-community-images' and name = p_storage_path
      and owner_id = v_user_id::text
      and (metadata->>'mimetype') = p_mime_type
      and coalesce((metadata->>'size')::bigint, 0) = p_file_size
  ) then
    raise exception '업로드한 Storage 객체를 확인할 수 없습니다.' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_season_id || ':' || p_idol_id, 0));
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
  update public.idols set representative_image_src = v_public_url
    where id = p_idol_id returning * into v_idol;
  return jsonb_build_object('submission', to_jsonb(v_submission), 'idol', to_jsonb(v_idol));
end;
$$;

create or replace function public.rollback_idol_image(p_idol_id text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare
  v_current public.idol_image_submissions;
  v_previous public.idol_image_submissions;
  v_url text;
begin
  select * into v_current from public.idol_image_submissions
    where idol_id = p_idol_id and status = 'active'
    order by created_at desc limit 1 for update;
  if found then
    update public.idol_image_submissions set status = 'removed', replaced_at = now()
      where id = v_current.id;
  end if;
  select * into v_previous from public.idol_image_submissions
    where idol_id = p_idol_id and status = 'replaced'
    order by created_at desc limit 1 for update;
  if found then
    update public.idol_image_submissions set status = 'active', replaced_at = null
      where id = v_previous.id;
    v_url := v_previous.public_url;
  else
    v_url := '/mock-idols/' || p_idol_id || '.svg';
  end if;
  update public.idols set representative_image_src = v_url where id = p_idol_id;
  return jsonb_build_object('idol_id', p_idol_id, 'representative_image_src', v_url);
end;
$$;

revoke all on function public.submit_raw_idol_image(text,text,uuid,text,text,text,integer,integer,integer) from public, anon;
grant execute on function public.submit_raw_idol_image(text,text,uuid,text,text,text,integer,integer,integer) to authenticated;
revoke all on function public.rollback_idol_image(text) from public, anon, authenticated;

do $$ begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'idols'
  ) then execute 'alter publication supabase_realtime add table public.idols'; end if;
end $$;

commit;
