import { GAME_CONFIG } from "@/config/game";
import type {
  Coordinate,
  Idol,
  IdolTerritorySummary,
  TerritoryBounds,
  TerritoryRegion,
} from "@/features/game/types/game";
import type {
  ImagePlacement,
  Rectangle,
  RepresentativeImageSlot,
  RepresentativeCanvasLayerSpec,
  RepresentativeImageFit,
  TerritoryImageSafeRect,
} from "@/features/game/types/representative";

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function getRegionWorldRectangle(bounds: TerritoryBounds): Rectangle {
  return {
    x: bounds.minX * GAME_CONFIG.tileSize,
    y: bounds.minY * GAME_CONFIG.tileSize,
    width: (bounds.maxX - bounds.minX + 1) * GAME_CONFIG.tileSize,
    height: (bounds.maxY - bounds.minY + 1) * GAME_CONFIG.tileSize,
  };
}

const DISPLAY_AREA_EPSILON = 1e-9;

function compareSafeRects(
  candidate: TerritoryImageSafeRect,
  current: TerritoryImageSafeRect,
  centerX: number,
  centerY: number,
): number {
  if (candidate.area !== current.area) {
    return candidate.area - current.area;
  }
  const candidateDistance =
    ((candidate.minX + candidate.maxX + 1) / 2 - centerX) ** 2 +
    ((candidate.minY + candidate.maxY + 1) / 2 - centerY) ** 2;
  const currentDistance =
    ((current.minX + current.maxX + 1) / 2 - centerX) ** 2 +
    ((current.minY + current.maxY + 1) / 2 - centerY) ** 2;
  if (candidateDistance !== currentDistance) {
    return currentDistance - candidateDistance;
  }
  if (candidate.minY !== current.minY) {
    return current.minY - candidate.minY;
  }
  if (candidate.minX !== current.minX) {
    return current.minX - candidate.minX;
  }
  return candidate.widthInTiles - current.widthInTiles;
}

function getLongestConsecutiveRuns(values: ReadonlySet<number>): readonly [number, number][] {
  const sorted = [...values].sort((left, right) => left - right);
  const runs: [number, number][] = [];
  for (const value of sorted) {
    const previous = runs.at(-1);
    if (previous && value === previous[1] + 1) {
      previous[1] = value;
    } else {
      runs.push([value, value]);
    }
  }
  return runs;
}

function getTerritoryBoundsCenter(coordinates: readonly Coordinate[]): {
  readonly x: number;
  readonly y: number;
} | null {
  if (coordinates.length === 0) {
    return null;
  }
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const coordinate of coordinates) {
    minX = Math.min(minX, coordinate.x);
    maxX = Math.max(maxX, coordinate.x);
    minY = Math.min(minY, coordinate.y);
    maxY = Math.max(maxY, coordinate.y);
  }
  return { x: (minX + maxX + 1) / 2, y: (minY + maxY + 1) / 2 };
}

function forEachTerritoryRectangle(
  coordinates: readonly Coordinate[],
  visit: (rectangle: TerritoryImageSafeRect) => void,
): void {
  const rows = new Map<number, Set<number>>();
  for (const coordinate of coordinates) {
    const row = rows.get(coordinate.y) ?? new Set<number>();
    row.add(coordinate.x);
    rows.set(coordinate.y, row);
  }
  const sortedRows = [...rows.keys()].sort((left, right) => left - right);

  for (let topIndex = 0; topIndex < sortedRows.length; topIndex += 1) {
    const topY = sortedRows[topIndex];
    let sharedColumns = new Set(rows.get(topY));
    for (let bottomIndex = topIndex; bottomIndex < sortedRows.length; bottomIndex += 1) {
      const bottomY = sortedRows[bottomIndex];
      if (bottomY !== topY + bottomIndex - topIndex) {
        break;
      }
      if (bottomIndex > topIndex) {
        const row = rows.get(bottomY);
        sharedColumns = new Set([...sharedColumns].filter((x) => row?.has(x)));
      }
      if (sharedColumns.size === 0) {
        break;
      }

      for (const [runMinX, runMaxX] of getLongestConsecutiveRuns(sharedColumns)) {
        for (let candidateMinX = runMinX; candidateMinX <= runMaxX; candidateMinX += 1) {
          for (let candidateMaxX = candidateMinX; candidateMaxX <= runMaxX; candidateMaxX += 1) {
            const widthInTiles = candidateMaxX - candidateMinX + 1;
            const heightInTiles = bottomY - topY + 1;
            visit({
              minX: candidateMinX,
              minY: topY,
              maxX: candidateMaxX,
              maxY: bottomY,
              widthInTiles,
              heightInTiles,
              area: widthInTiles * heightInTiles,
            });
          }
        }
      }
    }
  }
}

