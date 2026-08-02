import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "@/config/game";
import {
  collectActionableTileCandidates,
  getActionableTiles,
} from "@/features/game/logic/actionableTiles";
import { attackTile, claimTile } from "@/features/game/logic/actions";
import { createCoordinateKey, createTileId } from "@/features/game/logic/coordinates";
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

const LARGE_MAP_SIZE: MapSize = { width: 360, height: 216 };

function createTile(
  state: GameState,
  coordinate: Coordinate,
  ownerId: Idol["id"] | null,
  hp: number = ownerId ? GAME_CONFIG.maxTileHp : 0,
): Tile {
  return {
    id: createTileId(state.season.id, coordinate),
    seasonId: state.season.id,
    coordinate,
    ownerId,
    hp,
  };
}

function withOnlyTiles(state: GameState, tiles: readonly Tile[]): GameState {
  return {
    ...state,
    tiles: Object.fromEntries(tiles.map((tile) => [tile.id, tile])),
  };
}

function keys(coordinates: readonly Coordinate[]): readonly string[] {
  return coordinates.map(createCoordinateKey).sort();
}

describe("getActionableTiles", () => {
  it("finds up to four claimable empty coordinates around one owned tile", () => {
    const initial = createInitialGameState();
    const state = withOnlyTiles(initial, [
      createTile(initial, { x: 5, y: 5 }, initial.supportedIdolId),
    ]);

    expect(keys(getActionableTiles(state).claimable)).toEqual([
      "4,5",
      "5,4",
      "5,6",
      "6,5",
    ]);
  });

  it("excludes out-of-bounds coordinates at a map corner", () => {
    const initial = createInitialGameState();
    const state = withOnlyTiles(initial, [
      createTile(initial, { x: 0, y: 0 }, initial.supportedIdolId),
    ]);

    expect(keys(getActionableTiles(state).claimable)).toEqual(["0,1", "1,0"]);
  });

  it("deduplicates shared boundary coordinates", () => {
    const initial = createInitialGameState();
    const state = withOnlyTiles(initial, [
      createTile(initial, { x: 5, y: 5 }, initial.supportedIdolId),
      createTile(initial, { x: 6, y: 6 }, initial.supportedIdolId),
    ]);
    const candidates = collectActionableTileCandidates(state);

    expect(new Set(keys(candidates)).size).toBe(candidates.length);
    expect(keys(candidates).filter((key) => key === "5,6")).toHaveLength(1);
    expect(keys(candidates).filter((key) => key === "6,5")).toHaveLength(1);
  });

  it("excludes owned tiles from candidates and results", () => {
    const initial = createInitialGameState();
    const first = createTile(initial, { x: 5, y: 5 }, initial.supportedIdolId);
    const second = createTile(initial, { x: 6, y: 5 }, initial.supportedIdolId);
    const state = withOnlyTiles(initial, [first, second]);
    const resultKeys = keys([
      ...getActionableTiles(state).claimable,
      ...getActionableTiles(state).attackable,
    ]);

    expect(resultKeys).not.toContain("5,5");
    expect(resultKeys).not.toContain("6,5");
  });

  it("classifies adjacent enemies as attackable and empty tiles as claimable", () => {
    const initial = createInitialGameState();
    const state = withOnlyTiles(initial, [
      createTile(initial, { x: 5, y: 5 }, initial.supportedIdolId),
      createTile(initial, { x: 4, y: 5 }, MOCK_IDOLS[1].id),
    ]);
    const actionable = getActionableTiles(state);

    expect(keys(actionable.attackable)).toContain("4,5");
    expect(keys(actionable.claimable)).toContain("5,4");
  });

  it("does not include non-adjacent coordinates", () => {
    const initial = createInitialGameState();
    const state = withOnlyTiles(initial, [
      createTile(initial, { x: 5, y: 5 }, initial.supportedIdolId),
      createTile(initial, { x: 20, y: 20 }, MOCK_IDOLS[1].id),
    ]);
    const actionable = getActionableTiles(state);

    expect(keys(actionable.attackable)).not.toContain("20,20");
    expect(keys(actionable.claimable)).not.toContain("20,19");
  });

  it("returns empty arrays when tokens are insufficient", () => {
    const state = { ...createInitialGameState(), tokens: 0 };
    expect(getActionableTiles(state)).toEqual({ claimable: [], attackable: [] });
  });

  it("returns empty arrays after the season ends", () => {
    const initial = createInitialGameState();
    const state: GameState = {
      ...initial,
      season: { ...initial.season, status: "ended" },
    };
    expect(getActionableTiles(state)).toEqual({ claimable: [], attackable: [] });
  });

  it("changes results when the supported idol changes", () => {
    const initial = createInitialGameState();
    const state = withOnlyTiles(initial, [
      createTile(initial, { x: 5, y: 5 }, MOCK_IDOLS[0].id),
      createTile(initial, { x: 20, y: 20 }, MOCK_IDOLS[1].id),
    ]);
    const lumiKeys = keys(getActionableTiles(state).claimable);
    const novaState = changeSupportedIdol(state, MOCK_IDOLS[1].id);
    const novaKeys = keys(getActionableTiles(novaState).claimable);

    expect(lumiKeys).toContain("4,5");
    expect(novaKeys).toContain("19,20");
    expect(novaKeys).not.toContain("4,5");
  });

  it("removes a claimed coordinate and adds its new boundary", () => {
    const initial = createInitialGameState();
    const state = withOnlyTiles(initial, [
      createTile(initial, { x: 5, y: 5 }, initial.supportedIdolId),
    ]);
    const result = claimTile(state, { x: 4, y: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const claimableKeys = keys(getActionableTiles(result.state).claimable);
      expect(claimableKeys).not.toContain("4,5");
      expect(claimableKeys).toContain("3,5");
    }
  });

  it("removes an attack target after ownership transfers", () => {
    const initial = createInitialGameState();
    const target = { x: 4, y: 5 } as const;
    const state = withOnlyTiles(initial, [
      createTile(initial, { x: 5, y: 5 }, initial.supportedIdolId),
      createTile(initial, target, MOCK_IDOLS[1].id, GAME_CONFIG.attackDamage),
    ]);
    expect(keys(getActionableTiles(state).attackable)).toContain("4,5");

    const result = attackTile(state, target);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(keys(getActionableTiles(result.state).attackable)).not.toContain("4,5");
    }
  });

  it("does not mutate GameState or its sparse tile record", () => {
    const state = createInitialGameState();
    const tilesBefore = state.tiles;
    const countBefore = Object.keys(state.tiles).length;

    getActionableTiles(state);

    expect(state.tiles).toBe(tilesBefore);
    expect(Object.keys(state.tiles)).toHaveLength(countBefore);
  });

  it("limits 360×216 candidates to at most four per stored owned tile", () => {
    const initial = createInitialGameState(LARGE_MAP_SIZE);
    const ownedTiles = Object.values(initial.tiles).filter(
      (tile) => tile.ownerId === initial.supportedIdolId,
    );
    const candidates = collectActionableTileCandidates(initial);

    expect(candidates.length).toBeLessThanOrEqual(ownedTiles.length * 4);
    expect(candidates.length).toBeLessThan(
      LARGE_MAP_SIZE.width * LARGE_MAP_SIZE.height,
    );
  });
});
