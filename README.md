# 아이돌 픽셀 공동 플레이 데모

Next.js, TypeScript, HTML Canvas와 Supabase를 사용하는 시즌제 영토 점령 프로토타입이다. 지도는 희소 타일만 저장하며 점령·공격 결과는 PostgreSQL RPC가 최종 결정한다. 타일과 대표 이미지 변경은 Realtime으로 공유된다.

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 연다.

## Supabase 설정

1. Supabase Dashboard에서 프로젝트를 만든다.
2. Authentication 설정에서 Anonymous Sign-Ins를 활성화한다.
3. SQL Editor에서 다음 파일을 순서대로 실행한다.
   - `supabase/migrations/202608020001_shared_game.sql`
   - `supabase/migrations/202608020002_tiles_realtime.sql`
   - `supabase/migrations/202608020003_real_idol_roster.sql`
   - `supabase/migrations/202608020004_demo_action_cooldown.sql`
   - `supabase/migrations/202608020005_raw_idol_images.sql`
   - `supabase/migrations/202608020006_expand_world_map.sql`
   - `supabase/seed.sql`

   `202608020003_real_idol_roster.sql`은 개발 단계의 더미 roster를 교체하는 일회성
   초기화 migration입니다. `players`와 `tiles`를 비운 뒤 8개 그룹과 시작 타일을
   다시 넣으므로, 운영 데이터가 생긴 뒤에는 다시 실행하지 마세요.
   migration은 번호 순서대로 한 번만 실행합니다. 이미 적용된 migration을 다시 실행하지 마세요.
   기존 DB는 새로 추가된 005와 006만 실행하며, `seed.sql`은 신규 설치용입니다.
   006 실행 중에는 접속 중인 클라이언트를 닫고, 완료 후 새로 열어 이동된 타일의 초기 스냅샷을 받아야 합니다.
4. 프로젝트의 공개 URL과 publishable key를 `.env.local`에 설정한다.

필요한 환경 변수 이름:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

환경 변수의 실제 값은 저장소에 커밋하지 않는다. 브라우저 데모에는 service role 또는 secret key가 필요하지 않다. 환경 변수를 변경한 뒤에는 Next.js 개발 서버를 다시 시작한다.

## 데이터 구조

- `seasons`: 시즌 기간, 상태, 지도 크기
- `idols`: 아이돌 이름, 대표 색상, 목업 이미지 경로
- `tiles`: `(season_id, x, y)` 기본 키를 사용하는 점령 타일 전용 희소 저장소
- `players`: 익명 사용자별 응원 아이돌과 토큰
- `idol_image_submissions`: 교체·제거 이력을 포함한 대표 이미지 제출 기록

`players.last_action_at`은 서버의 `now()`를 기준으로 성공한 점령·공격 시에만
갱신됩니다. 공개 데모에서는 동일 플레이어의 행동 사이에 500ms 쿨다운을 적용합니다.

브라우저는 공용 시즌·아이돌·타일과 자신의 플레이어 행만 읽을 수 있다. 직접 쓰기는 허용되지 않으며 다음 RPC만 사용한다.

- `initialize_player`
- `change_supported_idol`
- `claim_tile`
- `attack_tile`
- `submit_raw_idol_image`

## 사용자 대표 이미지 업로드

- PNG, JPEG, WebP만 허용하며 최대 크기는 3MB이고 한 변은 5000px 이하입니다. 정상적으로 디코딩되는 양수 크기 이미지라면 작은 픽셀아트도 업로드할 수 있습니다.
- 승인이나 자동 검열 없이 마지막으로 성공한 업로드가 즉시 공용 대표 이미지가 됩니다.
- 같은 사용자는 서버 시간 기준 60초에 한 번만 변경할 수 있습니다.
- 파일은 `idol-community-images/{userId}/{seasonId}/{idolId}/{UUID}.{확장자}`에 사용자별 새 객체로 저장되고 덮어쓰지 않습니다.
- 교체된 제출과 Storage 파일은 자동 삭제하지 않으므로 Storage 사용량이 계속 증가할 수 있습니다. 운영 전 오래된 `replaced` 파일의 보존·정리 정책이 필요합니다.
- 일반 사용자는 active 이미지 정보와 자신의 기록만 조회할 수 있습니다.

운영자 되돌리기 예시(SQL Editor 전용):

```sql
select public.rollback_idol_image('bts');
```

현재 제출 테이블을 유지한 채 향후 후보 목록, 무료 투표, 유료 응원권, 기간별 1위, 주간·시즌 대표 이미지, 관리자 검토 구조로 확장할 수 있습니다.

