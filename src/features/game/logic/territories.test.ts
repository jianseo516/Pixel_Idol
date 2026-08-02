import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "@/config/game";
import { attackTile, claimTile } from "@/features/game/logic/actions";
import { createTileId } from "@/features/game/logic/coordinates";
import { changeSupportedIdol } from "@/features/game/logic/gameState";
import {
  findTerritoryRegionAt,
  getAllIdolTerritorySummaries,
  getIdolTerritorySummary,
  getLargestTerritoryRegion,
  getTerritoryBounds,
  getTerritoryRegions,
} from "@/features/game/logic/territories";
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

function withTiles(
  state: GameState,
  definitions: readonly {
    readonly coordinate: Coordinate;
    readonly ownerId: Idol["id"] | null;
    readonly hp?: number;
  }[],
): GameState {
  const tiles = definitions.map((definition) =>
    createTile(
      state,
      definition.coordinate,
      definition.ownerId,
      definition.hp,
    ),
  );
  return {
    ...state,
    tiles: Object.fromEntries(tiles.map((tile) => [tile.id, tile])),
  };
}

describe("territory region calculation", () => {
  it("treats one tile as a region of size one", () => {
    const initial = createInitialGameState();
    const state = withTiles(initial, [
      { coordinate: { x: 5, y: 5 }, ownerId: MOCK_IDOLS[0].id },
    ]);
    const regions = getTerritoryRegions(state, MOCK_IDOLS[0].id);

    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({ size: 1, id: "bts:5,5" });
  });

  it("connects orthogonal tiles into one region", () => {
    const initial = createInitialGameState();
    const state = withTiles(initial, [
      { coordinate: { x: 5, y: 5 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 5, y: 4 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 6, y: 5 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 5, y: 6 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 4, y: 5 }, ownerId: MOCK_IDOLS[0].id },
    ]);

    expect(getTerritoryRegions(state, MOCK_IDOLS[0].id)).toMatchObject([
      { size: 5 },
    ]);
  });

  it("keeps diagonal tiles in separate regions", () => {
    const initial = createInitialGameState();
    const state = withTiles(initial, [
      { coordinate: { x: 5, y: 5 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 6, y: 6 }, ownerId: MOCK_IDOLS[0].id },
    ]);

    expect(getTerritoryRegions(state, MOCK_IDOLS[0].id)).toHaveLength(2);
  });

  it("does not connect tiles with different owners", () => {
    const initial = createInitialGameState();
    const state = withTiles(initial, [
      { coordinate: { x: 5, y: 5 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 6, y: 5 }, ownerId: MOCK_IDOLS[1].id },
    ]);

    expect(getTerritoryRegions(state, MOCK_IDOLS[0].id)[0].size).toBe(1);
    expect(getTerritoryRegions(state, MOCK_IDOLS[1].id)[0].size).toBe(1);
  });

  it("calculates multiple separated regions deterministically", () => {
    const initial = createInitialGameState();
    const state = withTiles(initial, [
      { coordinate: { x: 9, y: 9 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 2, y: 2 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 3, y: 2 }, ownerId: MOCK_IDOLS[0].id },
    ]);
    const regions = getTerritoryRegions(state, MOCK_IDOLS[0].id);

    expect(regions.map((region) => region.id)).toEqual(["bts:2,2", "bts:9,9"]);
    expect(regions.map((region) => region.size)).toEqual([2, 1]);
  });

  it("selects the largest region", () => {
    const initial = createInitialGameState();
    const state = withTiles(initial, [
      { coordinate: { x: 1, y: 1 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 8, y: 8 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 9, y: 8 }, ownerId: MOCK_IDOLS[0].id },
    ]);

    expect(
      getLargestTerritoryRegion(getTerritoryRegions(state, MOCK_IDOLS[0].id))
        ?.id,
    ).toBe("bts:8,8");
  });

  it("breaks size ties by minY, then minX, then stable ID", () => {
    const initial = createInitialGameState();
    const state = withTiles(initial, [
      { coordinate: { x: 8, y: 4 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 9, y: 4 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 2, y: 4 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 3, y: 4 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 1, y: 9 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 2, y: 9 }, ownerId: MOCK_IDOLS[0].id },
    ]);

    expect(getIdolTerritorySummary(state, MOCK_IDOLS[0].id).largestRegion?.id).toBe(
      "bts:2,4",
    );
  });

  it("calculates region bounds", () => {
    expect(
      getTerritoryBounds([
        { x: 4, y: 7 },
        { x: 8, y: 3 },
        { x: 6, y: 9 },
      ]),
    ).toEqual({ minX: 4, minY: 3, maxX: 8, maxY: 9 });
  });

  it("finds the region containing a coordinate", () => {
    const state = createInitialGameState();
    const regions = getTerritoryRegions(state, MOCK_IDOLS[0].id);

    expect(findTerritoryRegionAt(regions, { x: 5, y: 5 })?.ownerId).toBe(
      MOCK_IDOLS[0].id,
    );
    expect(findTerritoryRegionAt(regions, { x: 20, y: 20 })).toBeNull();
  });

  it("excludes empty stored tiles and preserves sparse state", () => {
    const initial = createInitialGameState();
    const state = withTiles(initial, [
      { coordinate: { x: 5, y: 5 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 6, y: 5 }, ownerId: null },
    ]);
    const tilesBefore = state.tiles;

    expect(getIdolTerritorySummary(state, MOCK_IDOLS[0].id).totalTileCount).toBe(1);
    expect(state.tiles).toBe(tilesBefore);
    expect(Object.keys(state.tiles)).toHaveLength(2);
  });

  it("summarizes every configured idol", () => {
    const summaries = getAllIdolTerritorySummaries(createInitialGameState());
    expect(Object.keys(summaries).sort()).toEqual(
      MOCK_IDOLS.map((idol) => idol.id).sort(),
    );
  });
});

