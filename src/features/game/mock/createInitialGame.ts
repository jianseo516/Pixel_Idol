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
  {
    id: "bts",
    name: "BTS",
    color: "#7C3AED",
    representativeImageSrc: "/mock-idols/bts.svg",
  },
  {
    id: "blackpink",
    name: "BLACKPINK",
    color: "#EC4899",
    representativeImageSrc: "/mock-idols/blackpink.svg",
  },
  {
    id: "seventeen",
    name: "SEVENTEEN",
    color: "#06B6D4",
    representativeImageSrc: "/mock-idols/seventeen.svg",
  },
  {
    id: "stray-kids",
    name: "Stray Kids",
    color: "#EF4444",
    representativeImageSrc: "/mock-idols/stray-kids.svg",
  },
  {
    id: "aespa",
    name: "aespa",
    color: "#2563EB",
    representativeImageSrc: "/mock-idols/aespa.svg",
  },
  {
    id: "ive",
    name: "IVE",
    color: "#F59E0B",
    representativeImageSrc: "/mock-idols/ive.svg",
  },
  {
    id: "enhypen",
    name: "ENHYPEN",
    color: "#10B981",
    representativeImageSrc: "/mock-idols/enhypen.svg",
  },
  {
    id: "le-sserafim",
    name: "LE SSERAFIM",
    color: "#84CC16",
    representativeImageSrc: "/mock-idols/le-sserafim.svg",
  },
] as const satisfies readonly Idol[];

export const MOCK_SEASON: Season = {
  id: "season-1",
  name: "프로토타입 시즌 1",
  startsAt: "2026-08-01T00:00:00+09:00",
  endsAt: "2026-08-31T23:59:59+09:00",
  status: "active",
};

export const MOCK_STARTING_TERRITORIES: Readonly<Record<Idol["id"], readonly Coordinate[]>> = {
  bts: [
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
  ],
  blackpink: [
    { x: 33, y: 5 }, { x: 34, y: 5 },
    { x: 33, y: 6 }, { x: 34, y: 6 },
  ],
  seventeen: [
    { x: 70, y: 5 }, { x: 71, y: 5 },
    { x: 70, y: 6 }, { x: 71, y: 6 },
  ],
  "stray-kids": [
    { x: 10, y: 25 }, { x: 11, y: 25 },
    { x: 10, y: 26 }, { x: 11, y: 26 },
  ],
  aespa: [
    { x: 43, y: 25 }, { x: 44, y: 25 },
    { x: 43, y: 26 }, { x: 44, y: 26 },
  ],
  ive: [
    { x: 75, y: 25 }, { x: 76, y: 25 },
    { x: 75, y: 26 }, { x: 76, y: 26 },
  ],
  enhypen: [
    { x: 25, y: 45 }, { x: 26, y: 45 },
    { x: 25, y: 46 }, { x: 26, y: 46 },
  ],
  "le-sserafim": [
    { x: 65, y: 45 }, { x: 66, y: 45 },
    { x: 65, y: 46 }, { x: 66, y: 46 },
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
