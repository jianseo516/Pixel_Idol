import { GAME_CONFIG } from "@/config/game";
import { getStoredTile } from "@/features/game/logic/coordinates";
import {
  getVisibleTileRange,
  tileToScreen,
} from "@/features/game/rendering/viewport";
import type {
  ActionableTiles,
  Coordinate,
  GameState,
  Tile,
} from "@/features/game/types/game";
import type {
  Viewport,
  VisibleTileRange,
} from "@/features/game/types/viewport";

const EMPTY_TILE_COLOR = "#202633";
const MAP_BACKGROUND_COLOR = "#10141d";
const GRID_COLOR = "rgba(148, 163, 184, 0.22)";
const MAP_BORDER_COLOR = "rgba(148, 163, 184, 0.55)";
const SELECTED_COLOR = "#f8fafc";
const CLAIMABLE_FILL = "rgba(45, 212, 191, 0.14)";
const CLAIMABLE_STROKE = "rgba(45, 212, 191, 0.95)";
const ATTACKABLE_FILL = "rgba(251, 146, 60, 0.14)";
const ATTACKABLE_STROKE = "rgba(251, 146, 60, 0.98)";

interface RenderGameMapOptions {
  readonly context: CanvasRenderingContext2D;
  readonly state: GameState;
  readonly viewport: Viewport;
  readonly selectedCoordinate: Coordinate | null;
  readonly actionableTiles: ActionableTiles;
  readonly showActionHighlights: boolean;
  readonly pixelRatio: number;
}

function drawActionHighlights(
  context: CanvasRenderingContext2D,
  coordinates: readonly Coordinate[],
  viewport: Viewport,
  range: VisibleTileRange,
  tileScreenSize: number,
  fillStyle: string,
  strokeStyle: string,
): void {
  const inset = Math.max(1, viewport.zoom);
  context.fillStyle = fillStyle;
  context.strokeStyle = strokeStyle;
  context.lineWidth = Math.max(1.5, viewport.zoom * 1.4);

  for (const coordinate of coordinates) {
    if (
      coordinate.x < range.startX ||
      coordinate.x >= range.endX ||
      coordinate.y < range.startY ||
      coordinate.y >= range.endY
    ) {
      continue;
    }
    const screen = tileToScreen(coordinate, viewport);
    context.fillRect(screen.x, screen.y, tileScreenSize, tileScreenSize);
    context.strokeRect(
      screen.x + inset,
      screen.y + inset,
      tileScreenSize - inset * 2,
      tileScreenSize - inset * 2,
    );
  }
}

function getTileColor(tile: Tile, state: GameState): string {
  if (tile.ownerId === null) {
    return EMPTY_TILE_COLOR;
  }

  const ownerColor = state.idols[tile.ownerId]?.color ?? EMPTY_TILE_COLOR;
  if (tile.hp >= GAME_CONFIG.maxTileHp) {
    return ownerColor;
  }

  const healthRatio = Math.max(tile.hp, 0) / GAME_CONFIG.maxTileHp;
  const alpha = 0.45 + healthRatio * 0.55;
  return `${ownerColor}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

export function renderGameMap({
  context,
  state,
  viewport,
  selectedCoordinate,
  actionableTiles,
  showActionHighlights,
  pixelRatio,
}: RenderGameMapOptions): void {
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, viewport.width, viewport.height);
  context.fillStyle = MAP_BACKGROUND_COLOR;
  context.fillRect(0, 0, viewport.width, viewport.height);

  const tileScreenSize = GAME_CONFIG.tileSize * viewport.zoom;
  const range = getVisibleTileRange(viewport, state.mapSize);

  context.lineWidth = 1;
  context.strokeStyle = GRID_COLOR;

  for (let y = range.startY; y < range.endY; y += 1) {
    for (let x = range.startX; x < range.endX; x += 1) {
      const coordinate = { x, y };
      const tile = getStoredTile(state, coordinate);

      const screen = tileToScreen(coordinate, viewport);
      context.fillStyle = tile ? getTileColor(tile, state) : EMPTY_TILE_COLOR;
      context.fillRect(screen.x, screen.y, tileScreenSize, tileScreenSize);
      context.strokeRect(screen.x, screen.y, tileScreenSize, tileScreenSize);
    }
  }

  const mapOrigin = tileToScreen({ x: 0, y: 0 }, viewport);
  context.strokeStyle = MAP_BORDER_COLOR;
  context.lineWidth = 2;
  context.strokeRect(
    mapOrigin.x,
    mapOrigin.y,
    state.mapSize.width * tileScreenSize,
    state.mapSize.height * tileScreenSize,
  );

  // 전체 보기처럼 타일이 매우 작을 때는 겹치는 선으로 지도가 흐려지는 것을 막는다.
  if (
    showActionHighlights &&
    viewport.zoom >= GAME_CONFIG.actionHighlightMinZoom
  ) {
    drawActionHighlights(
      context,
      actionableTiles.claimable,
      viewport,
      range,
      tileScreenSize,
      CLAIMABLE_FILL,
      CLAIMABLE_STROKE,
    );
    drawActionHighlights(
      context,
      actionableTiles.attackable,
      viewport,
      range,
      tileScreenSize,
      ATTACKABLE_FILL,
      ATTACKABLE_STROKE,
    );
  }

  if (selectedCoordinate) {
    const selectedScreen = tileToScreen(selectedCoordinate, viewport);
    context.strokeStyle = SELECTED_COLOR;
    context.lineWidth = Math.max(3, viewport.zoom * 2);
    context.strokeRect(
      selectedScreen.x + 1,
      selectedScreen.y + 1,
      tileScreenSize - 2,
      tileScreenSize - 2,
    );
  }
}
