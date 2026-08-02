"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { GAME_CONFIG } from "@/config/game";
import { minimapPointToWorld } from "@/features/game/rendering/minimap";
import { renderMinimap } from "@/features/game/rendering/minimapRenderer";
import type { GameState } from "@/features/game/types/game";
import type { Point, Viewport } from "@/features/game/types/viewport";

interface GameMinimapProps {
  readonly state: GameState;
  readonly viewport: Viewport;
  readonly onNavigate: (worldPoint: Point) => void;
}

const MINIMAP_SIZE = {
  x: GAME_CONFIG.minimapWidth,
  y: GAME_CONFIG.minimapHeight,
} as const;

function getMinimapPoint(
  element: HTMLElement,
  clientX: number,
  clientY: number,
): Point {
  const bounds = element.getBoundingClientRect();
  return { x: clientX - bounds.left, y: clientY - bounds.top };
}

export function GameMinimap({ state, viewport, onNavigate }: GameMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const latestPointRef = useRef<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const pixelRatio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.round(MINIMAP_SIZE.x * pixelRatio);
    canvas.height = Math.round(MINIMAP_SIZE.y * pixelRatio);
    const frameId = requestAnimationFrame(() => {
      renderMinimap({ context, state, viewport, size: MINIMAP_SIZE, pixelRatio });
    });

    return () => cancelAnimationFrame(frameId);
  }, [state, viewport]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );

  const navigate = useCallback(
    (point: Point) => {
      onNavigate(minimapPointToWorld(point, MINIMAP_SIZE, state.mapSize));
    },
    [onNavigate, state.mapSize],
  );

  const scheduleNavigate = useCallback(
    (point: Point) => {
      latestPointRef.current = point;
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        const latestPoint = latestPointRef.current;
        if (latestPoint) {
          navigate(latestPoint);
        }
      });
    },
    [navigate],
  );

  const resetDrag = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    activePointerRef.current = null;
    latestPointRef.current = null;
    setIsDragging(false);
  }, []);

  const finishDrag = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (activePointerRef.current !== event.pointerId) {
        return;
      }

      if (frameRef.current !== null && latestPointRef.current) {
        navigate(latestPointRef.current);
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      resetDrag();
    },
    [navigate, resetDrag],
  );

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    activePointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    navigate(
      getMinimapPoint(event.currentTarget, event.clientX, event.clientY),
    );
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (activePointerRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    scheduleNavigate(
      getMinimapPoint(event.currentTarget, event.clientX, event.clientY),
    );
  };

  const handleKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate({ x: MINIMAP_SIZE.x / 2, y: MINIMAP_SIZE.y / 2 });
    }
  };

  return (
    <button
      type="button"
      aria-label="미니맵을 드래그해 지도 이동"
      className={`absolute top-3 left-3 z-10 touch-none overflow-hidden rounded-xl border bg-slate-950 shadow-xl shadow-black/40 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 ${
        isDragging
          ? "cursor-grabbing border-rose-300/80"
          : "cursor-grab border-white/30 hover:border-white/60"
      }`}
      style={{ width: MINIMAP_SIZE.x, height: MINIMAP_SIZE.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={resetDrag}
      onKeyDown={handleKeyboard}
      onClick={(event) => event.preventDefault()}
      onWheel={(event) => event.stopPropagation()}
    >
      <canvas ref={canvasRef} className="block size-full" aria-hidden="true" />
    </button>
  );
}
