import { GAME_CONFIG } from "@/config/game";
import { getStoredTile } from "@/features/game/logic/coordinates";
import { getOwnershipBoundarySegments } from "@/features/game/logic/ownershipBoundary";
import {
  getVisibleTileRange,
  tileToScreen,
  worldToScreen,
} from "@/features/game/rendering/viewport";
import { getRepresentativeDamageOpacity } from "@/features/game/rendering/representativeImage";
import type {
  ActionableTiles,
  Coordinate,
  GameState,
  TerritoryBoundarySegment,
  Tile,
} from "@/features/game/types/game";
import type {
  Viewport,
  VisibleTileRange,
} from "@/features/game/types/viewport";
import type { RepresentativeCanvasLayer } from "@/features/game/types/representative";

const EMPTY_TILE_COLOR = "#202633";
const MAP_BACKGROUND_COLOR = "#10141d";
const GRID_COLOR = "rgba(148, 163, 184, 0.22)";
const MAP_BORDER_COLOR = "rgba(148, 163, 184, 0.55)";
const SELECTED_COLOR = "#f8fafc";
const CLAIMABLE_FILL = "rgba(45, 212, 191, 0.14)";
const CLAIMABLE_STROKE = "rgba(45, 212, 191, 0.95)";
const ATTACKABLE_FILL = "rgba(251, 146, 60, 0.14)";
const ATTACKABLE_STROKE = "rgba(251, 146, 60, 0.98)";
const REPRESENTATIVE_BORDER = "rgba(248, 250, 252, 0.2)";
const OWNERSHIP_BOUNDARY_COLOR = "rgba(148, 163, 184, 0.48)";

export function getGridStepForZoom(zoom: number): number {
  return zoom >= GAME_CONFIG.detailedGridMinZoom
    ? 1
    : zoom >= GAME_CONFIG.coarseGridMinZoom
      ? GAME_CONFIG.coarseGridStep
      : 0;
}

interface RenderGameMapOptions {
  readonly context: CanvasRenderingContext2D;
  readonly state: GameState;
  readonly viewport: Viewport;
  readonly selectedCoordinate: Coordinate | null;
  readonly actionableTiles: ActionableTiles;
  readonly representativeBoundary: readonly TerritoryBoundarySegment[];
  readonly representativeLayers: readonly RepresentativeCanvasLayer[];
  readonly showActionHighlights: boolean;
  readonly pixelRatio: number;
}

function isCoordinateVisible(
  coordinate: Coordinate,
  range: VisibleTileRange,
): boolean {
  return (
    coordinate.x >= range.startX &&
    coordinate.x < range.endX &&
    coordinate.y >= range.startY &&
    coordinate.y < range.endY
  );
}

export function drawRepresentativeLayers(
  context: CanvasRenderingContext2D,
  layers: readonly RepresentativeCanvasLayer[],
  viewport: Viewport,
  range: VisibleTileRange,
  tileScreenSize: number,
): void {
  if (viewport.zoom < GAME_CONFIG.representativeImageMinZoom) {
    return;
  }

  for (const layer of layers) {
    context.save();
    context.beginPath();
    let hasVisibleCoordinate = false;
    for (const coordinate of layer.coordinates) {
      if (!isCoordinateVisible(coordinate, range)) {
        continue;
      }
      hasVisibleCoordinate = true;
      const screen = tileToScreen(coordinate, viewport);
      context.rect(screen.x, screen.y, tileScreenSize, tileScreenSize);
    }
    if (!hasVisibleCoordinate) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[representative-image-draw]", {
          idolId: layer.ownerId,
          skipped: "대표 영역과 현재 visible range가 교차하지 않음",
          regionTileCount: layer.coordinates.length,
          regionBounds: layer.bounds,
          visibleRange: range,
          clipPathCommandCount: 0,
        });
      }
      context.restore();
      continue;
    }

    context.clip();
    const placement = layer.placement;
    const destination = worldToScreen(
      { x: placement.destination.x, y: placement.destination.y },
      viewport,
    );
    context.globalAlpha = layer.opacity;
    if (process.env.NODE_ENV === "development") {
      const image = layer.image as CanvasImageSource & {
        readonly complete?: boolean;
        readonly naturalWidth?: number;
        readonly naturalHeight?: number;
      };
      console.debug("[representative-image-draw]", {
        idolId: layer.ownerId,
        imageComplete: image.complete ?? null,
        naturalWidth: image.naturalWidth ?? layer.imageWidth,
        naturalHeight: image.naturalHeight ?? layer.imageHeight,
        regionTileCount: layer.coordinates.length,
        regionBounds: layer.bounds,
        sourceRect: placement.source,
        destinationWorldRect: placement.destination,
        destinationScreenRect: {
          x: destination.x,
          y: destination.y,
          width: placement.destination.width * viewport.zoom,
          height: placement.destination.height * viewport.zoom,
        },
        visibleRange: range,
        intersectsVisibleRange: true,
        clipPathCommandCount: layer.coordinates.filter((coordinate) =>
          isCoordinateVisible(coordinate, range)).length,
        globalAlpha: context.globalAlpha,
        globalCompositeOperation: context.globalCompositeOperation,
      });
    }
    context.drawImage(
      layer.image,
      placement.source.x,
      placement.source.y,
      placement.source.width,
      placement.source.height,
      destination.x,
      destination.y,
      placement.destination.width * viewport.zoom,
      placement.destination.height * viewport.zoom,
    );
    context.restore();
  }
}

