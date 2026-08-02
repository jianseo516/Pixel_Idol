import { getStoredTile, isCoordinateInBounds } from "@/features/game/logic/coordinates";
import type { Coordinate, GameState, Idol } from "@/features/game/types/game";
import type { VisibleTileRange } from "@/features/game/types/viewport";

export type OwnershipBoundarySide = "TOP" | "RIGHT" | "BOTTOM" | "LEFT";

export interface OwnershipBoundarySegment {
  readonly coordinate: Coordinate;
  readonly side: OwnershipBoundarySide;
  readonly ownerId: Idol["id"];
  readonly neighborOwnerId: Idol["id"] | null;
}

const SIDES = [
  { side: "TOP", x: 0, y: -1 },
  { side: "RIGHT", x: 1, y: 0 },
  { side: "BOTTOM", x: 0, y: 1 },
  { side: "LEFT", x: -1, y: 0 },
] as const;

function isVisible(coordinate: Coordinate, range?: VisibleTileRange): boolean {
  return !range || (
    coordinate.x >= range.startX && coordinate.x < range.endX &&
    coordinate.y >= range.startY && coordinate.y < range.endY
  );
}

function isBefore(first: Coordinate, second: Coordinate): boolean {
  return first.y < second.y || (first.y === second.y && first.x < second.x);
}

export function getOwnershipBoundarySegments(
  state: GameState,
  visibleRange?: VisibleTileRange,
): readonly OwnershipBoundarySegment[] {
  const tiles = Object.values(state.tiles)
    .filter((tile) => tile.ownerId !== null && isVisible(tile.coordinate, visibleRange))
    .sort((left, right) =>
      left.coordinate.y - right.coordinate.y || left.coordinate.x - right.coordinate.x,
    );
  const segments: OwnershipBoundarySegment[] = [];

  for (const tile of tiles) {
    if (!tile.ownerId) continue;
    for (const { side, x, y } of SIDES) {
      const neighborCoordinate = {
        x: tile.coordinate.x + x,
        y: tile.coordinate.y + y,
      };
      const neighbor = isCoordinateInBounds(neighborCoordinate, state.mapSize)
        ? getStoredTile(state, neighborCoordinate)
        : undefined;
      const neighborOwnerId = neighbor?.ownerId ?? null;
      if (neighborOwnerId === tile.ownerId) continue;
      // 두 타일이 모두 계산 범위에 있을 때만 한쪽 변을 생략한다. 화면 밖 이웃이
      // 정렬상 먼저인 경우에는 현재 보이는 타일 쪽 경계가 사라지지 않아야 한다.
      if (
        neighborOwnerId &&
        isVisible(neighborCoordinate, visibleRange) &&
        !isBefore(tile.coordinate, neighborCoordinate)
      ) continue;
      segments.push({
        coordinate: tile.coordinate,
        side,
        ownerId: tile.ownerId,
        neighborOwnerId,
      });
    }
  }
  return segments;
}
