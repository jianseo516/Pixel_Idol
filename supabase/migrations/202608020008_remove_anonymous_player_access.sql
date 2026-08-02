begin;

-- 과거 익명 JWT는 authenticated 역할을 사용하므로 역할명만으로 쓰기를 허용하지 않는다.
drop policy if exists "authenticated users read public nicknames" on public.profiles;
create policy "permanent users read public nicknames"
  on public.profiles for select to authenticated
  using (public.is_permanent_user());
drop policy if exists "users insert own profile" on public.profiles;
create policy "permanent users insert own profile"
  on public.profiles for insert to authenticated
  with check (public.is_permanent_user() and user_id = auth.uid());
drop policy if exists "users update own profile" on public.profiles;
create policy "permanent users update own profile"
  on public.profiles for update to authenticated
  using (public.is_permanent_user() and user_id = auth.uid())
  with check (public.is_permanent_user() and user_id = auth.uid());

drop policy if exists "players read own state" on public.players;
create policy "permanent users read own player state"
  on public.players for select to authenticated
  using (public.is_permanent_user() and user_id = auth.uid());

drop policy if exists "users read own image submissions" on public.idol_image_submissions;
create policy "permanent users read own image submissions"
  on public.idol_image_submissions for select to authenticated
  using (public.is_permanent_user() and user_id = auth.uid());

drop policy if exists "users delete own idol image objects" on storage.objects;
create policy "permanent users delete own idol image objects"
  on storage.objects for delete to authenticated
  using (
    public.is_permanent_user()
    and bucket_id = 'idol-community-images'
    and owner_id = auth.uid()::text
  );

-- initialize_player, change_supported_idol, claim_tile, attack_tile은 007에서
-- public.is_permanent_user()를 RPC 본문 첫 검증으로 사용한다.
-- 이미지 INSERT는 Storage 정책과 idol_image_submissions trigger에서 이중 검증한다.

commit;
