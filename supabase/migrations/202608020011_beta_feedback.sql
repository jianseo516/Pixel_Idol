begin;

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  nickname text null,
  client_id uuid null,
  category text not null check (category in ('bug', 'suggestion', 'image_report', 'other')),
  content text not null check (char_length(content) between 10 and 2000),
  contact_email text null check (contact_email is null or char_length(contact_email) <= 320),
  page_url text null check (page_url is null or char_length(page_url) <= 2048),
  tile_id text null check (tile_id is null or char_length(tile_id) <= 128),
  image_url text null check (image_url is null or char_length(image_url) <= 2048),
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'rejected')),
  admin_note text null check (admin_note is null or char_length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (user_id is not null and nickname is not null)
    or (user_id is null and nickname is null and client_id is not null)
  )
);

create index if not exists feedback_reports_created_at_idx
  on public.feedback_reports(created_at desc);
create index if not exists feedback_reports_category_status_idx
  on public.feedback_reports(category, status, created_at desc);
create index if not exists feedback_reports_user_created_idx
  on public.feedback_reports(user_id, created_at desc) where user_id is not null;
create index if not exists feedback_reports_client_created_idx
  on public.feedback_reports(client_id, created_at desc) where client_id is not null;

create or replace function public.touch_feedback_report_updated_at()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists touch_feedback_report_updated_at on public.feedback_reports;
create trigger touch_feedback_report_updated_at
before update on public.feedback_reports
for each row execute function public.touch_feedback_report_updated_at();

alter table public.feedback_reports enable row level security;
revoke all on public.feedback_reports from public, anon, authenticated;

drop policy if exists "admins read feedback reports" on public.feedback_reports;
create policy "admins read feedback reports" on public.feedback_reports
for select to authenticated using (public.is_current_user_admin());
drop policy if exists "admins update feedback reports" on public.feedback_reports;
create policy "admins update feedback reports" on public.feedback_reports
for update to authenticated using (public.is_current_user_admin())
with check (public.is_current_user_admin());
drop policy if exists "admins delete feedback reports" on public.feedback_reports;
create policy "admins delete feedback reports" on public.feedback_reports
for delete to authenticated using (public.is_current_user_admin());
grant select, update, delete on public.feedback_reports to authenticated;

create or replace function public.submit_feedback_report(
  p_client_id uuid,
  p_category text,
  p_content text,
  p_contact_email text default null,
  p_page_url text default null,
  p_tile_id text default null,
  p_image_url text default null
)
returns uuid language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare
  v_user_id uuid := auth.uid();
  v_nickname text;
  v_report_id uuid;
  v_content text := pg_catalog.btrim(p_content);
  v_contact_email text := pg_catalog.nullif(pg_catalog.btrim(p_contact_email), '');
  v_page_url text := pg_catalog.nullif(pg_catalog.btrim(p_page_url), '');
  v_tile_id text := pg_catalog.nullif(pg_catalog.btrim(p_tile_id), '');
  v_image_url text := pg_catalog.nullif(pg_catalog.btrim(p_image_url), '');
begin
  if p_category not in ('bug', 'suggestion', 'image_report', 'other') then
    raise exception '올바른 피드백 유형을 선택해 주세요.' using errcode = 'P0001';
  end if;
  if char_length(v_content) not between 10 and 2000 then
    raise exception '내용은 10자 이상 2000자 이하로 입력해 주세요.' using errcode = 'P0001';
  end if;
  if v_contact_email is not null and (
    char_length(v_contact_email) > 320
    or v_contact_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  ) then
    raise exception '올바른 이메일 형식을 입력해 주세요.' using errcode = 'P0001';
  end if;
  if coalesce(char_length(v_page_url), 0) > 2048
    or coalesce(char_length(v_image_url), 0) > 2048
    or coalesce(char_length(v_tile_id), 0) > 128 then
    raise exception '관련 정보가 허용 길이를 초과했습니다.' using errcode = 'P0001';
  end if;

  if public.is_permanent_user() then
    select nickname into v_nickname from public.profiles where user_id = v_user_id;
    if v_nickname is null then
      raise exception '계정 프로필을 찾을 수 없습니다.' using errcode = 'P0001';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':feedback', 0));
    if exists (
      select 1 from public.feedback_reports
      where user_id = v_user_id and created_at > now() - interval '60 seconds'
    ) then
      raise exception '피드백은 60초에 한 번 제출할 수 있습니다.' using errcode = 'P0001';
    end if;
  else
    v_user_id := null;
    v_nickname := null;
    if p_client_id is null then
      raise exception '피드백 제출 식별자를 확인할 수 없습니다.' using errcode = 'P0001';
    end if;
    perform pg_advisory_xact_lock(hashtextextended(p_client_id::text || ':feedback', 0));
    if exists (
      select 1 from public.feedback_reports
      where client_id = p_client_id and created_at > now() - interval '60 seconds'
    ) then
      raise exception '피드백은 60초에 한 번 제출할 수 있습니다.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.feedback_reports(
    user_id, nickname, client_id, category, content, contact_email,
    page_url, tile_id, image_url
  ) values (
    v_user_id, v_nickname, case when v_user_id is null then p_client_id else null end,
    p_category, v_content, v_contact_email, v_page_url, v_tile_id, v_image_url
  ) returning id into v_report_id;

  return v_report_id;
