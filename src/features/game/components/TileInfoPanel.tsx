import { GAME_CONFIG } from "@/config/game";
import type {
  Idol,
  Tile,
  TileActionPreview,
} from "@/features/game/types/game";

export interface GameActionMessage {
  readonly kind: "success" | "error";
  readonly text: string;
}

interface TileInfoPanelProps {
  readonly selectedTile: Tile | null;
  readonly owner: Idol | null;
  readonly tokens: number;
  readonly preview: TileActionPreview | null;
  readonly actionMessage: GameActionMessage | null;
  readonly isPending: boolean;
  readonly onAction: () => void;
  readonly onClear: () => void;
}

export function TileInfoPanel({
  selectedTile,
  owner,
  tokens,
  preview,
  actionMessage,
  isPending,
  onAction,
  onClear,
}: TileInfoPanelProps) {
  return (
    <aside className="rounded-2xl border border-slate-700/80 bg-slate-900/90 p-5 shadow-xl shadow-black/20 lg:h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-rose-400 uppercase">
            Game status
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">타일 정보</h2>
        </div>
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-right">
          <p className="text-[10px] font-semibold tracking-wider text-amber-300 uppercase">
            보유 토큰
          </p>
          <p className="text-lg font-black text-amber-100">{tokens}</p>
        </div>
      </div>

      {selectedTile && preview ? (
        <>
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
            <dt className="text-slate-400">좌표</dt>
            <dd className="text-right font-mono font-semibold text-white">
              ({selectedTile.coordinate.x}, {selectedTile.coordinate.y})
            </dd>
            <dt className="text-slate-400">소유</dt>
            <dd className="flex items-center justify-end gap-2 font-semibold text-white">
              {owner ? (
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: owner.color }}
                  aria-hidden="true"
                />
              ) : null}
              {owner?.name ?? "빈 영토"}
            </dd>
            <dt className="text-slate-400">HP</dt>
            <dd className="text-right font-semibold text-white">
              {selectedTile.hp} / {GAME_CONFIG.maxTileHp}
            </dd>
            <dt className="text-slate-400">예상 행동</dt>
            <dd className="text-right font-semibold text-white">{preview.label}</dd>
            <dt className="text-slate-400">가능 여부</dt>
            <dd className={`text-right font-semibold ${preview.allowed ? "text-emerald-300" : "text-slate-400"}`}>
              {preview.allowed ? "가능" : "불가"}
            </dd>
            <dt className="text-slate-400">비용</dt>
            <dd className="text-right font-semibold text-white">
              {preview.cost === null ? "-" : `${preview.cost}토큰`}
            </dd>
          </dl>

          {preview.reasonMessage ? (
            <p className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm leading-5 text-slate-300">
              {preview.reasonMessage}
            </p>
          ) : null}

          {preview.allowed ? (
            <button
              type="button"
              onClick={onAction}
              disabled={isPending}
              className="mt-4 w-full rounded-xl bg-rose-500 px-4 py-3 text-sm font-black text-white transition hover:bg-rose-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? "처리 중..."
                : `${preview.actionType === "CLAIM" ? "점령" : "공격"} · ${preview.cost}토큰`}
            </button>
          ) : null}

          {actionMessage ? (
            <p
              role="status"
              className={`mt-4 rounded-lg border px-3 py-2 text-sm font-semibold ${
                actionMessage.kind === "success"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : "border-rose-400/30 bg-rose-400/10 text-rose-200"
              }`}
            >
              {actionMessage.text}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onClear}
            className="mt-4 w-full rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-400 hover:text-white"
          >
            선택 해제
          </button>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-300">지도에서 타일을 선택해 주세요.</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            드래그로 이동하고 휠로 확대하거나 축소할 수 있습니다.
          </p>
        </div>
      )}
    </aside>
  );
}
