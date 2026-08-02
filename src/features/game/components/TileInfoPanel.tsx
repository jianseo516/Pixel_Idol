import type { Idol, Tile } from "@/features/game/types/game";

interface TileInfoPanelProps {
  readonly selectedTile: Tile | null;
  readonly owner: Idol | null;
  readonly onClear: () => void;
}

export function TileInfoPanel({ selectedTile, owner, onClear }: TileInfoPanelProps) {
  return (
    <aside className="rounded-2xl border border-slate-700/80 bg-slate-900/90 p-5 shadow-xl shadow-black/20 lg:h-full">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-rose-400 uppercase">
            Tile info
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">타일 정보</h2>
        </div>
        {selectedTile ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-400 hover:text-white"
          >
            선택 해제
          </button>
        ) : null}
      </div>

      {selectedTile ? (
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-4 text-sm">
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
          <dd className="text-right font-semibold text-white">{selectedTile.hp}</dd>
        </dl>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-300">
            지도에서 타일을 선택해 주세요.
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            드래그로 이동하고 휠로 확대하거나 축소할 수 있습니다.
          </p>
        </div>
      )}

      <div className="mt-6 border-t border-slate-800 pt-4 text-xs leading-5 text-slate-500">
        이번 단계에서는 타일 정보만 확인할 수 있습니다. 점령과 공격은 아직
        실행되지 않습니다.
      </div>
    </aside>
  );
}