end $$;

create or replace function public.admin_list_feedback_reports(
  p_category text default null,
  p_status text default null
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
begin
  if not public.is_current_user_admin() then
    raise exception '관리자 권한이 필요합니다.' using errcode = '42501';
  end if;
  if p_category is not null and p_category not in ('bug', 'suggestion', 'image_report', 'other') then
    raise exception '올바르지 않은 유형 필터입니다.' using errcode = 'P0001';
  end if;
  if p_status is not null and p_status not in ('new', 'reviewing', 'resolved', 'rejected') then
    raise exception '올바르지 않은 상태 필터입니다.' using errcode = 'P0001';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(report) order by report.created_at desc)
    from (
      select id, user_id, nickname, category, content, contact_email, page_url,
        tile_id, image_url, status, admin_note, created_at, updated_at
      from public.feedback_reports
      where (p_category is null or category = p_category)
        and (p_status is null or status = p_status)
      order by created_at desc
      limit 200
    ) report
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_update_feedback_report(
  p_report_id uuid,
  p_status text,
  p_admin_note text default null
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare v_report public.feedback_reports;
begin
  if not public.is_current_user_admin() then
    raise exception '관리자 권한이 필요합니다.' using errcode = '42501';
  end if;
  if p_status not in ('new', 'reviewing', 'resolved', 'rejected') then
    raise exception '올바른 처리 상태를 선택해 주세요.' using errcode = 'P0001';
  end if;
  if coalesce(char_length(p_admin_note), 0) > 2000 then
    raise exception '관리자 메모는 2000자 이하로 입력해 주세요.' using errcode = 'P0001';
  end if;
  update public.feedback_reports
  set status = p_status, admin_note = nullif(btrim(p_admin_note), '')
  where id = p_report_id returning * into v_report;
  if not found then raise exception '피드백을 찾을 수 없습니다.' using errcode = 'P0001'; end if;
  return to_jsonb(v_report) - 'client_id';
end $$;

create or replace function public.admin_delete_feedback_report(p_report_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
begin
  if not public.is_current_user_admin() then
    raise exception '관리자 권한이 필요합니다.' using errcode = '42501';
  end if;
  delete from public.feedback_reports where id = p_report_id;
  if not found then raise exception '피드백을 찾을 수 없습니다.' using errcode = 'P0001'; end if;
end $$;

create or replace function public.admin_get_summary()
returns jsonb language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare
  v_now timestamptz := now();
  v_today_start timestamptz := date_trunc('day', v_now at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
begin
  if not public.is_current_user_admin() then
    raise exception '관리자 권한이 필요합니다.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'new_users_today', (select count(*) from public.profiles where created_at >= v_today_start),
    'new_users_7d', (select count(*) from public.profiles where created_at >= v_now - interval '7 days'),
    'active_users_today', (select count(distinct user_id) from public.activity_events where created_at >= v_today_start),
    'active_users_7d', (select count(distinct user_id) from public.activity_events where created_at >= v_now - interval '7 days'),
    'total_image_uploads', (select count(*) from public.idol_image_submissions),
    'image_uploads_24h', (select count(*) from public.idol_image_submissions where created_at >= v_now - interval '24 hours'),
    'pending_feedback_count', (select count(*) from public.feedback_reports where status in ('new', 'reviewing')),
    'pending_image_report_count', (select count(*) from public.feedback_reports where category = 'image_report' and status in ('new', 'reviewing'))
  );
end $$;

revoke all on function public.submit_feedback_report(uuid, text, text, text, text, text, text) from public;
grant execute on function public.submit_feedback_report(uuid, text, text, text, text, text, text) to anon, authenticated;
revoke all on function public.admin_list_feedback_reports(text, text) from public, anon;
revoke all on function public.admin_update_feedback_report(uuid, text, text) from public, anon;
revoke all on function public.admin_delete_feedback_report(uuid) from public, anon;
grant execute on function public.admin_list_feedback_reports(text, text),
  public.admin_update_feedback_report(uuid, text, text),
  public.admin_delete_feedback_report(uuid) to authenticated;

commit;