## 360×216 세계 지도

- 논리 지도는 90×54에서 360×216으로 확장되어 면적이 16배인 77,760좌표를 갖습니다.
- 기존 시작 영토는 모두 `x + 135`, `y + 81`로 이동하여 중앙 90×54 전투 구역에 유지됩니다.
- DB와 `GameState.tiles`에는 소유 타일만 저장하며 전체 빈 타일 객체를 생성하지 않습니다.
- Canvas는 visible range와 희소 소유 타일만 렌더링하고, 낮은 zoom에서는 개별 격자를 숨기거나 10칸 보조 격자로 단순화합니다.
- 최초 화면은 중앙 전투 구역, `전체 보기`는 360×216 전체, `내 영토`는 현재 보유 영토를 기준으로 표시합니다.

## 검증

```bash
npm run lint
npx tsc --noEmit --incremental false
npm test
npm run build
git diff --check
npm audit
```

## 현재 제한

- 플레이어 상태 Realtime 구독은 아직 없으며 자신의 RPC 응답만 반영한다.
- 타일 Realtime은 `INSERT`, `UPDATE`만 구독한다. 플레이어 토큰은 자신의 RPC 응답으로 갱신한다.
- 대표 이미지 업로드에는 자동 콘텐츠 검열·신고·승인 절차가 없으므로 공개 운영 전 별도 안전 정책이 필요하다.
- 익명 계정은 브라우저 저장소가 삭제되면 새로운 사용자로 생성될 수 있다.
- 운영 배포 전에는 RPC 호출 제한, 요청 멱등성, 감사 로그와 마이그레이션 배포 절차를 추가해야 한다.

## 공개 데모 부하 주의사항

- 무료 플랜에서는 다수 사용자가 동시에 접속할 경우 Realtime 연결·메시지 한도에 도달할 수 있습니다.
- Realtime 연결이 끊기면 클라이언트가 재연결을 시도하며, 화면의 `동기화` 버튼으로 직접 최신 타일 상태를 받을 수 있습니다.
- 공개 운영 전에는 익명 가입과 자동화 요청을 제한하기 위해 CAPTCHA 또는 Cloudflare Turnstile 적용을 권장합니다.
- Supabase Dashboard의 Realtime 사용량과 Database 사용량을 주기적으로 확인하세요.
- 오래된 익명 계정 정리가 필요하면 보존 정책과 백업을 먼저 결정한 뒤 `supabase/maintenance/delete_old_anonymous_users.sql`을 검토하여 수동 실행하세요.
# 닉네임 계정 설정

`supabase/migrations/202608020007_nickname_auth_profiles_and_player_stats.sql`을 기존 migration 다음에 SQL Editor에서 실행합니다. 이 migration은 기존 시즌과 타일을 삭제하지 않습니다.

Supabase Dashboard의 **Authentication → Providers → Email**에서 Email provider를 켜고 **Confirm email**을 꺼야 합니다. 사용자는 실제 이메일을 입력하지 않으며, 앱이 닉네임에서 만든 내부 식별용 주소만 Auth에 전달합니다. 비밀번호 분실 복구는 현재 지원하지 않습니다.

**Authentication → Providers → Anonymous Sign-Ins**는 비활성화합니다. 앱은 익명 로그인을 요청하지 않으며, 브라우저에 과거 익명 세션이 남아 있으면 로컬 세션만 정리한 뒤 비로그인 공개 관람 상태로 전환합니다. 기존 익명 계정 현황은 `supabase/maintenance/inspect_legacy_anonymous_users.sql`로 먼저 조회하세요.

## 최소 관리자 통계

`supabase/migrations/202608020009_minimal_admin_stats.sql`을 008 다음에 실행합니다. 관리자 계정은 SQL Editor에서만 등록합니다.

```sql
select user_id, nickname, created_at
from public.profiles
where normalized_nickname = '<정규화한-닉네임>';

insert into public.admin_users (user_id)
values ('<확인한-user-id>')
on conflict (user_id) do nothing;
```

관리자 통계는 현재 로그인 JWT로 `admin_get_summary()`를 호출합니다. service role 환경변수는 프런트엔드나 Vercel에 추가하지 않습니다. 온라인 사용자는 게임 페이지에 로그인한 사용자만 Supabase Realtime Presence 채널에 참여하여 집계됩니다.

공개 지도 조회는 anon 역할에 허용되지만 점령, 공격, 응원 아이돌 변경, 이미지 업로드는 비익명 authenticated 사용자만 실행할 수 있습니다. 브라우저에 service role key를 설정하지 마세요.
