import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "@/config/game";
import { getTileActionPreview } from "@/features/game/logic/actionPreview";
import { attackTile, claimTile } from "@/features/game/logic/actions";
import { createTileId, getStoredTile } from "@/features/game/logic/coordinates";
import { changeSupportedIdol } from "@/features/game/logic/gameState";
import {
  createInitialGameState,
  MOCK_IDOLS,
} from "@/features/game/mock/createInitialGame";
import type {
  Coordinate,
  GameState,
  Idol,
  MapSize,
  Tile,
} from "@/features/game/types/game";

const ADJACENT = { x: 4, y: 5 } as const;
const FAR = { x: 20, y: 15 } as const;
const LARGE_MAP_SIZE: MapSize = { width: 360, height: 216 };

function withTile(
  state: GameState,
  coordinate: Coordinate,
  ownerId: Idol["id"] | null,
  hp: number = GAME_CONFIG.maxTileHp,
): GameState {
  const id = createTileId(state.season.id, coordinate);
  const tile: Tile = {
    id,
    seasonId: state.season.id,
    coordinate,
    ownerId,
    hp,
  };
  return { ...state, tiles: { ...state.tiles, [id]: tile } };
}

describe("getTileActionPreview", () => {
  it("returns CLAIM for an adjacent unstored empty tile", () => {
    const state = createInitialGameState();
    expect(getStoredTile(state, ADJACENT)).toBeUndefined();
    expect(getTileActionPreview(state, ADJACENT)).toMatchObject({
      actionType: "CLAIM",
      allowed: true,
      cost: GAME_CONFIG.claimTokenCost,
      reasonCode: null,
    });
  });

  it("returns CLAIM for an adjacent stored empty tile", () => {
    const state = withTile(createInitialGameState(), ADJACENT, null, 0);
    expect(getTileActionPreview(state, ADJACENT).actionType).toBe("CLAIM");
  });

  it("returns NONE for a non-adjacent unstored empty tile", () => {
    expect(getTileActionPreview(createInitialGameState(), FAR)).toMatchObject({
      actionType: "NONE",
      reasonCode: "NOT_ADJACENT",
    });
  });

  it("returns ATTACK for an adjacent stored enemy tile", () => {
    const state = withTile(createInitialGameState(), ADJACENT, MOCK_IDOLS[1].id);
    expect(getTileActionPreview(state, ADJACENT)).toMatchObject({
      actionType: "ATTACK",
      allowed: true,
      cost: GAME_CONFIG.attackTokenCost,
    });
  });

  it("returns NONE for a non-adjacent stored enemy tile", () => {
    const state = withTile(createInitialGameState(), FAR, MOCK_IDOLS[1].id);
    expect(getTileActionPreview(state, FAR)).toMatchObject({
      actionType: "NONE",
      reasonCode: "NOT_ADJACENT",
    });
  });

  it("returns NONE for a tile owned by the supported idol", () => {
    expect(getTileActionPreview(createInitialGameState(), { x: 5, y: 5 })).toMatchObject({
      actionType: "NONE",
      reasonCode: "OWN_TILE",
      reasonMessage: "내 영토입니다.",
    });
  });

  it("returns NONE when tokens are insufficient", () => {
    const state = { ...createInitialGameState(), tokens: 0 };
    expect(getTileActionPreview(state, ADJACENT)).toMatchObject({
      actionType: "NONE",
      reasonCode: "INSUFFICIENT_TOKENS",
    });
  });

  it("returns NONE after the season has ended", () => {
    const initial = createInitialGameState();
    const state: GameState = {
      ...initial,
      season: { ...initial.season, status: "ended" },
    };
    expect(getTileActionPreview(state, ADJACENT)).toMatchObject({
      actionType: "NONE",
      reasonCode: "SEASON_ENDED",
    });
  });

  it("returns NONE for an out-of-bounds coordinate", () => {
    expect(getTileActionPreview(createInitialGameState(), { x: -1, y: 0 })).toMatchObject({
      actionType: "NONE",
      reasonCode: "OUT_OF_BOUNDS",
    });
  });

  it("does not add a virtual tile or mutate the original state", () => {
    const state = createInitialGameState();
    const tilesBefore = state.tiles;
    const countBefore = Object.keys(state.tiles).length;

    getTileActionPreview(state, ADJACENT);

    expect(state.tiles).toBe(tilesBefore);
    expect(Object.keys(state.tiles)).toHaveLength(countBefore);
    expect(getStoredTile(state, ADJACENT)).toBeUndefined();
  });
});