function drawRepresentativeTint(
  context: CanvasRenderingContext2D,
  state: GameState,
  layers: readonly RepresentativeCanvasLayer[],
  viewport: Viewport,
  range: VisibleTileRange,
  tileScreenSize: number,
): void {
  if (viewport.zoom < GAME_CONFIG.representativeImageMinZoom) return;
  for (const layer of layers) {
    const color = state.idols[layer.ownerId]?.color;
    if (!color) continue;
    context.save();
    context.beginPath();
    let visible = false;
    for (const coordinate of layer.coordinates) {
      if (!isCoordinateVisible(coordinate, range)) continue;
      visible = true;
      const screen = tileToScreen(coordinate, viewport);
      context.rect(screen.x, screen.y, tileScreenSize, tileScreenSize);
    }
    if (visible) {
      context.clip();
      context.globalAlpha = GAME_CONFIG.representativeImageTintOpacity;
      context.fillStyle = color;
      context.fillRect(0, 0, viewport.width, viewport.height);
    }
    context.restore();
  }
}

function drawRepresentativeDamage(
  context: CanvasRenderingContext2D,
  state: GameState,
  layers: readonly RepresentativeCanvasLayer[],
  viewport: Viewport,
  range: VisibleTileRange,
  tileScreenSize: number,
): void {
  if (viewport.zoom < GAME_CONFIG.representativeImageMinZoom) {
    return;
  }

  for (const layer of layers) {
    for (const coordinate of layer.coordinates) {
      if (!isCoordinateVisible(coordinate, range)) {
        continue;
      }
      const tile = getStoredTile(state, coordinate);
      if (!tile) {
        continue;
      }
      const opacity = getRepresentativeDamageOpacity(tile.hp);
      if (opacity <= 0) {
        continue;
      }
      const screen = tileToScreen(coordinate, viewport);
      context.fillStyle = `rgba(2, 6, 23, ${opacity})`;
      context.fillRect(screen.x, screen.y, tileScreenSize, tileScreenSize);
    }
  }
}

function drawRepresentativeBoundary(
  context: CanvasRenderingContext2D,
  segments: readonly TerritoryBoundarySegment[],
  viewport: Viewport,
  range: VisibleTileRange,
  tileScreenSize: number,
): void {
  context.beginPath();
  for (const segment of segments) {
    const { coordinate } = segment;
    if (
      coordinate.x < range.startX ||
      coordinate.x >= range.endX ||
      coordinate.y < range.startY ||
      coordinate.y >= range.endY
    ) {
      continue;
    }
    const screen = tileToScreen(coordinate, viewport);
    const left = screen.x;
    const top = screen.y;
    const right = left + tileScreenSize;
    const bottom = top + tileScreenSize;
    if (segment.side === "TOP") {
      context.moveTo(left, top);
      context.lineTo(right, top);
    } else if (segment.side === "RIGHT") {
      context.moveTo(right, top);
      context.lineTo(right, bottom);
    } else if (segment.side === "BOTTOM") {
      context.moveTo(left, bottom);
      context.lineTo(right, bottom);
    } else {
      context.moveTo(left, top);
      context.lineTo(left, bottom);
    }
  }
  context.lineCap = "square";
  context.strokeStyle = REPRESENTATIVE_BORDER;
  context.lineWidth = Math.max(1, viewport.zoom * 0.8);
  context.stroke();
}

