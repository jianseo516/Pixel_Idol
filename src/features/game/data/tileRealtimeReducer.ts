import { createTileId } from "@/features/game/logic/coordinates";
import type { Tile } from "@/features/game/types/game";
import type { TileRow } from "@/features/game/types/database";

export interface TileRealtimeState {
  readonly tiles: Readonly<Record<string, Tile>>;
  readonly updatedAtByTileId: Readonly<Record<string, string>>;
}

export interface TileRealtimeEvent {
  readonly eventType: "INSERT" | "UPDATE";
  readonly row: TileRow;
}

function adaptTileRow(row: TileRow): Tile {
  const coordinate = { x: row.x, y: row.y };
  return {
    id: createTileId(row.season_id, coordinate),
    seasonId: row.season_id,
    coordinate,
    ownerId: row.owner_id,
    hp: row.hp,
  };
}

export function createTileRealtimeState(
  rows: readonly TileRow[],
): TileRealtimeState {
  const tiles: Record<string, Tile> = {};
  const updatedAtByTileId: Record<string, string> = {};
  for (const row of rows) {
    const tile = adaptTileRow(row);
    tiles[tile.id] = tile;
    updatedAtByTileId[tile.id] = row.updated_at;
  }
  return { tiles, updatedAtByTileId };
}

function isNewerTimestamp(incoming: string, current: string): boolean {
  const incomingTime = Date.parse(incoming);
  const currentTime = Date.parse(current);
  if (Number.isFinite(incomingTime) && Number.isFinite(currentTime)) {
    return incomingTime > currentTime;
  }
  return incoming > current;
}

export function reduceTileRealtimeEvent(
  state: TileRealtimeState,
  currentSeasonId: string,
  event: TileRealtimeEvent,
): TileRealtimeState {
  if (event.row.season_id !== currentSeasonId) {
    return state;
  }
  const tile = adaptTileRow(event.row);
  const currentUpdatedAt = state.updatedAtByTileId[tile.id];
  if (currentUpdatedAt && !isNewerTimestamp(event.row.updated_at, currentUpdatedAt)) {
    return state;
  }
  return {
    tiles: { ...state.tiles, [tile.id]: tile },
    updatedAtByTileId: {
      ...state.updatedAtByTileId,
      [tile.id]: event.row.updated_at,
    },
  };
}

export function mergeTileSnapshot(
  state: TileRealtimeState,
  currentSeasonId: string,
  rows: readonly TileRow[],
): TileRealtimeState {
  return rows.reduce(
    (current, row) => reduceTileRealtimeEvent(
      current,
      currentSeasonId,
      { eventType: "UPDATE", row },
    ),
    state,
  );
}
