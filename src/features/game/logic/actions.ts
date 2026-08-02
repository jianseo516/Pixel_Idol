import { GAME_CONFIG } from "@/config/game";
import {
  getAttackActionError,
  getClaimActionError,
  getTileActionErrorMessage,
} from "@/features/game/logic/actionValidation";
import {
  getStoredTile,
  getTileSnapshot,
} from "@/features/game/logic/coordinates";
import type {
  Coordinate,
  GameState,
  Tile,
  TileActionErrorCode,
  TileActionResult,
} from "@/features/game/types/game";

function failure(
  state: GameState,
  code: TileActionErrorCode,
): TileActionResult {
  return {
    ok: false,
    state,
    error: { code, message: getTileActionErrorMessage(code) },
  };
}

function replaceTile(
  state: GameState,
  tile: Tile,
  tokenCost: number,
): TileActionResult {
  return {
    ok: true,
    tile,
    state: {
      ...state,
      tokens: state.tokens - tokenCost,
      tiles: {
        ...state.tiles,
        [tile.id]: tile,
      },
    },
  };
}

export function claimTile(
  state: GameState,
  coordinate: Coordinate,
): TileActionResult {
  const error = getClaimActionError(state, coordinate);
  if (error) {
    return failure(state, error);
  }

  const target = getTileSnapshot(state, coordinate);
  if (!target) {
    return failure(state, "TILE_NOT_FOUND");
  }

  const claimedTile: Tile = {
    ...target,
    ownerId: state.supportedIdolId,
    hp: GAME_CONFIG.maxTileHp,
  };

  return replaceTile(state, claimedTile, GAME_CONFIG.claimTokenCost);
}

export function attackTile(
  state: GameState,
  coordinate: Coordinate,
): TileActionResult {
  const error = getAttackActionError(state, coordinate);
  if (error) {
    return failure(state, error);
  }

  const target = getStoredTile(state, coordinate);
  if (!target || target.ownerId === null) {
    return failure(state, "TILE_NOT_FOUND");
  }

  const remainingHp = target.hp - GAME_CONFIG.attackDamage;
  const attackedTile: Tile = {
    ...target,
    ownerId: remainingHp <= 0 ? state.supportedIdolId : target.ownerId,
    hp: remainingHp <= 0 ? GAME_CONFIG.maxTileHp : remainingHp,
  };

  return replaceTile(state, attackedTile, GAME_CONFIG.attackTokenCost);
}
