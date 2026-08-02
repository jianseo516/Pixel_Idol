import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "@/config/game";
import { attackTile, claimTile } from "@/features/game/logic/actions";
import {
  createTileId,
  getTile,
} from "@/features/game/logic/coordinates";
import {
  createInitialGameState,
  MOCK_IDOLS,
} from "@/features/game/mock/createInitialGame";
import type {
  Coordinate,
  GameState,
  Idol,
  Tile,
} from "@/features/game/types/game";

const ADJACENT_TO_LUMI = { x: 139, y: 86 } as const;
const FAR_FROM_LUMI = { x: 10, y: 10 } as const;

function withTokens(state: GameState, tokens: number): GameState {
  return { ...state, tokens };
}

function withTile(
  state: GameState,
  coordinate: Coordinate,
  ownerId: Idol["id"] | null,
  hp: number,
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

function expectFailureCode(
  result: ReturnType<typeof claimTile> | ReturnType<typeof attackTile>,
  code: string,
): void {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe(code);
    expect(result.error.message.length).toBeGreaterThan(0);
  }
}

describe("claimTile", () => {
  it("claims an adjacent empty tile and deducts a token", () => {
    const state = createInitialGameState();
    const result = claimTile(state, ADJACENT_TO_LUMI);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tile.ownerId).toBe(state.supportedIdolId);
      expect(result.tile.hp).toBe(GAME_CONFIG.maxTileHp);
      expect(result.state.tokens).toBe(
        state.tokens - GAME_CONFIG.claimTokenCost,
      );
      expect(getTile(result.state, ADJACENT_TO_LUMI)).toBe(result.tile);
    }
  });

  it("rejects an empty tile that is not adjacent", () => {
    const state = createInitialGameState();
    const result = claimTile(state, FAR_FROM_LUMI);

    expectFailureCode(result, "NOT_ADJACENT");
    expect(result.state).toBe(state);
  });

  it("rejects a claim when tokens are insufficient", () => {
    const state = withTokens(createInitialGameState(), 0);
    const result = claimTile(state, ADJACENT_TO_LUMI);

    expectFailureCode(result, "INSUFFICIENT_TOKENS");
    expect(result.state.tokens).toBe(0);
  });

  it("rejects an out-of-bounds coordinate", () => {
    const state = createInitialGameState();
    const result = claimTile(state, { x: -1, y: 5 });

    expectFailureCode(result, "OUT_OF_BOUNDS");
    expect(result.state).toBe(state);
  });

  it("does not mutate the original state after a failed claim", () => {
    const state = createInitialGameState();
    const originalTile = getTile(state, FAR_FROM_LUMI);
    const result = claimTile(state, FAR_FROM_LUMI);

    expect(result.state).toBe(state);
    expect(getTile(state, FAR_FROM_LUMI)).toEqual(originalTile);
    expect(state.tokens).toBe(GAME_CONFIG.initialUserTokens);
  });
});

describe("attackTile", () => {
  it("attacks an adjacent enemy tile and reduces its HP", () => {
    const initialState = createInitialGameState();
    const state = withTile(
      initialState,
      ADJACENT_TO_LUMI,
      MOCK_IDOLS[1].id,
      GAME_CONFIG.maxTileHp,
    );
    const result = attackTile(state, ADJACENT_TO_LUMI);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tile.ownerId).toBe(MOCK_IDOLS[1].id);
      expect(result.tile.hp).toBe(
        GAME_CONFIG.maxTileHp - GAME_CONFIG.attackDamage,
      );
      expect(result.state.tokens).toBe(
        state.tokens - GAME_CONFIG.attackTokenCost,
      );
    }
  });

  it("rejects an enemy tile that is not adjacent", () => {
    const state = withTile(
      createInitialGameState(),
      FAR_FROM_LUMI,
      MOCK_IDOLS[1].id,
      GAME_CONFIG.maxTileHp,
    );
    const result = attackTile(state, FAR_FROM_LUMI);

    expectFailureCode(result, "NOT_ADJACENT");
    expect(result.state).toBe(state);
  });

  it("rejects attacking a tile owned by the supported idol", () => {
    const state = createInitialGameState();
    const ownCoordinate = { x: 140, y: 86 };
    const result = attackTile(state, ownCoordinate);

    expectFailureCode(result, "OWN_TILE");
    expect(result.state).toBe(state);
  });

  it("changes ownership and resets HP when the enemy reaches zero HP", () => {
    const state = withTile(
      createInitialGameState(),
      ADJACENT_TO_LUMI,
      MOCK_IDOLS[1].id,
      GAME_CONFIG.attackDamage,
    );
    const result = attackTile(state, ADJACENT_TO_LUMI);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tile.ownerId).toBe(state.supportedIdolId);
      expect(result.tile.hp).toBe(GAME_CONFIG.maxTileHp);
    }
  });

  it("does not deduct a token or mutate state after a failed attack", () => {
    const state = createInitialGameState();
    const tokensBefore = state.tokens;
    const tileBefore = getTile(state, { x: 140, y: 86 });
    const result = attackTile(state, { x: 140, y: 86 });

    expect(result.state).toBe(state);
    expect(state.tokens).toBe(tokensBefore);
    expect(getTile(state, { x: 140, y: 86 })).toBe(tileBefore);
  });

  it("rejects an attack when tokens are insufficient", () => {
    const enemyState = withTile(
      createInitialGameState(),
      ADJACENT_TO_LUMI,
      MOCK_IDOLS[1].id,
      GAME_CONFIG.maxTileHp,
    );
    const state = withTokens(enemyState, 0);
    const result = attackTile(state, ADJACENT_TO_LUMI);

    expectFailureCode(result, "INSUFFICIENT_TOKENS");
    expect(result.state.tokens).toBe(0);
  });
});