export function getLargestTerritoryImageSafeRect(
  coordinates: readonly Coordinate[],
): TerritoryImageSafeRect | null {
  if (coordinates.length === 0) {
    return null;
  }

  const center = getTerritoryBoundsCenter(coordinates);
  if (!center) {
    return null;
  }
  let best: TerritoryImageSafeRect | null = null;
  forEachTerritoryRectangle(coordinates, (candidate) => {
    if (!best || compareSafeRects(candidate, best, center.x, center.y) > 0) {
      best = candidate;
    }
  });

  return best;
}

function compareImageSlots(
  candidate: RepresentativeImageSlot,
  current: RepresentativeImageSlot,
  centerX: number,
  centerY: number,
): number {
  const areaTolerance =
    DISPLAY_AREA_EPSILON * Math.max(1, candidate.displayedArea, current.displayedArea);
  if (Math.abs(candidate.displayedArea - current.displayedArea) > areaTolerance) {
    return candidate.displayedArea - current.displayedArea;
  }
  const candidateCenterX = candidate.safeRect.minX + candidate.safeRect.widthInTiles / 2;
  const candidateCenterY = candidate.safeRect.minY + candidate.safeRect.heightInTiles / 2;
  const currentCenterX = current.safeRect.minX + current.safeRect.widthInTiles / 2;
  const currentCenterY = current.safeRect.minY + current.safeRect.heightInTiles / 2;
  const candidateDistance = (candidateCenterX - centerX) ** 2 + (candidateCenterY - centerY) ** 2;
  const currentDistance = (currentCenterX - centerX) ** 2 + (currentCenterY - centerY) ** 2;
  if (candidateDistance !== currentDistance) {
    return currentDistance - candidateDistance;
  }
  if (candidate.safeRect.area !== current.safeRect.area) {
    return candidate.safeRect.area - current.safeRect.area;
  }
  if (candidate.safeRect.minY !== current.safeRect.minY) {
    return current.safeRect.minY - candidate.safeRect.minY;
  }
  if (candidate.safeRect.minX !== current.safeRect.minX) {
    return current.safeRect.minX - candidate.safeRect.minX;
  }
  if (candidate.safeRect.widthInTiles !== current.safeRect.widthInTiles) {
    return candidate.safeRect.widthInTiles - current.safeRect.widthInTiles;
  }
  return candidate.safeRect.heightInTiles - current.safeRect.heightInTiles;
}

export function getRepresentativeImageSlot(
  coordinates: readonly Coordinate[],
  imageSize: { readonly width: number; readonly height: number },
  paddingRatio: number = GAME_CONFIG.representativeImagePaddingRatio,
): RepresentativeImageSlot | null {
  if (imageSize.width <= 0 || imageSize.height <= 0) {
    return null;
  }
  const center = getTerritoryBoundsCenter(coordinates);
  if (!center) {
    return null;
  }

  let best: RepresentativeImageSlot | null = null;
  forEachTerritoryRectangle(coordinates, (safeRect) => {
    const safeWorldRectangle = getRegionWorldRectangle(safeRect);
    const availableRectangle = getPaddedRectangle(safeWorldRectangle, paddingRatio);
    const placement = getContainPlacement(imageSize, availableRectangle);
    const scale = placement.destination.width / imageSize.width;
    const candidate: RepresentativeImageSlot = {
      safeRect,
      destination: placement.destination,
      scale,
      displayedArea: placement.destination.width * placement.destination.height,
    };
    if (!best || compareImageSlots(candidate, best, center.x, center.y) > 0) {
      best = candidate;
    }
  });
  return best;
}

export function getPaddedRectangle(
  rectangle: Rectangle,
  paddingRatio: number = GAME_CONFIG.representativeImagePaddingRatio,
): Rectangle {
  const ratio = clamp(paddingRatio, 0, 0.49);
  const horizontalPadding = rectangle.width * ratio;
  const verticalPadding = rectangle.height * ratio;
  return {
    x: rectangle.x + horizontalPadding,
    y: rectangle.y + verticalPadding,
    width: rectangle.width - horizontalPadding * 2,
    height: rectangle.height - verticalPadding * 2,
  };
}

function getEmptyPlacement(destinationBounds: Rectangle): ImagePlacement {
  return {
    source: { x: 0, y: 0, width: 0, height: 0 },
    destination: { ...destinationBounds, width: 0, height: 0 },
  };
}

function hasValidDimensions(
  imageSize: { readonly width: number; readonly height: number },
  destinationBounds: Rectangle,
): boolean {
  return (
    imageSize.width > 0 &&
    imageSize.height > 0 &&
    destinationBounds.width > 0 &&
    destinationBounds.height > 0
  );
}

