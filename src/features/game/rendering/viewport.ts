import { DEFAULT_MAP_SIZE, GAME_CONFIG } from "@/config/game";
import type { Coordinate, GameState, Idol, MapSize } from "@/features/game/types/game";
import type {
  Point,
  Viewport,
  VisibleTileRange,
} from "@/features/game/types/viewport";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function constrainAxis(
  offset: number,
  viewportSize: number,
  mapScreenSize: number,
): number {
  const paddedViewportSize = viewportSize - GAME_CONFIG.mapEdgePadding * 2;
  if (mapScreenSize <= paddedViewportSize) {
    return (viewportSize - mapScreenSize) / 2;
  }

  const minimum = viewportSize - mapScreenSize - GAME_CONFIG.mapEdgePadding;
  const maximum = GAME_CONFIG.mapEdgePadding;
  return clamp(offset, minimum, maximum);
}

export function getMapWorldSize(mapSize: MapSize = DEFAULT_MAP_SIZE): Point {
  return {
    x: mapSize.width * GAME_CONFIG.tileSize,
    y: mapSize.height * GAME_CONFIG.tileSize,
  };
}

export function clampZoom(zoom: number): number {
  return clamp(zoom, GAME_CONFIG.minZoom, GAME_CONFIG.maxZoom);
}

export function screenToWorld(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.offsetX) / viewport.zoom,
    y: (point.y - viewport.offsetY) / viewport.zoom,
  };
}

export function worldToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.zoom + viewport.offsetX,
    y: point.y * viewport.zoom + viewport.offsetY,
  };
}

export function worldToTile(
  point: Point,
  dimensions: MapSize = DEFAULT_MAP_SIZE,
): Coordinate | null {
  const mapWorldSize = getMapWorldSize(dimensions);
  if (point.x < 0 || point.y < 0 || point.x >= mapWorldSize.x || point.y >= mapWorldSize.y) {
    return null;
  }

  return {
    x: Math.floor(point.x / GAME_CONFIG.tileSize),
    y: Math.floor(point.y / GAME_CONFIG.tileSize),
  };
}

export function screenToTile(
  point: Point,
  viewport: Viewport,
  mapSize: MapSize = DEFAULT_MAP_SIZE,
): Coordinate | null {
  return worldToTile(screenToWorld(point, viewport), mapSize);
}

export function tileToWorld(coordinate: Coordinate): Point {
  return {
    x: coordinate.x * GAME_CONFIG.tileSize,
    y: coordinate.y * GAME_CONFIG.tileSize,
  };
}

export function tileToScreen(
  coordinate: Coordinate,
  viewport: Viewport,
): Point {
  return worldToScreen(tileToWorld(coordinate), viewport);
}

export type TileNavigationKey =
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight";

export function moveSelectedCoordinate(
  coordinate: Coordinate | null,
  key: TileNavigationKey,
  mapSize: MapSize = DEFAULT_MAP_SIZE,
): Coordinate | null {
  if (!coordinate) {
    return null;
  }
  const delta = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  }[key];
  const next = { x: coordinate.x + delta.x, y: coordinate.y + delta.y };
  return next.x >= 0 && next.y >= 0 && next.x < mapSize.width && next.y < mapSize.height
    ? next
    : coordinate;
}

