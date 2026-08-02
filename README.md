# 아이돌 픽셀 공동 플레이 데모

Next.js, TypeScript, HTML Canvas와 Supabase를 사용하는 시즌제 영토 점령 프로토타입이다. 지도는 희소 타일만 저장하며 점령·공격 결과는 PostgreSQL RPC가 최종 결정한다. 이번 단계에는 Realtime 구독이 포함되지 않는다.

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
   - `supabase/seed.sql`

   `202608020003_real_idol_roster.sql`은 개발 단계의 더미 roster를 교체하는 일회성
   초기화 migration입니다. `players`와 `tiles`를 비운 뒤 8개 그룹과 시작 타일을
   다시 넣으므로, 운영 데이터가 생긴 뒤에는 다시 실행하지 마세요.
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

`players.last_action_at`은 서버의 `now()`를 기준으로 성공한 점령·공격 시에만
갱신됩니다. 공개 데모에서는 동일 플레이어의 행동 사이에 500ms 쿨다운을 적용합니다.

브라우저는 공용 시즌·아이돌·타일과 자신의 플레이어 행만 읽을 수 있다. 직접 쓰기는 허용되지 않으며 다음 RPC만 사용한다.

- `initialize_player`
- `change_supported_idol`
- `claim_tile`
- `attack_tile`

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
- 익명 계정은 브라우저 저장소가 삭제되면 새로운 사용자로 생성될 수 있다.
- 운영 배포 전에는 RPC 호출 제한, 요청 멱등성, 감사 로그와 마이그레이션 배포 절차를 추가해야 한다.

## 공개 데모 부하 주의사항

- 무료 플랜에서는 다수 사용자가 동시에 접속할 경우 Realtime 연결·메시지 한도에 도달할 수 있습니다.
- Realtime 연결이 끊기면 클라이언트가 재연결을 시도하며, 화면의 `동기화` 버튼으로 직접 최신 타일 상태를 받을 수 있습니다.
- 공개 운영 전에는 익명 가입과 자동화 요청을 제한하기 위해 CAPTCHA 또는 Cloudflare Turnstile 적용을 권장합니다.
- Supabase Dashboard의 Realtime 사용량과 Database 사용량을 주기적으로 확인하세요.
- 오래된 익명 계정 정리가 필요하면 보존 정책과 백업을 먼저 결정한 뒤 `supabase/maintenance/delete_old_anonymous_users.sql`을 검토하여 수동 실행하세요.
