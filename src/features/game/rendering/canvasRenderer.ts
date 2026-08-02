import { GAME_CONFIG } from "@/config/game";
import { getStoredTile } from "@/features/game/logic/coordinates";
import {
  getVisibleTileRange,
  tileToScreen,
} from "@/features/game/rendering/viewport";
import type { Coordinate, GameState, Tile } from "@/features/game/types/game";
import type { Viewport } from "@/features/game/types/viewport";

const EMPTY_TILE_COLOR = "#202633";
const MAP_BACKGROUND_COLOR = "#10141d";
const GRID_COLOR = "rgba(148, 163, 184, 0.22)";
const MAP_BORDER_COLOR = "rgba(148, 163, 184, 0.55)";
const SELECTED_COLOR = "#f8fafc";

interface RenderGameMapOptions {
  readonly context: CanvasRenderingContext2D;
  readonly state: GameState;
  readonly viewport: Viewport;
  readonly selectedCoordinate: Coordinate | null;
  readonly pixelRatio: number;
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
