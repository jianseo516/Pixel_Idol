"use client";

import { useEffect, useState } from "react";

import { GameMinimap } from "@/features/game/components/GameMinimap";
import { useCanvasViewport } from "@/features/game/hooks/useCanvasViewport";
import { useRepresentativeImages } from "@/features/game/hooks/useRepresentativeImages";
import { renderGameMap } from "@/features/game/rendering/canvasRenderer";
import type {
  ActionableTiles,
  Coordinate,
  GameState,
  TerritoryBoundarySegment,
} from "@/features/game/types/game";
import type { Point } from "@/features/game/types/viewport";
import type { RepresentativeCanvasLayerSpec } from "@/features/game/types/representative";

interface TileMapCanvasProps {
  readonly state: GameState;
  readonly selectedCoordinate: Coordinate | null;
  readonly initialFocusWorldPoint: Point;
  readonly actionableTiles: ActionableTiles;
  readonly representativeBoundary: readonly TerritoryBoundarySegment[];
  readonly representativeLayerSpecs: readonly RepresentativeCanvasLayerSpec[];
  readonly onSelect: (coordinate: Coordinate) => void;
}

const NAVIGATION_BUTTON_CLASS =
  "rounded-lg border border-white/15 bg-slate-950/85 px-3 py-2 text-xs font-semibold text-slate-200 shadow-lg backdrop-blur transition hover:border-white/35 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400";

export function TileMapCanvas({
  state,
  selectedCoordinate,
  initialFocusWorldPoint,
  actionableTiles,
  representativeBoundary,
  representativeLayerSpecs,
  onSelect,
}: TileMapCanvasProps) {
  const [showActionHighlights, setShowActionHighlights] = useState(true);
  const representativeLayers = useRepresentativeImages(
    representativeLayerSpecs,
  );
  const {
    canvasRef,
    viewport,
    pixelRatio,
    isDragging,
    isOverview,
    handlers,
    controls,
  } = useCanvasViewport({
    onSelect,
    selectedCoordinate,
    initialFocusWorldPoint,
    mapSize: state.mapSize,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      renderGameMap({
        context,
        state,
        viewport,
        selectedCoordinate,
        actionableTiles,
        representativeBoundary,
        representativeLayers,
        showActionHighlights,
        pixelRatio,
      });
    });

    return () => cancelAnimationFrame(frameId);
  }, [
    actionableTiles,
    canvasRef,
    pixelRatio,
    representativeBoundary,
    representativeLayers,
    selectedCoordinate,
    showActionHighlights,
    state,
    viewport,
  ]);

  return (
    <>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className={`block h-full w-full touch-none select-none focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-rose-400 ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        aria-label="아이돌 픽셀 영토 지도"
        draggable={false}
        onContextMenu={(event) => event.preventDefault()}
        {...handlers}
      />

      <GameMinimap
        state={state}
        viewport={viewport}
        onNavigate={controls.navigateToWorldPoint}
      />

      <div className="absolute top-3 right-3 z-10 rounded-xl border border-white/15 bg-slate-950/85 p-2.5 text-[11px] text-slate-200 shadow-lg backdrop-blur">
        <label className="flex cursor-pointer items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={showActionHighlights}
            onChange={(event) => setShowActionHighlights(event.target.checked)}
            className="size-3.5 accent-teal-400"
          />
          행동 가능 타일 표시
        </label>
        <div className="mt-2 grid gap-1 text-slate-300" aria-label="지도 범례">
          <span className="flex items-center gap-2">
            <span className="size-3 border-2 border-teal-400 bg-teal-400/15" />
            점령 가능
          </span>
          <span className="flex items-center gap-2">
            <span className="size-3 border-2 border-orange-400 bg-orange-400/15" />
            공격 가능
          </span>
          <span className="flex items-center gap-2">
            <span className="size-3 border-2 border-white" />
            선택한 타일
          </span>
        </div>
      </div>

      <div className="absolute right-3 bottom-3 z-10 flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-950/85 p-1.5 shadow-lg backdrop-blur">
        <span className="hidden px-1.5 text-xs text-slate-300 sm:inline">
          드래그로 이동 · 휠로 확대/축소
        </span>
        <button
          type="button"
          className={`${NAVIGATION_BUTTON_CLASS} ${
            isOverview ? "border-rose-400/80 text-rose-200" : ""
          }`}
          aria-pressed={isOverview}
          onClick={controls.showOverview}
        >
          전체 보기
        </button>
        <button
          type="button"
          className={NAVIGATION_BUTTON_CLASS}
          onClick={controls.showTerritory}
        >
          내 영토
        </button>
      </div>
    </>
  );
}
