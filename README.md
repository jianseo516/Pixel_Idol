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
   - `supabase/seed.sql`
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

- Realtime 구독 없음: RPC 성공 후 전체 희소 스냅샷을 다시 조회한다.
- 익명 계정은 브라우저 저장소가 삭제되면 새로운 사용자로 생성될 수 있다.
- 운영 배포 전에는 RPC 호출 제한, 요청 멱등성, 감사 로그와 마이그레이션 배포 절차를 추가해야 한다.
