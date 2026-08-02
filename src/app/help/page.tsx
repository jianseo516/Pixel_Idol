import { GAME_CONFIG } from "@/config/game";
import { IDOL_IMAGE_MAX_BYTES, IDOL_IMAGE_UPLOAD_COOLDOWN_MS } from "@/features/game/data/idolImageUpload";
import { HelpAuthCta } from "@/features/auth/HelpAuthCta";
import { FeedbackEntryButton } from "@/features/feedback/FeedbackEntryButton";

const sections = [
  ["게임 목표", "응원하는 아이돌의 영토를 넓히는 실시간 타일 점령 게임입니다."],
  ["시작 방법", "회원가입과 로그인 후 응원 아이돌을 선택하고, 내 영토와 상하좌우로 맞닿은 빈 타일을 선택해 점령합니다."],
  ["점령과 공격", `빈 타일 점령과 상대 타일 공격에는 각각 ${GAME_CONFIG.claimTokenCost}포인트가 필요합니다. 대각선은 연결로 인정하지 않으며 공격 피해는 ${GAME_CONFIG.attackDamage}, 타일 최대 HP는 ${GAME_CONFIG.maxTileHp}입니다.`],
  ["공격 포인트", `현재 최대 표시값은 ${GAME_CONFIG.maxActionPoints}포인트입니다. 현재 서버에는 자동 회복 규칙이 없으며 포인트가 부족하면 행동할 수 없습니다.`],
  ["대표 이미지", `응원 아이돌 이미지는 PNG, JPEG, WebP 형식으로 최대 ${IDOL_IMAGE_MAX_BYTES / 1024 / 1024}MB까지 업로드할 수 있습니다. 변경 간격은 ${IDOL_IMAGE_UPLOAD_COOLDOWN_MS / 1000}초이며, ${GAME_CONFIG.representativeImageMinTileCount}칸·가로 ${GAME_CONFIG.representativeImageMinWidthInTiles}칸·세로 ${GAME_CONFIG.representativeImageMinHeightInTiles}칸 이상인 대표 영역에서만 표시됩니다.`],
  ["실시간 플레이", "여러 사용자가 같은 지도를 공유하며 다른 사용자의 점령, 공격, 대표 이미지 변경이 새로고침 없이 반영될 수 있습니다."],
  ["계정 안내", "이메일 없이 닉네임과 비밀번호를 사용합니다. 닉네임은 중복할 수 없고 현재 변경할 수 없습니다. 비밀번호 분실 복구도 지원하지 않습니다."],
  ["운영 정책", "부적절하거나 저작권·초상권을 침해하는 이미지 업로드를 금지합니다. 운영자는 이미지를 제거하고 비정상적인 반복 요청이나 자동화 행동을 제한할 수 있습니다."],
] as const;

export default function HelpPage() {
  return <main className="min-h-dvh bg-slate-950 px-4 py-10 text-slate-100"><div className="mx-auto max-w-3xl"><p className="text-xs font-bold tracking-[.2em] text-rose-400">PIXEL IDOL</p><h1 className="mt-2 text-3xl font-black">Pixel Idol 이용 방법</h1><div className="mt-8 grid gap-3">{sections.map(([title, body]) => <details key={title} open={title === "게임 목표"} className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><summary className="cursor-pointer font-black">{title}</summary><p className="mt-3 text-sm leading-7 text-slate-300">{body}</p></details>)}</div><div className="mt-6 flex justify-end"><FeedbackEntryButton className="rounded-xl bg-sky-300 px-4 py-3 text-sm font-black text-sky-950 hover:bg-sky-200" /></div><HelpAuthCta /></div></main>;
}