function drawOwnershipBoundaries(
  context: CanvasRenderingContext2D,
  state: GameState,
  viewport: Viewport,
  range: VisibleTileRange,
  tileScreenSize: number,
): void {
  context.beginPath();
  for (const segment of getOwnershipBoundarySegments(state, range)) {
    const screen = tileToScreen(segment.coordinate, viewport);
    const left = screen.x;
    const top = screen.y;
    const right = left + tileScreenSize;
    const bottom = top + tileScreenSize;
    if (segment.side === "TOP") {
      context.moveTo(left, top);
      context.lineTo(right, top);
    } else if (segment.side === "RIGHT") {
      context.moveTo(right, top);
      context.lineTo(right, bottom);
    } else if (segment.side === "BOTTOM") {
      context.moveTo(left, bottom);
      context.lineTo(right, bottom);
    } else {
      context.moveTo(left, top);
      context.lineTo(left, bottom);
    }
  }
  context.lineCap = "square";
  context.strokeStyle = OWNERSHIP_BOUNDARY_COLOR;
  context.lineWidth = 1;
  context.stroke();
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
  representativeBoundary,
  representativeLayers,
  showActionHighlights,
  pixelRatio,
}: RenderGameMapOptions): void {
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, viewport.width, viewport.height);
  context.fillStyle = MAP_BACKGROUND_COLOR;
  context.fillRect(0, 0, viewport.width, viewport.height);

  const tileScreenSize = GAME_CONFIG.tileSize * viewport.zoom;
  const range = getVisibleTileRange(viewport, state.mapSize);
  const mapOrigin = tileToScreen({ x: 0, y: 0 }, viewport);

  context.fillStyle = EMPTY_TILE_COLOR;
  context.fillRect(
    mapOrigin.x,
    mapOrigin.y,
    state.mapSize.width * tileScreenSize,
    state.mapSize.height * tileScreenSize,
  );

  const gridStep = getGridStepForZoom(viewport.zoom);
  if (gridStep > 0) {
    context.beginPath();
    const firstX = Math.ceil(range.startX / gridStep) * gridStep;
    const firstY = Math.ceil(range.startY / gridStep) * gridStep;
    for (let x = firstX; x <= range.endX; x += gridStep) {
      const screen = tileToScreen({ x, y: 0 }, viewport);
      context.moveTo(screen.x, Math.max(0, mapOrigin.y));
      context.lineTo(screen.x, Math.min(viewport.height, mapOrigin.y + state.mapSize.height * tileScreenSize));
    }
    for (let y = firstY; y <= range.endY; y += gridStep) {
      const screen = tileToScreen({ x: 0, y }, viewport);
      context.moveTo(Math.max(0, mapOrigin.x), screen.y);
      context.lineTo(Math.min(viewport.width, mapOrigin.x + state.mapSize.width * tileScreenSize), screen.y);
    }
    context.lineWidth = 1;
    context.strokeStyle = GRID_COLOR;
    context.stroke();
  }

  for (const tile of Object.values(state.tiles)) {
    if (!isCoordinateVisible(tile.coordinate, range)) continue;
    const screen = tileToScreen(tile.coordinate, viewport);
    context.fillStyle = getTileColor(tile, state);
    context.fillRect(screen.x, screen.y, tileScreenSize, tileScreenSize);
  }

  drawRepresentativeLayers(
    context,
    representativeLayers,
    viewport,
    range,
    tileScreenSize,
  );
  drawRepresentativeTint(
    context,
    state,
    representativeLayers,
    viewport,
    range,
    tileScreenSize,
  );
  drawRepresentativeDamage(
    context,
    state,
    representativeLayers,
    viewport,
    range,
    tileScreenSize,
  );

  drawOwnershipBoundaries(context, state, viewport, range, tileScreenSize);

  context.strokeStyle = MAP_BORDER_COLOR;
  context.lineWidth = 2;
  context.strokeRect(
    mapOrigin.x,
    mapOrigin.y,
    state.mapSize.width * tileScreenSize,
    state.mapSize.height * tileScreenSize,
  );

  drawRepresentativeBoundary(
    context,
    representativeBoundary,
    viewport,
    range,
    tileScreenSize,
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