describe("territory changes after gameplay", () => {
  it("merges two regions when a claim bridges them", () => {
    const initial = createInitialGameState();
    const state = withTiles(initial, [
      { coordinate: { x: 3, y: 5 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 5, y: 5 }, ownerId: MOCK_IDOLS[0].id },
    ]);
    expect(getTerritoryRegions(state, MOCK_IDOLS[0].id)).toHaveLength(2);

    const result = claimTile(state, { x: 4, y: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(getTerritoryRegions(result.state, MOCK_IDOLS[0].id)).toMatchObject([
        { size: 3 },
      ]);
    }
  });

  it("increases an existing region after a claim", () => {
    const initial = createInitialGameState();
    const state = withTiles(initial, [
      { coordinate: { x: 5, y: 5 }, ownerId: MOCK_IDOLS[0].id },
    ]);
    const result = claimTile(state, { x: 4, y: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(getIdolTerritorySummary(result.state, MOCK_IDOLS[0].id)).toMatchObject({
        totalTileCount: 2,
        largestRegion: { size: 2 },
      });
    }
  });

  it("splits an enemy region when its middle tile transfers", () => {
    const initial = createInitialGameState();
    const state = withTiles(initial, [
      { coordinate: { x: 5, y: 6 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 4, y: 5 }, ownerId: MOCK_IDOLS[1].id },
      {
        coordinate: { x: 4, y: 6 },
        ownerId: MOCK_IDOLS[1].id,
        hp: GAME_CONFIG.attackDamage,
      },
      { coordinate: { x: 4, y: 7 }, ownerId: MOCK_IDOLS[1].id },
    ]);
    expect(getTerritoryRegions(state, MOCK_IDOLS[1].id)).toHaveLength(1);

    const result = attackTile(state, { x: 4, y: 6 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(getTerritoryRegions(result.state, MOCK_IDOLS[1].id)).toHaveLength(2);
    }
  });

  it("connects two owned regions after an enemy tile transfers", () => {
    const initial = createInitialGameState();
    const state = withTiles(initial, [
      { coordinate: { x: 3, y: 5 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 5, y: 5 }, ownerId: MOCK_IDOLS[0].id },
      {
        coordinate: { x: 4, y: 5 },
        ownerId: MOCK_IDOLS[1].id,
        hp: GAME_CONFIG.attackDamage,
      },
    ]);
    const result = attackTile(state, { x: 4, y: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(getTerritoryRegions(result.state, MOCK_IDOLS[0].id)).toMatchObject([
        { size: 3 },
      ]);
    }
  });

  it("uses the new idol's largest region after support changes", () => {
    const initial = createInitialGameState();
    const summaries = getAllIdolTerritorySummaries(initial);
    const changed = changeSupportedIdol(initial, MOCK_IDOLS[1].id);

    expect(summaries[initial.supportedIdolId].largestRegion?.ownerId).toBe(
      MOCK_IDOLS[0].id,
    );
    expect(summaries[changed.supportedIdolId].largestRegion?.ownerId).toBe(
      MOCK_IDOLS[1].id,
    );
  });

  it("uses only stored owned tiles on a 360×216 map", () => {
    const initial = createInitialGameState(LARGE_MAP_SIZE);
    const summary = getIdolTerritorySummary(initial, MOCK_IDOLS[0].id);
    const storedOwnedCount = Object.values(initial.tiles).filter(
      (tile) => tile.ownerId === MOCK_IDOLS[0].id,
    ).length;

    expect(summary.totalTileCount).toBe(storedOwnedCount);
    expect(summary.totalTileCount).toBeLessThan(
      LARGE_MAP_SIZE.width * LARGE_MAP_SIZE.height,
    );
  });
});
