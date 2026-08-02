import type { GameState, Idol } from "@/features/game/types/game";

export function changeSupportedIdol(
  state: GameState,
  idolId: Idol["id"],
): GameState {
  if (!state.idols[idolId] || state.supportedIdolId === idolId) {
    return state;
  }
  return { ...state, supportedIdolId: idolId };
}
