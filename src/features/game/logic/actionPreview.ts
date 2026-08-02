import { GAME_CONFIG } from "@/config/game";
import {
  getAttackActionError,
  getClaimActionError,
  getTileActionErrorMessage,
} from "@/features/game/logic/actionValidation";
import { getTileSnapshot } from "@/features/game/logic/coordinates";
import type {
  Coordinate,
  GameState,
  TileActionErrorCode,
  TileActionPreview,
} from "@/features/game/types/game";

function unavailablePreview(
  label: string,
  reasonCode: TileActionErrorCode,
): TileActionPreview {
  return {
    actionType: "NONE",
    allowed: false,
    cost: null,
    label,
    reasonCode,
    reasonMessage: getTileActionErrorMessage(reasonCode),
  };
}

export function getTileActionPreview(
  state: GameState,
  coordinate: Coordinate,
): TileActionPreview {
  const target = getTileSnapshot(state, coordinate);
  if (!target) {
    return unavailablePreview("행동 불가", "OUT_OF_BOUNDS");
  }

  if (target.ownerId === null) {
    const error = getClaimActionError(state, coordinate);
    if (error) {
      return unavailablePreview("점령 불가", error);
    }
    return {
      actionType: "CLAIM",
      allowed: true,
      cost: GAME_CONFIG.claimTokenCost,
      label: "빈 영토 점령",
      reasonCode: null,
      reasonMessage: null,
    };
  }

  if (target.ownerId === state.supportedIdolId) {
    return unavailablePreview("행동 없음", "OWN_TILE");
  }

  const error = getAttackActionError(state, coordinate);
  if (error) {
    return unavailablePreview("공격 불가", error);
  }
  return {
    actionType: "ATTACK",
    allowed: true,
    cost: GAME_CONFIG.attackTokenCost,
    label: "상대 영토 공격",
    reasonCode: null,
    reasonMessage: null,
  };
}