export function ensureTileVisible(
  viewport: Viewport,
  coordinate: Coordinate,
  mapSize: MapSize = DEFAULT_MAP_SIZE,
  marginInTiles = 1,
): Viewport {
  const tileSize = GAME_CONFIG.tileSize * viewport.zoom;
  const requestedMargin = Math.max(0, marginInTiles) * tileSize;
  const horizontalMargin = Math.min(
    requestedMargin,
    Math.max((viewport.width - tileSize) / 2, 0),
  );
  const verticalMargin = Math.min(
    requestedMargin,
    Math.max((viewport.height - tileSize) / 2, 0),
  );
  const screen = tileToScreen(coordinate, viewport);
  let offsetX = viewport.offsetX;
  let offsetY = viewport.offsetY;

  if (screen.x < horizontalMargin) {
    offsetX += horizontalMargin - screen.x;
  } else if (screen.x + tileSize > viewport.width - horizontalMargin) {
    offsetX -= screen.x + tileSize - (viewport.width - horizontalMargin);
  }
  if (screen.y < verticalMargin) {
    offsetY += verticalMargin - screen.y;
  } else if (screen.y + tileSize > viewport.height - verticalMargin) {
    offsetY -= screen.y + tileSize - (viewport.height - verticalMargin);
  }

  if (offsetX === viewport.offsetX && offsetY === viewport.offsetY) {
    return viewport;
  }
  return constrainViewport({ ...viewport, offsetX, offsetY }, mapSize);
}

export function getVisibleTileRange(
  viewport: Viewport,
  mapSize: MapSize = DEFAULT_MAP_SIZE,
): VisibleTileRange {
  const topLeft = screenToWorld({ x: 0, y: 0 }, viewport);
  const bottomRight = screenToWorld(
    { x: viewport.width, y: viewport.height },
    viewport,
  );

  return {
    startX: clamp(Math.floor(topLeft.x / GAME_CONFIG.tileSize), 0, mapSize.width),
    endX: clamp(Math.ceil(bottomRight.x / GAME_CONFIG.tileSize), 0, mapSize.width),
    startY: clamp(Math.floor(topLeft.y / GAME_CONFIG.tileSize), 0, mapSize.height),
    endY: clamp(Math.ceil(bottomRight.y / GAME_CONFIG.tileSize), 0, mapSize.height),
  };
}

export function constrainViewport(
  viewport: Viewport,
  dimensions: MapSize = DEFAULT_MAP_SIZE,
): Viewport {
  const mapSize = getMapWorldSize(dimensions);
  return {
    ...viewport,
    offsetX: constrainAxis(
      viewport.offsetX,
      viewport.width,
      mapSize.x * viewport.zoom,
    ),
    offsetY: constrainAxis(
      viewport.offsetY,
      viewport.height,
      mapSize.y * viewport.zoom,
    ),
  };
}

export function panViewport(
  viewport: Viewport,
  delta: Point,
  mapSize: MapSize = DEFAULT_MAP_SIZE,
): Viewport {
  return constrainViewport({
    ...viewport,
    offsetX: viewport.offsetX + delta.x,
    offsetY: viewport.offsetY + delta.y,
  }, mapSize);
}

export function centerViewportAtWorldPoint(
  viewport: Viewport,
  worldPoint: Point,
  mapSize: MapSize = DEFAULT_MAP_SIZE,
): Viewport {
  return constrainViewport({
    ...viewport,
    offsetX: viewport.width / 2 - worldPoint.x * viewport.zoom,
    offsetY: viewport.height / 2 - worldPoint.y * viewport.zoom,
  }, mapSize);
}

export function zoomViewportAtPoint(
  viewport: Viewport,
  screenPoint: Point,
  requestedZoom: number,
  mapSize: MapSize = DEFAULT_MAP_SIZE,
): Viewport {
  const zoom = clampZoom(requestedZoom);
  const worldPoint = screenToWorld(screenPoint, viewport);

  return constrainViewport({
    ...viewport,
    zoom,
    offsetX: screenPoint.x - worldPoint.x * zoom,
    offsetY: screenPoint.y - worldPoint.y * zoom,
  }, mapSize);
}

export function zoomViewportAtCenter(
  viewport: Viewport,
  zoomFactor: number,
  mapSize: MapSize = DEFAULT_MAP_SIZE,
): Viewport {
  return zoomViewportAtPoint(
    viewport,
    { x: viewport.width / 2, y: viewport.height / 2 },
    viewport.zoom * zoomFactor,
    mapSize,
  );
}

