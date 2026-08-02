import { describe, expect, it } from "vitest";

import { createTileId } from "@/features/game/logic/coordinates";
import { getOwnershipBoundarySegments } from "@/features/game/logic/ownershipBoundary";
import { createInitialGameState, MOCK_IDOLS } from "@/features/game/mock/createInitialGame";
import type { Coordinate, GameState, Tile } from "@/features/game/types/game";

function stateWithTiles(entries: readonly { coordinate: Coordinate; ownerId: string }[]): GameState {
  const base = createInitialGameState();
  const tiles: Record<string, Tile> = {};
  for (const entry of entries) {
    const id = createTileId(base.season.id, entry.coordinate);
    tiles[id] = {
      id,
      seasonId: base.season.id,
      coordinate: entry.coordinate,
      ownerId: entry.ownerId,
      hp: 5,
    };
  }
  return { ...base, tiles };
}

function sides(state: GameState) {
  return getOwnershipBoundarySegments(state).map(
    (segment) => `${segment.coordinate.x},${segment.coordinate.y}:${segment.side}`,
  );
}

describe("ownership boundary segments", () => {
  it("renders all four sides of one owned tile", () => {
    expect(sides(stateWithTiles([{ coordinate: { x: 5, y: 5 }, ownerId: MOCK_IDOLS[0].id }]))).toEqual([
      "5,5:TOP", "5,5:RIGHT", "5,5:BOTTOM", "5,5:LEFT",
    ]);
  });

  it("removes a horizontal shared side for the same owner", () => {
    const result = sides(stateWithTiles([
      { coordinate: { x: 5, y: 5 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 6, y: 5 }, ownerId: MOCK_IDOLS[0].id },
    ]));
    expect(result).not.toContain("5,5:RIGHT");
    expect(result).not.toContain("6,5:LEFT");
    expect(result).toHaveLength(6);
  });

  it("removes a vertical shared side for the same owner", () => {
    const result = sides(stateWithTiles([
      { coordinate: { x: 5, y: 5 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 5, y: 6 }, ownerId: MOCK_IDOLS[0].id },
    ]));
    expect(result).not.toContain("5,5:BOTTOM");
    expect(result).not.toContain("5,6:TOP");
    expect(result).toHaveLength(6);
  });

  it("removes every internal side of a 2 by 2 territory", () => {
    const ownerId = MOCK_IDOLS[0].id;
    const result = sides(stateWithTiles([
      { coordinate: { x: 5, y: 5 }, ownerId }, { coordinate: { x: 6, y: 5 }, ownerId },
      { coordinate: { x: 5, y: 6 }, ownerId }, { coordinate: { x: 6, y: 6 }, ownerId },
    ]));
    expect(result).toHaveLength(8);
  });

  it("renders a different-owner boundary exactly once", () => {
    const state = stateWithTiles([
      { coordinate: { x: 5, y: 5 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 6, y: 5 }, ownerId: MOCK_IDOLS[1].id },
    ]);
    const shared = getOwnershipBoundarySegments(state).filter(
      (segment) => segment.neighborOwnerId !== null,
    );
    expect(shared).toHaveLength(1);
    expect(shared[0]).toMatchObject({ coordinate: { x: 5, y: 5 }, side: "RIGHT" });
  });

  it("renders boundaries beside empty tiles and map edges", () => {
    expect(sides(stateWithTiles([{ coordinate: { x: 0, y: 0 }, ownerId: MOCK_IDOLS[0].id }]))).toEqual([
      "0,0:TOP", "0,0:RIGHT", "0,0:BOTTOM", "0,0:LEFT",
    ]);
  });

  it("removes shared sides inside an L-shaped territory", () => {
    const ownerId = MOCK_IDOLS[0].id;
    const result = sides(stateWithTiles([
      { coordinate: { x: 2, y: 2 }, ownerId },
      { coordinate: { x: 3, y: 2 }, ownerId },
      { coordinate: { x: 2, y: 3 }, ownerId },
    ]));
    expect(result).toHaveLength(8);
    expect(result).not.toContain("2,2:RIGHT");
    expect(result).not.toContain("2,2:BOTTOM");
  });

  it("is deterministic and does not mutate input state", () => {
    const state = stateWithTiles([
      { coordinate: { x: 8, y: 8 }, ownerId: MOCK_IDOLS[0].id },
      { coordinate: { x: 7, y: 8 }, ownerId: MOCK_IDOLS[0].id },
    ]);
    const tiles = state.tiles;
    expect(getOwnershipBoundarySegments(state)).toEqual(getOwnershipBoundarySegments(state));
    expect(state.tiles).toBe(tiles);
  });
});