export function getContainPlacement(
  imageSize: { readonly width: number; readonly height: number },
  destinationBounds: Rectangle,
): ImagePlacement {
  if (!hasValidDimensions(imageSize, destinationBounds)) {
    return getEmptyPlacement(destinationBounds);
  }

  const scale = Math.min(
    destinationBounds.width / imageSize.width,
    destinationBounds.height / imageSize.height,
  );
  const width = imageSize.width * scale;
  const height = imageSize.height * scale;
  return {
    source: { x: 0, y: 0, width: imageSize.width, height: imageSize.height },
    destination: {
      x: destinationBounds.x + (destinationBounds.width - width) / 2,
      y: destinationBounds.y + (destinationBounds.height - height) / 2,
      width,
      height,
    },
  };
}

export function getCoverPlacement(
  imageSize: { readonly width: number; readonly height: number },
  destinationBounds: Rectangle,
): ImagePlacement {
  if (!hasValidDimensions(imageSize, destinationBounds)) {
    return getEmptyPlacement(destinationBounds);
  }

  const scale = Math.max(
    destinationBounds.width / imageSize.width,
    destinationBounds.height / imageSize.height,
  );
  const sourceWidth = destinationBounds.width / scale;
  const sourceHeight = destinationBounds.height / scale;
  return {
    source: {
      x: (imageSize.width - sourceWidth) / 2,
      y: (imageSize.height - sourceHeight) / 2,
      width: sourceWidth,
      height: sourceHeight,
    },
    destination: destinationBounds,
  };
}

export function calculateCoverPlacement(
  sourceSize: { readonly width: number; readonly height: number },
  destinationRect: Rectangle,
): ImagePlacement {
  return getCoverPlacement(sourceSize, destinationRect);
}

export function getRepresentativeImagePlacement(
  imageSize: { readonly width: number; readonly height: number },
  destinationBounds: Rectangle,
  fit: RepresentativeImageFit = GAME_CONFIG.representativeImageFit,
): ImagePlacement {
  return fit === "contain"
    ? getContainPlacement(imageSize, destinationBounds)
    : getCoverPlacement(imageSize, destinationBounds);
}

// 기존 호출부와 공개 함수 호환성을 유지한다.
export function calculateImagePlacement(
  imageSize: { readonly width: number; readonly height: number },
  destinationBounds: Rectangle,
  fit: RepresentativeImageFit,
): ImagePlacement {
  return getRepresentativeImagePlacement(imageSize, destinationBounds, fit);
}

export function getRepresentativeDamageOpacity(
  hp: number,
  maxHp: number = GAME_CONFIG.maxTileHp,
): number {
  if (maxHp <= 1 || hp >= maxHp) {
    return 0;
  }
  const damageRatio = (maxHp - clamp(hp, 1, maxHp)) / (maxHp - 1);
  return damageRatio * 0.58;
}

export interface RepresentativeImageRenderRequirements {
  readonly minTileCount: number;
  readonly minWidth: number;
  readonly minHeight: number;
}

const DEFAULT_RENDER_REQUIREMENTS: RepresentativeImageRenderRequirements = {
  minTileCount: GAME_CONFIG.representativeImageMinTileCount,
  minWidth: GAME_CONFIG.representativeImageMinWidthInTiles,
  minHeight: GAME_CONFIG.representativeImageMinHeightInTiles,
};

export function shouldRenderRepresentativeImage(
  region: TerritoryRegion,
  requirements: RepresentativeImageRenderRequirements = DEFAULT_RENDER_REQUIREMENTS,
): boolean {
  const width = region.bounds.maxX - region.bounds.minX + 1;
  const height = region.bounds.maxY - region.bounds.minY + 1;
  return region.size >= requirements.minTileCount
    && width >= requirements.minWidth
    && height >= requirements.minHeight;
}

export function createRepresentativeLayerSpecs(
  summaries: Readonly<Record<Idol["id"], IdolTerritorySummary>>,
  idols: Readonly<Record<Idol["id"], Idol>>,
  opacity: number = GAME_CONFIG.representativeImageOpacity,
): readonly RepresentativeCanvasLayerSpec[] {
  const layers: RepresentativeCanvasLayerSpec[] = [];
  for (const ownerId of Object.keys(idols).sort()) {
    const idol = idols[ownerId];
    const region = summaries[ownerId]?.largestRegion;
    if (!idol || !region) {
      continue;
    }
    layers.push({
      ownerId,
      regionId: region.id,
      imageSrc: idol.representativeImageSrc,
      coordinates: region.coordinates,
      bounds: region.bounds,
      opacity: clamp(opacity, 0, 1),
      shouldRender: shouldRenderRepresentativeImage(region),
    });
  }
  return layers;
}
