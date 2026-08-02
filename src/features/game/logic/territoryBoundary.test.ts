import { describe, expect, it } from "vitest";

import { getTerritoryBoundarySegments } from "@/features/game/logic/territoryBoundary";
import type {
  Coordinate,
  TerritoryBoundarySegment,
} from "@/features/game/types/game";

function segmentKeys(
  segments: readonly TerritoryBoundarySegment[],
): readonly string[] {
  return segments
    .map(
      (segment) =>
        `${segment.coordinate.x},${segment.coordinate.y}:${segment.side}`,
    )
    .sort();
}

describe("getTerritoryBoundarySegments", () => {
  it("returns all four sides for one tile", () => {
    expect(
      segmentKeys(getTerritoryBoundarySegments([{ x: 2, y: 3 }])),
    ).toEqual([
      "2,3:BOTTOM",
      "2,3:LEFT",
      "2,3:RIGHT",
      "2,3:TOP",
    ]);
  });

  it("excludes the shared side of two horizontal tiles", () => {
    const segments = segmentKeys(
      getTerritoryBoundarySegments([
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ]),
    );
    expect(segments).toHaveLength(6);
    expect(segments).not.toContain("1,1:RIGHT");
    expect(segments).not.toContain("2,1:LEFT");
  });

  it("excludes the shared side of two vertical tiles", () => {
    const segments = segmentKeys(
      getTerritoryBoundarySegments([
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ]),
    );
    expect(segments).toHaveLength(6);
    expect(segments).not.toContain("1,1:BOTTOM");
    expect(segments).not.toContain("1,2:TOP");
  });

  it("returns only the eight outer sides of a 2×2 region", () => {
    expect(
      getTerritoryBoundarySegments([
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ]),
    ).toHaveLength(8);
  });

  it("calculates the outside of an L-shaped region", () => {
    const segments = getTerritoryBoundarySegments([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ]);
    expect(segments).toHaveLength(8);
    expect(segmentKeys(segments)).toContain("2,1:BOTTOM");
    expect(segmentKeys(segments)).toContain("1,2:RIGHT");
  });

  it("keeps separated regions from sharing boundary sides", () => {
    const segments = getTerritoryBoundarySegments([
      { x: 1, y: 1 },
      { x: 3, y: 1 },
    ]);
    expect(segments).toHaveLength(8);
  });

  it("returns the same result regardless of coordinate order", () => {
    const first: Coordinate[] = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ];
    const second = [...first].reverse();

    expect(segmentKeys(getTerritoryBoundarySegments(first))).toEqual(
      segmentKeys(getTerritoryBoundarySegments(second)),
    );
  });

  it("does not mutate the input coordinate array", () => {
    const coordinates: Coordinate[] = [
      { x: 2, y: 1 },
      { x: 1, y: 1 },
    ];
    const before = coordinates.map((coordinate) => ({ ...coordinate }));

    getTerritoryBoundarySegments(coordinates);

    expect(coordinates).toEqual(before);
  });
});
