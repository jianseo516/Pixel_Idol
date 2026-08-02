"use client";

import { useEffect } from "react";

import { GameMinimap } from "@/features/game/components/GameMinimap";
import { useCanvasViewport } from "@/features/game/hooks/useCanvasViewport";
import { renderGameMap } from "@/features/game/rendering/canvasRenderer";
import type { Coordinate, GameState } from "@/features/game/types/game";
import type { Point } from "@/features/game/types/viewport";

interface TileMapCanvasProps {
  readonly state: GameState;
  readonly selectedCoordinate: Coordinate | null;
  readonly initialFocusWorldPoint: Point;
  readonly onSelect: (coordinate: Coordinate) => void;
}

const NAVIGATION_BUTTON_CLASS =
  "rounded-lg border border-white/15 bg-slate-950/85 px-3 py-2 text-xs font-semibold text-slate-200 shadow-lg backdrop-blur transition hover:border-white/35 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400";

export function TileMapCanvas({
  state,
  selectedCoordinate,
  initialFocusWorldPoint,
  onSelect,
}: TileMapCanvasProps) {
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
        pixelRatio,
      });
    });

    return () => cancelAnimationFrame(frameId);
  }, [canvasRef, pixelRatio, selectedCoordinate, state, viewport]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`block h-full w-full touch-none select-none ${
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
