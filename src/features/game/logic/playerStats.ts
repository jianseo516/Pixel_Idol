import type { GameState, Idol } from "@/features/game/types/game";

export function getFactionTerritoryCount(state: GameState, idolId: Idol["id"]): number {
  return Object.values(state.tiles).reduce(
    (count, tile) => count + (tile.ownerId === idolId ? 1 : 0),
    0,
  );
}
