import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "@/config/game";
import {
  areOrthogonallyAdjacent,
  createTileId,
  isCoordinateInBounds,
  isSameCoordinate,
} from "@/features/game/logic/coordinates";

describe("coordinate rules", () => {
  it.each([
    [{ x: 10, y: 10 }, { x: 10, y: 9 }],
    [{ x: 10, y: 10 }, { x: 11, y: 10 }],
    [{ x: 10, y: 10 }, { x: 10, y: 11 }],
    [{ x: 10, y: 10 }, { x: 9, y: 10 }],
  ])("accepts orthogonal neighbors", (first, second) => {
    expect(areOrthogonallyAdjacent(first, second)).toBe(true);
  });

  it("rejects diagonal coordinates", () => {
    expect(
      areOrthogonallyAdjacent({ x: 10, y: 10 }, { x: 11, y: 11 }),
    ).toBe(false);
  });

  it("rejects the same coordinate", () => {
    const coordinate = { x: 10, y: 10 };

    expect(isSameCoordinate(coordinate, coordinate)).toBe(true);
    expect(areOrthogonallyAdjacent(coordinate, coordinate)).toBe(false);
  });

  it.each([
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: GAME_CONFIG.mapWidth, y: 0 },
    { x: 0, y: GAME_CONFIG.mapHeight },
    { x: 1.5, y: 1 },
  ])("rejects an out-of-bounds coordinate: %o", (coordinate) => {
    expect(isCoordinateInBounds(coordinate)).toBe(false);
  });

  it("includes the season in a stable tile id", () => {
    expect(createTileId("season-1", { x: 3, y: 7 })).toBe("season-1:3,7");
  });
});

