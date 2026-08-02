import { createCoordinateKey } from "@/features/game/logic/coordinates";
import type {
  Coordinate,
  TerritoryBoundarySegment,
  TerritoryBoundarySide,
} from "@/features/game/types/game";

const SIDES: readonly {
  readonly side: TerritoryBoundarySide;
  readonly offsetX: number;
  readonly offsetY: number;
}[] = [
  { side: "TOP", offsetX: 0, offsetY: -1 },
  { side: "RIGHT", offsetX: 1, offsetY: 0 },
  { side: "BOTTOM", offsetX: 0, offsetY: 1 },
  { side: "LEFT", offsetX: -1, offsetY: 0 },
];

function compareCoordinates(first: Coordinate, second: Coordinate): number {
  return first.y - second.y || first.x - second.x;
}

export function getTerritoryBoundarySegments(
  coordinates: readonly Coordinate[],
): readonly TerritoryBoundarySegment[] {
  const sortedCoordinates = [...coordinates].sort(compareCoordinates);
  const regionKeys = new Set(sortedCoordinates.map(createCoordinateKey));
  const segments: TerritoryBoundarySegment[] = [];

  for (const coordinate of sortedCoordinates) {
    for (const { side, offsetX, offsetY } of SIDES) {
      const neighbor = {
        x: coordinate.x + offsetX,
        y: coordinate.y + offsetY,
      };
      if (!regionKeys.has(createCoordinateKey(neighbor))) {
        segments.push({ coordinate, side });
      }
    }
  }

  return segments;
}
