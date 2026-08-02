import { getTileActionPreview } from "@/features/game/logic/actionPreview";
import {
  createCoordinateKey,
  getOrthogonalCoordinates,
  getStoredTile,
} from "@/features/game/logic/coordinates";
import type {
  ActionableTiles,
  Coordinate,
  GameState,
} from "@/features/game/types/game";

export function collectActionableTileCandidates(
  state: GameState,
): readonly Coordinate[] {
  const candidates = new Map<string, Coordinate>();

  for (const tile of Object.values(state.tiles)) {
    if (tile.ownerId !== state.supportedIdolId) {
      continue;
    }

    for (const coordinate of getOrthogonalCoordinates(
      tile.coordinate,
      state.mapSize,
    )) {
      if (getStoredTile(state, coordinate)?.ownerId === state.supportedIdolId) {
        continue;
      }
      candidates.set(createCoordinateKey(coordinate), coordinate);
    }
  }

  return [...candidates.values()];
}

export function getActionableTiles(state: GameState): ActionableTiles {
  const claimable: Coordinate[] = [];
  const attackable: Coordinate[] = [];

  for (const coordinate of collectActionableTileCandidates(state)) {
    const preview = getTileActionPreview(state, coordinate);
    if (preview.actionType === "CLAIM" && preview.allowed) {
      claimable.push(coordinate);
    } else if (preview.actionType === "ATTACK" && preview.allowed) {
      attackable.push(coordinate);
    }
  }

  return { claimable, attackable };
}
