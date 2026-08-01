import { GAME_CONFIG } from "@/config/game";
import { createTileId } from "@/features/game/logic/coordinates";
import type {
  Coordinate,
  GameState,
  Idol,
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

const STARTING_TERRITORIES: Readonly<Record<Idol["id"], readonly Coordinate[]>> = {
  lumi: [
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
  ],
  nova: [
    { x: 24, y: 24 },
    { x: 25, y: 24 },
    { x: 24, y: 25 },
    { x: 25, y: 25 },
  ],
  muse: [
    { x: 43, y: 43 },
    { x: 44, y: 43 },
    { x: 43, y: 44 },
    { x: 44, y: 44 },
  ],
};

function createTile(
  seasonId: string,
  coordinate: Coordinate,
  ownerId: Idol["id"] | null,
): Tile {
  return {
    id: createTileId(seasonId, coordinate),
    seasonId,
    coordinate,
    ownerId,
    hp: ownerId === null ? 0 : GAME_CONFIG.maxTileHp,
  };
}

export function createInitialGameState(): GameState {
  const tiles: Record<string, Tile> = {};

  for (let y = 0; y < GAME_CONFIG.mapHeight; y += 1) {
    for (let x = 0; x < GAME_CONFIG.mapWidth; x += 1) {
      const coordinate = { x, y };
      const owner = MOCK_IDOLS.find((idol) =>
        STARTING_TERRITORIES[idol.id].some(
          (start) => start.x === coordinate.x && start.y === coordinate.y,
        ),
      );
      const tile = createTile(MOCK_SEASON.id, coordinate, owner?.id ?? null);
      tiles[tile.id] = tile;
    }
  }

  return {
    season: MOCK_SEASON,
    idols: Object.fromEntries(MOCK_IDOLS.map((idol) => [idol.id, idol])),
    tiles,
    supportedIdolId: MOCK_IDOLS[0].id,
    tokens: GAME_CONFIG.initialUserTokens,
  };
}

