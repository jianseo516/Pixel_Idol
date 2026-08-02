import { GAME_CONFIG } from "@/config/game";
import {
  getStoredTile,
  getTileSnapshot,
  hasAdjacentOwnedTile,
  isCoordinateInBounds,
} from "@/features/game/logic/coordinates";
import type {
  Coordinate,
  GameState,
  TileActionErrorCode,
} from "@/features/game/types/game";

const ERROR_MESSAGES: Readonly<Record<TileActionErrorCode, string>> = {
  OUT_OF_BOUNDS: "지도 범위를 벗어난 좌표입니다.",
  TILE_NOT_FOUND: "대상 타일을 찾을 수 없습니다.",
  SEASON_ENDED: "종료된 시즌에서는 행동할 수 없습니다.",
  INSUFFICIENT_TOKENS: "토큰이 부족합니다.",
  TILE_NOT_EMPTY: "빈 타일만 점령할 수 있습니다.",
  NOT_ADJACENT: "내 영토와 상하좌우로 인접해야 합니다.",
  NOT_ENEMY_TILE: "상대 아이돌의 타일만 공격할 수 있습니다.",
  OWN_TILE: "내 영토입니다.",
};

export function getTileActionErrorMessage(
  code: TileActionErrorCode,
): string {
  return ERROR_MESSAGES[code];
}

function getCommonActionError(
  state: GameState,
  coordinate: Coordinate,
  tokenCost: number,
): TileActionErrorCode | null {
  if (!isCoordinateInBounds(coordinate, state.mapSize)) {
    return "OUT_OF_BOUNDS";
  }
  if (state.season.status === "ended") {
    return "SEASON_ENDED";
  }
  if (state.tokens < tokenCost) {
    return "INSUFFICIENT_TOKENS";
  }
  return null;
}

export function getClaimActionError(
  state: GameState,
  coordinate: Coordinate,
): TileActionErrorCode | null {
  const commonError = getCommonActionError(
    state,
    coordinate,
    GAME_CONFIG.claimTokenCost,
  );
  if (commonError) {
    return commonError;
  }

  const target = getTileSnapshot(state, coordinate);
  if (!target) {
    return "TILE_NOT_FOUND";
  }
  if (target.ownerId !== null) {
    return "TILE_NOT_EMPTY";
  }
  if (!hasAdjacentOwnedTile(state, coordinate, state.supportedIdolId)) {
    return "NOT_ADJACENT";
  }
  return null;
}

export function getAttackActionError(
  state: GameState,
  coordinate: Coordinate,
): TileActionErrorCode | null {
  const commonError = getCommonActionError(
    state,
    coordinate,
    GAME_CONFIG.attackTokenCost,
  );
  if (commonError) {
    return commonError;
  }

  const target = getStoredTile(state, coordinate);
  if (!target || target.ownerId === null) {
    return "NOT_ENEMY_TILE";
  }
  if (target.ownerId === state.supportedIdolId) {
    return "OWN_TILE";
  }
  if (!hasAdjacentOwnedTile(state, coordinate, state.supportedIdolId)) {
    return "NOT_ADJACENT";
  }
  return null;
}
