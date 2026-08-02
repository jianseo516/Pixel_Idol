import { worldViewportToMinimapRect } from "@/features/game/rendering/minimap";
import type { GameState } from "@/features/game/types/game";
import type { Point, Viewport } from "@/features/game/types/viewport";

const EMPTY_COLOR = "#252c3a";
const VIEWPORT_FILL = "rgba(248, 250, 252, 0.24)";
const VIEWPORT_STROKE = "rgba(248, 250, 252, 0.95)";
const VIEWPORT_SHADOW = "rgba(2, 6, 23, 0.9)";

interface RenderMinimapOptions {
  readonly context: CanvasRenderingContext2D;
  readonly state: GameState;
  readonly viewport: Viewport;
  readonly size: Point;
  readonly pixelRatio: number;
}

export function renderMinimap({
  context,
  state,
  viewport,
  size,
  pixelRatio,
}: RenderMinimapOptions): void {
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, size.x, size.y);
  context.fillStyle = EMPTY_COLOR;
  context.fillRect(0, 0, size.x, size.y);

  const tileWidth = size.x / state.mapSize.width;
  const tileHeight = size.y / state.mapSize.height;

  for (const tile of Object.values(state.tiles)) {
    if (tile.ownerId === null) {
      continue;
    }
    context.fillStyle = state.idols[tile.ownerId]?.color ?? EMPTY_COLOR;
    context.fillRect(
      tile.coordinate.x * tileWidth,
      tile.coordinate.y * tileHeight,
      tileWidth + 0.5,
      tileHeight + 0.5,
    );
  }

  const visibleRect = worldViewportToMinimapRect(viewport, size, state.mapSize);
  context.fillStyle = VIEWPORT_FILL;
  context.fillRect(
    visibleRect.x,
    visibleRect.y,
    visibleRect.width,
    visibleRect.height,
  );
  context.strokeStyle = VIEWPORT_SHADOW;
  context.lineWidth = 4;
  context.strokeRect(
    visibleRect.x,
    visibleRect.y,
    visibleRect.width,
    visibleRect.height,
  );
  context.strokeStyle = VIEWPORT_STROKE;
  context.lineWidth = 2;
  context.strokeRect(
    visibleRect.x,
    visibleRect.y,
    visibleRect.width,
    visibleRect.height,
  );
}