describe("supported idol changes", () => {
  it("keeps stored tile count, ownership, and HP unchanged", () => {
    const state = createInitialGameState();
    const tileBefore = getStoredTile(state, { x: 5, y: 5 });
    const changed = changeSupportedIdol(state, MOCK_IDOLS[1].id);

    expect(changed.supportedIdolId).toBe(MOCK_IDOLS[1].id);
    expect(changed.tiles).toBe(state.tiles);
    expect(Object.keys(changed.tiles)).toHaveLength(Object.keys(state.tiles).length);
    expect(getStoredTile(changed, { x: 5, y: 5 })).toBe(tileBefore);
    expect(getStoredTile(changed, { x: 5, y: 5 })).toMatchObject({
      ownerId: tileBefore?.ownerId,
      hp: tileBefore?.hp,
    });
  });

  it("changes the preview for the same tile immediately", () => {
    const enemyState = withTile(
      createInitialGameState(),
      ADJACENT,
      MOCK_IDOLS[1].id,
    );
    expect(getTileActionPreview(enemyState, ADJACENT).actionType).toBe("ATTACK");

    const changed = changeSupportedIdol(enemyState, MOCK_IDOLS[1].id);
    expect(getTileActionPreview(changed, ADJACENT)).toMatchObject({
      actionType: "NONE",
      reasonCode: "OWN_TILE",
    });
  });
});

describe("gameplay execution with sparse tiles", () => {
  it("adds exactly one stored tile after a successful claim", () => {
    const state = createInitialGameState();
    const result = claimTile(state, ADJACENT);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.state.tiles)).toHaveLength(Object.keys(state.tiles).length + 1);
      expect(result.state.tokens).toBe(state.tokens - GAME_CONFIG.claimTokenCost);
    }
  });

  it("keeps stored tile count after an attack", () => {
    const state = withTile(createInitialGameState(), ADJACENT, MOCK_IDOLS[1].id);
    const result = attackTile(state, ADJACENT);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.state.tiles)).toHaveLength(Object.keys(state.tiles).length);
    }
  });

  it("supports consecutive attacks and transfers ownership at zero HP", () => {
    let state = withTile(createInitialGameState(), ADJACENT, MOCK_IDOLS[1].id);
    const initialTokens = state.tokens;

    for (let attack = 0; attack < GAME_CONFIG.maxTileHp; attack += 1) {
      const result = attackTile(state, ADJACENT);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }
      state = result.state;
    }

    expect(getStoredTile(state, ADJACENT)).toMatchObject({
      ownerId: state.supportedIdolId,
      hp: GAME_CONFIG.maxTileHp,
    });
    expect(state.tokens).toBe(
      initialTokens - GAME_CONFIG.maxTileHp * GAME_CONFIG.attackTokenCost,
    );
    expect(getTileActionPreview(state, ADJACENT).actionType).toBe("NONE");
  });

  it("deducts tokens only on success and preserves state on failure", () => {
    const state = createInitialGameState();
    const failed = claimTile(state, FAR);
    expect(failed.ok).toBe(false);
    expect(failed.state).toBe(state);
    expect(failed.state.tokens).toBe(state.tokens);

    const succeeded = claimTile(state, ADJACENT);
    expect(succeeded.ok).toBe(true);
    if (succeeded.ok) {
      expect(succeeded.state.tokens).toBe(state.tokens - GAME_CONFIG.claimTokenCost);
    }
  });

  it("supports preview, claim, and attack in a 360×216 GameState", () => {
    const state = createInitialGameState(LARGE_MAP_SIZE);
    expect(getTileActionPreview(state, ADJACENT).actionType).toBe("CLAIM");
    expect(claimTile(state, ADJACENT).ok).toBe(true);

    const enemyState = withTile(state, ADJACENT, MOCK_IDOLS[1].id);
    expect(getTileActionPreview(enemyState, ADJACENT).actionType).toBe("ATTACK");
    expect(attackTile(enemyState, ADJACENT).ok).toBe(true);
    expect(enemyState.mapSize).toEqual(LARGE_MAP_SIZE);
  });
});
