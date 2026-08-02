import { createTileId } from "@/features/game/logic/coordinates";
import type { GameState, Idol, Tile } from "@/features/game/types/game";
import type { GameSnapshotRows } from "@/features/game/types/database";

export function adaptSupabaseRowsToGameState(rows: GameSnapshotRows): GameState {
  const idols: Record<string, Idol> = {};
  for (const row of rows.idols) {
    idols[row.id] = {
      id: row.id,
      name: row.name,
      color: row.color,
      representativeImageSrc: row.representative_image_src,
    };
  }

  const tiles: Record<string, Tile> = {};
  for (const row of rows.tiles) {
    const coordinate = { x: row.x, y: row.y };
    const id = createTileId(row.season_id, coordinate);
    tiles[id] = {
      id,
      seasonId: row.season_id,
      coordinate,
      ownerId: row.owner_id,
      hp: row.hp,
    };
  }

  return {
    mapSize: { width: rows.season.map_width, height: rows.season.map_height },
    season: {
      id: rows.season.id,
      name: rows.season.name,
      startsAt: rows.season.starts_at,
      endsAt: rows.season.ends_at,
      status: rows.season.status,
    },
    idols,
    tiles,
    supportedIdolId: rows.player.supported_idol_id,
    tokens: rows.player.tokens,
  };
}