export function getWheelZoom(currentZoom: number, wheelDelta: number): number {
  const limitedDelta = clamp(
    wheelDelta,
    -GAME_CONFIG.maxWheelDelta,
    GAME_CONFIG.maxWheelDelta,
  );
  return clampZoom(
    currentZoom * Math.exp(-limitedDelta * GAME_CONFIG.wheelZoomIntensity),
  );
}

export function createFittedViewport(
  width: number,
  height: number,
  dimensions: MapSize = DEFAULT_MAP_SIZE,
): Viewport {
  const mapSize = getMapWorldSize(dimensions);
  const availableWidth = Math.max(width - GAME_CONFIG.viewportPadding * 2, 1);
  const availableHeight = Math.max(height - GAME_CONFIG.viewportPadding * 2, 1);
  const zoom = Math.max(
    Number.EPSILON,
    Math.min(
      GAME_CONFIG.maxZoom,
      availableWidth / mapSize.x,
      availableHeight / mapSize.y,
    ),
  );

  return constrainViewport({
    width,
    height,
    zoom,
    offsetX: (width - mapSize.x * zoom) / 2,
    offsetY: (height - mapSize.y * zoom) / 2,
  }, dimensions);
}

export function createInitialViewport(
  width: number,
  height: number,
  focusWorldPoint: Point,
  mapSize: MapSize = DEFAULT_MAP_SIZE,
): Viewport {
  const zoom = clampZoom(
    GAME_CONFIG.defaultTileDisplaySize / GAME_CONFIG.tileSize,
  );
  return centerViewportAtWorldPoint(
    { width, height, zoom, offsetX: 0, offsetY: 0 },
    focusWorldPoint,
    mapSize,
  );
}

export function createInitialBattlefieldViewport(
  width: number,
  height: number,
  mapSize: MapSize = DEFAULT_MAP_SIZE,
): Viewport {
  const battlefieldWorldWidth = GAME_CONFIG.legacyMapWidth * GAME_CONFIG.tileSize;
  const battlefieldWorldHeight = GAME_CONFIG.legacyMapHeight * GAME_CONFIG.tileSize;
  const zoom = clampZoom(Math.min(
    Math.max(width - GAME_CONFIG.viewportPadding * 2, 1) / battlefieldWorldWidth,
    Math.max(height - GAME_CONFIG.viewportPadding * 2, 1) / battlefieldWorldHeight,
  ));
  const world = getMapWorldSize(mapSize);
  return centerViewportAtWorldPoint(
    { width, height, zoom, offsetX: 0, offsetY: 0 },
    { x: world.x / 2, y: world.y / 2 },
    mapSize,
  );
}

export function resizeViewport(
  viewport: Viewport,
  width: number,
  height: number,
  mapSize: MapSize = DEFAULT_MAP_SIZE,
): Viewport {
  const previousCenter = screenToWorld(
    { x: viewport.width / 2, y: viewport.height / 2 },
    viewport,
  );

  return centerViewportAtWorldPoint(
    { ...viewport, width, height },
    previousCenter,
    mapSize,
  );
}

export function getOwnedTerritoryWorldCenter(
  state: GameState,
  ownerId: Idol["id"],
): Point {
  let minimumX: number = state.mapSize.width;
  let minimumY: number = state.mapSize.height;
  let maximumX = -1;
  let maximumY = -1;

  for (const tile of Object.values(state.tiles)) {
    if (tile.ownerId !== ownerId) {
      continue;
    }
    minimumX = Math.min(minimumX, tile.coordinate.x);
    minimumY = Math.min(minimumY, tile.coordinate.y);
    maximumX = Math.max(maximumX, tile.coordinate.x);
    maximumY = Math.max(maximumY, tile.coordinate.y);
  }

  if (maximumX < 0 || maximumY < 0) {
    const mapSize = getMapWorldSize(state.mapSize);
    return { x: mapSize.x / 2, y: mapSize.y / 2 };
  }

  return {
    x: ((minimumX + maximumX + 1) * GAME_CONFIG.tileSize) / 2,
    y: ((minimumY + maximumY + 1) * GAME_CONFIG.tileSize) / 2,
  };
}
