"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import { GAME_CONFIG } from "@/config/game";
import {
  centerViewportAtWorldPoint,
  createFittedViewport,
  createInitialViewport,
  getWheelZoom,
  panViewport,
  resizeViewport,
  screenToTile,
  tileToWorld,
  zoomViewportAtPoint,
} from "@/features/game/rendering/viewport";
import type { Coordinate, MapSize } from "@/features/game/types/game";
import type { Point, Viewport } from "@/features/game/types/viewport";

interface DragState {
  readonly pointerId: number;
  readonly startPoint: Point;
  readonly startViewport: Viewport;
  moved: boolean;
}

interface UseCanvasViewportOptions {
  readonly onSelect: (coordinate: Coordinate) => void;
  readonly initialFocusWorldPoint: Point;
  readonly mapSize: MapSize;
}

interface CanvasViewportHandlers {
  readonly onPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  readonly onPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  readonly onPointerUp: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  readonly onPointerCancel: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  readonly onLostPointerCapture: () => void;
  readonly onWheel: (event: ReactWheelEvent<HTMLCanvasElement>) => void;
}

export interface CanvasViewportControls {
  readonly showOverview: () => void;
  readonly showTerritory: () => void;
  readonly navigateToWorldPoint: (worldPoint: Point) => void;
}

const INITIAL_VIEWPORT: Viewport = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  width: 1,
  height: 1,
};

function getCanvasPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Point {
  const bounds = canvas.getBoundingClientRect();
  return { x: clientX - bounds.left, y: clientY - bounds.top };
}

export function useCanvasViewport({
  onSelect,
  initialFocusWorldPoint,
  mapSize,
}: UseCanvasViewportOptions): {
  readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
  readonly viewport: Viewport;
  readonly pixelRatio: number;
  readonly isDragging: boolean;
  readonly isOverview: boolean;
  readonly handlers: CanvasViewportHandlers;
  readonly controls: CanvasViewportControls;
} {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<Viewport>(INITIAL_VIEWPORT);
  const initialFocusRef = useRef(initialFocusWorldPoint);
  const dragRef = useRef<DragState | null>(null);
  const hasSizedRef = useRef(false);
  const overviewRef = useRef(false);
  const [viewport, setViewportState] = useState(INITIAL_VIEWPORT);
  const [pixelRatio, setPixelRatio] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverview, setIsOverview] = useState(false);

  useEffect(() => {
    initialFocusRef.current = initialFocusWorldPoint;
  }, [initialFocusWorldPoint]);

  const setViewport = useCallback((next: Viewport) => {
    viewportRef.current = next;
    setViewportState(next);
  }, []);

  const setOverview = useCallback((next: boolean) => {
    overviewRef.current = next;
    setIsOverview(next);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }

      const width = Math.max(entry.contentRect.width, 1);
      const height = Math.max(entry.contentRect.height, 1);
      const nextPixelRatio = Math.max(window.devicePixelRatio || 1, 1);

      canvas.width = Math.round(width * nextPixelRatio);
      canvas.height = Math.round(height * nextPixelRatio);
      setPixelRatio(nextPixelRatio);

      const nextViewport = !hasSizedRef.current
        ? createInitialViewport(width, height, initialFocusRef.current, mapSize)
        : overviewRef.current
          ? createFittedViewport(width, height, mapSize)
          : resizeViewport(viewportRef.current, width, height, mapSize);
      hasSizedRef.current = true;
      setViewport(nextViewport);
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [mapSize, setViewport]);

  const finishPointer = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>, allowSelection: boolean) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      if (allowSelection && !drag.moved) {
        const point = getCanvasPoint(
          event.currentTarget,
          event.clientX,
          event.clientY,
        );
        const coordinate = screenToTile(point, viewportRef.current, mapSize);
        if (coordinate) {
          if (overviewRef.current) {
            const tileOrigin = tileToWorld(coordinate);
            const tileCenter = {
              x: tileOrigin.x + GAME_CONFIG.tileSize / 2,
              y: tileOrigin.y + GAME_CONFIG.tileSize / 2,
            };
            setViewport(
              createInitialViewport(
                viewportRef.current.width,
                viewportRef.current.height,
                tileCenter,
                mapSize,
              ),
            );
          }
          setOverview(false);
          onSelect(coordinate);
        }
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      dragRef.current = null;
      setIsDragging(false);
    },
    [mapSize, onSelect, setOverview, setViewport],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      const startPoint = getCanvasPoint(
        event.currentTarget,
        event.clientX,
        event.clientY,
      );
      dragRef.current = {
        pointerId: event.pointerId,
        startPoint,
        startViewport: viewportRef.current,
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      const point = getCanvasPoint(
        event.currentTarget,
        event.clientX,
        event.clientY,
      );
      const delta = {
        x: point.x - drag.startPoint.x,
        y: point.y - drag.startPoint.y,
      };

      if (!drag.moved && Math.hypot(delta.x, delta.y) >= GAME_CONFIG.dragThreshold) {
        drag.moved = true;
        setIsDragging(true);
        setOverview(false);
      }

      if (drag.moved) {
        setViewport(panViewport(drag.startViewport, delta, mapSize));
      }
    },
    [mapSize, setOverview, setViewport],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => finishPointer(event, true),
    [finishPointer],
  );
  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => finishPointer(event, false),
    [finishPointer],
  );
  const onLostPointerCapture = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  const onWheel = useCallback(
    (event: ReactWheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const point = getCanvasPoint(
        event.currentTarget,
        event.clientX,
        event.clientY,
      );
      const nextZoom = getWheelZoom(viewportRef.current.zoom, event.deltaY);
      setOverview(false);
      setViewport(
        zoomViewportAtPoint(viewportRef.current, point, nextZoom, mapSize),
      );
    },
    [mapSize, setOverview, setViewport],
  );

  const showOverview = useCallback(() => {
    setViewport(
      createFittedViewport(
        viewportRef.current.width,
        viewportRef.current.height,
        mapSize,
      ),
    );
    setOverview(true);
  }, [mapSize, setOverview, setViewport]);

  const showTerritory = useCallback(() => {
    setViewport(
      createInitialViewport(
        viewportRef.current.width,
        viewportRef.current.height,
        initialFocusRef.current,
        mapSize,
      ),
    );
    setOverview(false);
  }, [mapSize, setOverview, setViewport]);

  const navigateToWorldPoint = useCallback(
    (worldPoint: Point) => {
      setOverview(false);
      setViewport(
        centerViewportAtWorldPoint(viewportRef.current, worldPoint, mapSize),
      );
    },
    [mapSize, setOverview, setViewport],
  );

  return {
    canvasRef,
    viewport,
    pixelRatio,
    isDragging,
    isOverview,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture,
      onWheel,
    },
    controls: {
      showOverview,
      showTerritory,
      navigateToWorldPoint,
    },
  };
}
