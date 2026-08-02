-- 읽기 전용 점검 SQL이다. 어떤 사용자나 게임 데이터도 삭제하지 않는다.
-- 운영 데이터 보존 정책과 백업을 결정하기 전에 삭제 SQL을 실행하지 말 것.

-- 1. 기존 익명 Auth 사용자 수
select count(*) as anonymous_user_count
from auth.users
where is_anonymous is true;

-- 2. 익명 사용자별 연결된 player 행 수
select
  u.id as anonymous_user_id,
  u.created_at as auth_created_at,
  count(p.user_id) as linked_player_count
from auth.users u
left join public.players p on p.user_id = u.id
where u.is_anonymous is true
group by u.id, u.created_at
order by u.created_at;

-- 3. 안전한 정리 순서 예시(의도적으로 주석 처리됨)
--    a) 보존할 player/행동 데이터가 없는지 위 조회로 확인한다.
--    b) 백업 및 보존 정책을 확정한다.
--    c) auth.users 삭제 시 FK on delete cascade로 players가 함께 삭제됨을 재확인한다.
--    d) Supabase 관리 권한이 있는 서버/SQL Editor에서 대상 UUID를 명시해 삭제한다.
-- delete from auth.users where id = '<검증한-익명-사용자-UUID>' and is_anonymous is true;
