-- 주의: 실행 전에 백업, 계정 보존 정책, 감사·법적 보존 요구사항을 먼저 확인하세요.
-- 공개 서비스 운영 이후에는 보존 정책을 결정하지 않은 상태로 절대 실행하지 마세요.
-- 아래 쿼리는 생성 후 30일이 지났고 public.players에 참조가 없는 익명 계정만 삭제합니다.
-- players 데이터도 함께 정리하려면 별도의 명시적 정책과 백업 절차를 먼저 마련해야 합니다.

delete from auth.users as users
where users.is_anonymous is true
  and users.created_at < now() - interval '30 days'
  and not exists (
    select 1
    from public.players as players
    where players.user_id = users.id
  );
