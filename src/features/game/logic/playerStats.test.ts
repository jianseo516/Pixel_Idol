import { describe, expect, it } from "vitest";
import { createInitialGameState, MOCK_IDOLS } from "@/features/game/mock/createInitialGame";
import { getFactionTerritoryCount } from "./playerStats";

describe("player statistics", () => {
  it("counts only sparse tiles owned by the supported faction", () => {
    const state = createInitialGameState();
    expect(getFactionTerritoryCount(state, MOCK_IDOLS[0].id)).toBe(4);
  });
});
