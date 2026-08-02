import { DEFAULT_MAP_SIZE, GAME_CONFIG } from "@/config/game";
import { createTileId, isCoordinateInBounds } from "@/features/game/logic/coordinates";
import type {
  Coordinate,
  GameState,
  Idol,
  MapSize,
  Season,
  Tile,
} from "@/features/game/types/game";

export const MOCK_IDOLS = [
  { id: "lumi", name: "루미", color: "#F43F5E" },
  { id: "nova", name: "노바", color: "#3B82F6" },
  { id: "muse", name: "뮤즈", color: "#22C55E" },
] as const satisfies readonly Idol[];

export const MOCK_SEASON: Season = {
  id: "season-1",
  name: "프로토타입 시즌 1",
  startsAt: "2026-08-01T00:00:00+09:00",
  endsAt: "2026-08-31T23:59:59+09:00",
  status: "active",
};

export const MOCK_STARTING_TERRITORIES: Readonly<Record<Idol["id"], readonly Coordinate[]>> = {
  lumi: [
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
  ],
  nova: [
    { x: 44, y: 26 },
    { x: 45, y: 26 },
    { x: 44, y: 27 },
    { x: 45, y: 27 },
  ],
  muse: [
    { x: 83, y: 47 },
    { x: 84, y: 47 },
    { x: 83, y: 48 },
    { x: 84, y: 48 },
  ],
};

function createTile(
  seasonId: string,
  coordinate: Coordinate,
  ownerId: Idol["id"],
): Tile {
  return {
    id: createTileId(seasonId, coordinate),
    seasonId,
    coordinate,
    ownerId,
    hp: GAME_CONFIG.maxTileHp,
  };
}

export function createInitialGameState(
  mapSize: MapSize = DEFAULT_MAP_SIZE,
): GameState {
  const tiles: Record<string, Tile> = {};

  for (const idol of MOCK_IDOLS) {
    for (const coordinate of MOCK_STARTING_TERRITORIES[idol.id]) {
      if (!isCoordinateInBounds(coordinate, mapSize)) {
        continue;
      }
      const tile = createTile(MOCK_SEASON.id, coordinate, idol.id);
      tiles[tile.id] = tile;
    }
  }

  return {
    mapSize,
    season: MOCK_SEASON,
    idols: Object.fromEntries(MOCK_IDOLS.map((idol) => [idol.id, idol])),
    tiles,
    supportedIdolId: MOCK_IDOLS[0].id,
    tokens: GAME_CONFIG.initialUserTokens,
  };
}
