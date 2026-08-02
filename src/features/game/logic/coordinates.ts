import { DEFAULT_MAP_SIZE } from "@/config/game";
import type { Coordinate, GameState, MapSize, Tile } from "@/features/game/types/game";

const CARDINAL_OFFSETS: readonly Coordinate[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export function isCoordinateInBounds(
  coordinate: Coordinate,
  mapSize: MapSize = DEFAULT_MAP_SIZE,
): boolean {
  return (
    Number.isInteger(coordinate.x) &&
    Number.isInteger(coordinate.y) &&
    coordinate.x >= 0 &&
    coordinate.x < mapSize.width &&
    coordinate.y >= 0 &&
    coordinate.y < mapSize.height
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
  return `${seasonId}:${createCoordinateKey(coordinate)}`;
}

export function createCoordinateKey(coordinate: Coordinate): string {
  return `${coordinate.x},${coordinate.y}`;
}

export function getTile(
  state: GameState,
  coordinate: Coordinate,
): Tile | undefined {
  return getTileSnapshot(state, coordinate);
}

export function getStoredTile(
  state: GameState,
  coordinate: Coordinate,
): Tile | undefined {
  return state.tiles[createTileId(state.season.id, coordinate)];
}

export function hasStoredTile(state: GameState, coordinate: Coordinate): boolean {
  return getStoredTile(state, coordinate) !== undefined;
}

export function getTileSnapshot(
  state: GameState,
  coordinate: Coordinate,
): Tile | undefined {
  if (!isCoordinateInBounds(coordinate, state.mapSize)) {
    return undefined;
  }

  return getStoredTile(state, coordinate) ?? {
    id: createTileId(state.season.id, coordinate),
    seasonId: state.season.id,
    coordinate: { ...coordinate },
    ownerId: null,
    hp: 0,
  };
}

export function getOrthogonalCoordinates(
  coordinate: Coordinate,
  mapSize: MapSize = DEFAULT_MAP_SIZE,
): readonly Coordinate[] {
  return CARDINAL_OFFSETS.map((offset) => ({
    x: coordinate.x + offset.x,
    y: coordinate.y + offset.y,
  })).filter((candidate) => isCoordinateInBounds(candidate, mapSize));
}

export function hasAdjacentOwnedTile(
  state: GameState,
  coordinate: Coordinate,
  ownerId: string,
): boolean {
  return getOrthogonalCoordinates(coordinate, state.mapSize).some(
    (neighbor) => getStoredTile(state, neighbor)?.ownerId === ownerId,
  );
}
