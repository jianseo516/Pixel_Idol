import {
  createCoordinateKey,
  getOrthogonalCoordinates,
  isCoordinateInBounds,
} from "@/features/game/logic/coordinates";
import type {
  Coordinate,
  GameState,
  Idol,
  IdolTerritorySummary,
  TerritoryBounds,
  TerritoryRegion,
} from "@/features/game/types/game";

function compareCoordinates(first: Coordinate, second: Coordinate): number {
  return first.y - second.y || first.x - second.x;
}

function compareRegions(first: TerritoryRegion, second: TerritoryRegion): number {
  return (
    first.bounds.minY - second.bounds.minY ||
    first.bounds.minX - second.bounds.minX ||
    first.id.localeCompare(second.id)
  );
}

function compareLargestRegionPriority(
  first: TerritoryRegion,
  second: TerritoryRegion,
): number {
  return (
    second.size - first.size ||
    first.bounds.minY - second.bounds.minY ||
    first.bounds.minX - second.bounds.minX ||
    first.id.localeCompare(second.id)
  );
}

export function getTerritoryBounds(
  coordinates: readonly Coordinate[],
): TerritoryBounds | null {
  if (coordinates.length === 0) {
    return null;
  }

  let minX = coordinates[0].x;
  let minY = coordinates[0].y;
  let maxX = coordinates[0].x;
  let maxY = coordinates[0].y;
  for (const coordinate of coordinates.slice(1)) {
    minX = Math.min(minX, coordinate.x);
    minY = Math.min(minY, coordinate.y);
    maxX = Math.max(maxX, coordinate.x);
    maxY = Math.max(maxY, coordinate.y);
  }
  return { minX, minY, maxX, maxY };
}

export function getTerritoryRegions(
  state: GameState,
  ownerId: Idol["id"],
): readonly TerritoryRegion[] {
  const ownedCoordinates = Object.values(state.tiles)
    .filter(
      (tile) =>
        tile.ownerId === ownerId &&
        isCoordinateInBounds(tile.coordinate, state.mapSize),
    )
    .map((tile) => tile.coordinate)
    .sort(compareCoordinates);
  const coordinateByKey = new Map(
    ownedCoordinates.map((coordinate) => [
      createCoordinateKey(coordinate),
      coordinate,
    ]),
  );
  const visited = new Set<string>();
  const regions: TerritoryRegion[] = [];

  for (const seed of ownedCoordinates) {
    const seedKey = createCoordinateKey(seed);
    if (visited.has(seedKey)) {
      continue;
    }

    const queue: Coordinate[] = [seed];
    const coordinates: Coordinate[] = [];
    visited.add(seedKey);

    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      coordinates.push(current);
      for (const neighbor of getOrthogonalCoordinates(
        current,
        state.mapSize,
      )) {
        const neighborKey = createCoordinateKey(neighbor);
        const storedCoordinate = coordinateByKey.get(neighborKey);
        if (!storedCoordinate || visited.has(neighborKey)) {
          continue;
        }
        visited.add(neighborKey);
        queue.push(storedCoordinate);
      }
    }

    coordinates.sort(compareCoordinates);
    const bounds = getTerritoryBounds(coordinates);
    if (!bounds) {
      continue;
    }
    regions.push({
      id: `${ownerId}:${createCoordinateKey(coordinates[0])}`,
      ownerId,
      coordinates,
      size: coordinates.length,
      bounds,
    });
  }

  return regions.sort(compareRegions);
}

export function getLargestTerritoryRegion(
  regions: readonly TerritoryRegion[],
): TerritoryRegion | null {
  return [...regions].sort(compareLargestRegionPriority)[0] ?? null;
}

export function getIdolTerritorySummary(
  state: GameState,
  ownerId: Idol["id"],
): IdolTerritorySummary {
  const regions = getTerritoryRegions(state, ownerId);
  return {
    ownerId,
    regions,
    largestRegion: getLargestTerritoryRegion(regions),
    totalTileCount: regions.reduce((total, region) => total + region.size, 0),
  };
}

export function getAllIdolTerritorySummaries(
  state: GameState,
): Readonly<Record<Idol["id"], IdolTerritorySummary>> {
  return Object.fromEntries(
    Object.keys(state.idols)
      .sort()
      .map((ownerId) => [ownerId, getIdolTerritorySummary(state, ownerId)]),
  );
}

export function findTerritoryRegionAt(
  regions: readonly TerritoryRegion[],
  coordinate: Coordinate,
): TerritoryRegion | null {
  const targetKey = createCoordinateKey(coordinate);
  return (
    regions.find((region) =>
      region.coordinates.some(
        (candidate) => createCoordinateKey(candidate) === targetKey,
      ),
    ) ?? null
  );
}
