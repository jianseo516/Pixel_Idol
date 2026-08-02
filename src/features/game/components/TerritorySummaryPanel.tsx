import type {
  Idol,
  IdolTerritorySummary,
} from "@/features/game/types/game";

interface TerritorySummaryPanelProps {
  readonly idol: Idol | undefined;
  readonly summary: IdolTerritorySummary;
}

export function TerritorySummaryPanel({
  idol,
  summary,
}: TerritorySummaryPanelProps) {
  const largest = summary.largestRegion;

  return (
    <section className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: idol?.color }}
        aria-hidden="true"
      />
      <div>
        <p className="font-bold text-white">{idol?.name} 영토 통계</p>
        <p className="mt-0.5 text-slate-400">
          전체 {summary.totalTileCount}칸 · 연결 영역 {summary.regions.length}개
        </p>
        <p className="mt-0.5 text-amber-200">
          대표 캔버스 후보 {largest?.size ?? 0}칸
          {largest
            ? ` · X ${largest.bounds.minX}~${largest.bounds.maxX}, Y ${largest.bounds.minY}~${largest.bounds.maxY}`
            : " · 보유 영토 없음"}
        </p>
      </div>
    </section>
  );
}
