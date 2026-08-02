import type { Coordinate } from "@/features/game/types/game";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Viewport {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly zoom: number;
  readonly width: number;
  readonly height: number;
}

export interface VisibleTileRange {
  readonly startX: number;
  readonly endX: number;
  readonly startY: number;
  readonly endY: number;
}

export interface CanvasSelection {
  readonly coordinate: Coordinate;
  readonly screenPoint: Point;
}

