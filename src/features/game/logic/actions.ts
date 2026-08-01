import { GAME_CONFIG } from "@/config/game";
import {
  getTile,
  hasAdjacentOwnedTile,
  isCoordinateInBounds,
} from "@/features/game/logic/coordinates";
import type {
  Coordinate,
  GameState,
  Tile,
  TileActionErrorCode,
  TileActionResult,
} from "@/features/game/types/game";

const ERROR_MESSAGES: Readonly<Record<TileActionErrorCode, string>> = {
  OUT_OF_BOUNDS: "지도 범위를 벗어난 좌표입니다.",
  TILE_NOT_FOUND: "대상 타일을 찾을 수 없습니다.",
  SEASON_ENDED: "종료된 시즌의 타일은 변경할 수 없습니다.",
  INSUFFICIENT_TOKENS: "토큰이 부족합니다.",
  TILE_NOT_EMPTY: "빈 타일만 점령할 수 있습니다.",
  NOT_ADJACENT: "내 영토와 상하좌우로 인접한 타일만 선택할 수 있습니다.",
  NOT_ENEMY_TILE: "상대 아이돌의 타일만 공격할 수 있습니다.",
  OWN_TILE: "내 아이돌의 타일은 공격할 수 없습니다.",
};

function failure(
  state: GameState,
  code: TileActionErrorCode,
): TileActionResult {
  return {
    ok: false,
    state,
    error: { code, message: ERROR_MESSAGES[code] },
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

function validateTarget(
  state: GameState,
  coordinate: Coordinate,
  tokenCost: number,
): Tile | TileActionResult {
  if (!isCoordinateInBounds(coordinate)) {
    return failure(state, "OUT_OF_BOUNDS");
  }

  if (state.season.status === "ended") {
    return failure(state, "SEASON_ENDED");
  }

  if (state.tokens < tokenCost) {
    return failure(state, "INSUFFICIENT_TOKENS");
  }

  const tile = getTile(state, coordinate);
  return tile ?? failure(state, "TILE_NOT_FOUND");
}

function isFailure(value: Tile | TileActionResult): value is TileActionResult {
  return "ok" in value;
}

export function claimTile(
  state: GameState,
  coordinate: Coordinate,
): TileActionResult {
  const target = validateTarget(state, coordinate, GAME_CONFIG.claimTokenCost);
  if (isFailure(target)) {
    return target;
  }

  if (target.ownerId !== null) {
    return failure(state, "TILE_NOT_EMPTY");
  }

  if (!hasAdjacentOwnedTile(state, coordinate, state.supportedIdolId)) {
    return failure(state, "NOT_ADJACENT");
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
  const target = validateTarget(state, coordinate, GAME_CONFIG.attackTokenCost);
  if (isFailure(target)) {
    return target;
  }

  if (target.ownerId === state.supportedIdolId) {
    return failure(state, "OWN_TILE");
  }

  if (target.ownerId === null) {
    return failure(state, "NOT_ENEMY_TILE");
  }

  if (!hasAdjacentOwnedTile(state, coordinate, state.supportedIdolId)) {
    return failure(state, "NOT_ADJACENT");
  }

  const remainingHp = target.hp - GAME_CONFIG.attackDamage;
  const attackedTile: Tile = {
    ...target,
    ownerId: remainingHp <= 0 ? state.supportedIdolId : target.ownerId,
    hp: remainingHp <= 0 ? GAME_CONFIG.maxTileHp : remainingHp,
  };

  return replaceTile(state, attackedTile, GAME_CONFIG.attackTokenCost);
}

