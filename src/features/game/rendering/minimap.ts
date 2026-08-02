import {
  centerViewportAtWorldPoint,
  getMapWorldSize,
  screenToWorld,
} from "@/features/game/rendering/viewport";
import { DEFAULT_MAP_SIZE } from "@/config/game";
import type { MapSize } from "@/features/game/types/game";
import type { Point, Viewport } from "@/features/game/types/viewport";

export interface MinimapRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function minimapPointToWorld(
  point: Point,
  minimapSize: Point,
  dimensions: MapSize = DEFAULT_MAP_SIZE,
): Point {
  const mapSize = getMapWorldSize(dimensions);
  return {
    x: (clamp(point.x, 0, minimapSize.x) / minimapSize.x) * mapSize.x,
    y: (clamp(point.y, 0, minimapSize.y) / minimapSize.y) * mapSize.y,
  };
}

export function worldViewportToMinimapRect(
  viewport: Viewport,
  minimapSize: Point,
  dimensions: MapSize = DEFAULT_MAP_SIZE,
): MinimapRect {
  const mapSize = getMapWorldSize(dimensions);
  const topLeft = screenToWorld({ x: 0, y: 0 }, viewport);
  const bottomRight = screenToWorld(
    { x: viewport.width, y: viewport.height },
    viewport,
  );
  const left = clamp(topLeft.x, 0, mapSize.x);
  const top = clamp(topLeft.y, 0, mapSize.y);
  const right = clamp(bottomRight.x, 0, mapSize.x);
  const bottom = clamp(bottomRight.y, 0, mapSize.y);

  return {
    x: (left / mapSize.x) * minimapSize.x,
    y: (top / mapSize.y) * minimapSize.y,
    width: ((right - left) / mapSize.x) * minimapSize.x,
    height: ((bottom - top) / mapSize.y) * minimapSize.y,
  };
}

export function centerViewportFromMinimapPoint(
  viewport: Viewport,
  minimapPoint: Point,
  minimapSize: Point,
  mapSize: MapSize = DEFAULT_MAP_SIZE,
): Viewport {
  return centerViewportAtWorldPoint(
    viewport,
    minimapPointToWorld(minimapPoint, minimapSize, mapSize),
    mapSize,
  );
}
