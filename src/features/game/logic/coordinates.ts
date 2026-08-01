import { GAME_CONFIG } from "@/config/game";
import type { Coordinate, GameState, Tile } from "@/features/game/types/game";

const CARDINAL_OFFSETS: readonly Coordinate[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export function isCoordinateInBounds(coordinate: Coordinate): boolean {
  return (
    Number.isInteger(coordinate.x) &&
    Number.isInteger(coordinate.y) &&
    coordinate.x >= 0 &&
    coordinate.x < GAME_CONFIG.mapWidth &&
    coordinate.y >= 0 &&
    coordinate.y < GAME_CONFIG.mapHeight
  );
}

export function isSameCoordinate(
  first: Coordinate,
  second: Coordinate,
): boolean {
  return first.x === second.x && first.y === second.y;
}

export function areOrthogonallyAdjacent(
  first: Coordinate,
  second: Coordinate,
): boolean {
  if (!isCoordinateInBounds(first) || !isCoordinateInBounds(second)) {
    return false;
  }

  const horizontalDistance = Math.abs(first.x - second.x);
  const verticalDistance = Math.abs(first.y - second.y);

  return horizontalDistance + verticalDistance === 1;
}

export function createTileId(
  seasonId: string,
  coordinate: Coordinate,
): string {
  return `${seasonId}:${coordinate.x},${coordinate.y}`;
}

export function getTile(
  state: GameState,
  coordinate: Coordinate,
): Tile | undefined {
  return state.tiles[createTileId(state.season.id, coordinate)];
}

export function getOrthogonalCoordinates(
  coordinate: Coordinate,
): readonly Coordinate[] {
  return CARDINAL_OFFSETS.map((offset) => ({
    x: coordinate.x + offset.x,
    y: coordinate.y + offset.y,
  })).filter(isCoordinateInBounds);
}

export function hasAdjacentOwnedTile(
  state: GameState,
  coordinate: Coordinate,
  ownerId: string,
): boolean {
  return getOrthogonalCoordinates(coordinate).some(
    (neighbor) => getTile(state, neighbor)?.ownerId === ownerId,
  );
}

