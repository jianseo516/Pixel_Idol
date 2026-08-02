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
    { x: 140, y: 86 },
    { x: 141, y: 86 },
    { x: 140, y: 87 },
    { x: 141, y: 87 },
  ],
  blackpink: [
    { x: 168, y: 86 }, { x: 169, y: 86 },
    { x: 168, y: 87 }, { x: 169, y: 87 },
  ],
  seventeen: [
    { x: 205, y: 86 }, { x: 206, y: 86 },
    { x: 205, y: 87 }, { x: 206, y: 87 },
  ],
  "stray-kids": [
    { x: 145, y: 106 }, { x: 146, y: 106 },
    { x: 145, y: 107 }, { x: 146, y: 107 },
  ],
  aespa: [
    { x: 178, y: 106 }, { x: 179, y: 106 },
    { x: 178, y: 107 }, { x: 179, y: 107 },
  ],
  ive: [
    { x: 210, y: 106 }, { x: 211, y: 106 },
    { x: 210, y: 107 }, { x: 211, y: 107 },
  ],
  enhypen: [
    { x: 160, y: 126 }, { x: 161, y: 126 },
    { x: 160, y: 127 }, { x: 161, y: 127 },
  ],
  "le-sserafim": [
    { x: 200, y: 126 }, { x: 201, y: 126 },
    { x: 200, y: 127 }, { x: 201, y: 127 },
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
