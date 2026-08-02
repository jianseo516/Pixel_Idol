import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "@/config/game";
import { getAllIdolTerritorySummaries } from "@/features/game/logic/territories";
import {
  createInitialGameState,
  MOCK_IDOLS,
} from "@/features/game/mock/createInitialGame";
import {
  calculateImagePlacement,
  createRepresentativeLayerSpecs,
  getContainPlacement,
  getCoverPlacement,
  getLargestTerritoryImageSafeRect,
  getPaddedRectangle,
  getRegionWorldRectangle,
  getRepresentativeDamageOpacity,
  getRepresentativeImagePlacement,
  getRepresentativeImageSlot,
} from "@/features/game/rendering/representativeImage";
import type {
  Coordinate,
  IdolTerritorySummary,
  MapSize,
  TerritoryRegion,
} from "@/features/game/types/game";

const LARGE_MAP_SIZE: MapSize = { width: 360, height: 216 };

function createRegion(
  ownerId: string,
  id: string,
  coordinates: readonly Coordinate[],
): TerritoryRegion {
  const xs = coordinates.map((coordinate) => coordinate.x);
  const ys = coordinates.map((coordinate) => coordinate.y);
  return {
    id,
    ownerId,
    coordinates,
    size: coordinates.length,
    bounds: {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    },
  };
}

function createSummary(
  ownerId: string,
  regions: readonly TerritoryRegion[],
  largestRegion: TerritoryRegion | null,
): IdolTerritorySummary {
  return {
    ownerId,
    regions,
    largestRegion,
    totalTileCount: regions.reduce((total, region) => total + region.size, 0),
  };
}

describe("representative image geometry", () => {
  it("converts a single-tile region bounds to a world rectangle", () => {
    expect(
      getRegionWorldRectangle({ minX: 3, minY: 4, maxX: 3, maxY: 4 }),
    ).toEqual({
      x: 3 * GAME_CONFIG.tileSize,
      y: 4 * GAME_CONFIG.tileSize,
      width: GAME_CONFIG.tileSize,
      height: GAME_CONFIG.tileSize,
    });
  });

  it("calculates 2×2, horizontal, and vertical region rectangles", () => {
    expect(
      getRegionWorldRectangle({ minX: 1, minY: 2, maxX: 2, maxY: 3 }),
    ).toMatchObject({
      width: GAME_CONFIG.tileSize * 2,
      height: GAME_CONFIG.tileSize * 2,
    });
    expect(
      getRegionWorldRectangle({ minX: 1, minY: 2, maxX: 4, maxY: 2 }),
    ).toMatchObject({
      width: GAME_CONFIG.tileSize * 4,
      height: GAME_CONFIG.tileSize,
    });
    expect(
      getRegionWorldRectangle({ minX: 1, minY: 2, maxX: 1, maxY: 5 }),
    ).toMatchObject({
      width: GAME_CONFIG.tileSize,
      height: GAME_CONFIG.tileSize * 4,
    });
  });

  it("crops the source rectangle for cover", () => {
    expect(
      calculateImagePlacement(
        { width: 200, height: 100 },
        { x: 10, y: 20, width: 100, height: 100 },
        "cover",
      ),
    ).toEqual({
      source: { x: 50, y: 0, width: 100, height: 100 },
      destination: { x: 10, y: 20, width: 100, height: 100 },
    });
  });

  it("centers destination letterboxing for contain", () => {
    expect(
      calculateImagePlacement(
        { width: 200, height: 100 },
        { x: 10, y: 20, width: 100, height: 100 },
        "contain",
      ),
    ).toEqual({
      source: { x: 0, y: 0, width: 200, height: 100 },
      destination: { x: 10, y: 45, width: 100, height: 50 },
    });
  });

  it("keeps the entire image inside bounds and centers it", () => {
    const bounds = { x: 30, y: 40, width: 240, height: 120 } as const;
    const placement = getContainPlacement(
      { width: 100, height: 200 },
      bounds,
    );

    expect(placement.source).toEqual({ x: 0, y: 0, width: 100, height: 200 });
    expect(placement.destination.x).toBeGreaterThanOrEqual(bounds.x);
    expect(placement.destination.y).toBeGreaterThanOrEqual(bounds.y);
    expect(placement.destination.x + placement.destination.width).toBeLessThanOrEqual(
      bounds.x + bounds.width,
    );
    expect(placement.destination.y + placement.destination.height).toBeLessThanOrEqual(
      bounds.y + bounds.height,
    );
    expect(placement.destination.x + placement.destination.width / 2).toBe(
      bounds.x + bounds.width / 2,
    );
    expect(placement.destination.y + placement.destination.height / 2).toBe(
      bounds.y + bounds.height / 2,
    );
  });

  it("centers a portrait image inside landscape bounds", () => {
    expect(
      getContainPlacement(
        { width: 100, height: 200 },
        { x: 10, y: 20, width: 300, height: 100 },
      ).destination,
    ).toEqual({ x: 135, y: 20, width: 50, height: 100 });
  });

  it("centers a landscape image inside portrait bounds", () => {
    expect(
      getContainPlacement(
        { width: 200, height: 100 },
        { x: 10, y: 20, width: 100, height: 300 },
      ).destination,
    ).toEqual({ x: 10, y: 145, width: 100, height: 50 });
  });

  it("keeps cover placement available", () => {
    expect(
      getCoverPlacement(
        { width: 200, height: 100 },
        { x: 10, y: 20, width: 100, height: 100 },
      ),
    ).toEqual({
      source: { x: 50, y: 0, width: 100, height: 100 },
      destination: { x: 10, y: 20, width: 100, height: 100 },
    });
  });

  it("uses contain as the configured default placement", () => {
    expect(GAME_CONFIG.representativeImageFit).toBe("contain");
    expect(
      getRepresentativeImagePlacement(
        { width: 200, height: 100 },
        { x: 10, y: 20, width: 100, height: 100 },
      ),
    ).toEqual(getContainPlacement(
      { width: 200, height: 100 },
      { x: 10, y: 20, width: 100, height: 100 },
    ));
  });

  it("does not mutate image size or destination bounds", () => {
    const imageSize = Object.freeze({ width: 200, height: 100 });
    const bounds = Object.freeze({ x: 10, y: 20, width: 100, height: 100 });
    const originalImageSize = { ...imageSize };
    const originalBounds = { ...bounds };

    getContainPlacement(imageSize, bounds);
    getCoverPlacement(imageSize, bounds);

    expect(imageSize).toEqual(originalImageSize);
    expect(bounds).toEqual(originalBounds);
  });

  it("applies padding while keeping the destination inside the safe area", () => {
    const safeArea = { x: 100, y: 200, width: 300, height: 200 } as const;
    const padded = getPaddedRectangle(safeArea);
    const placement = getContainPlacement({ width: 600, height: 600 }, padded);

    expect(padded).toEqual({ x: 124, y: 216, width: 252, height: 168 });
    expect(placement.destination.x).toBeGreaterThanOrEqual(safeArea.x);
    expect(placement.destination.y).toBeGreaterThanOrEqual(safeArea.y);
    expect(placement.destination.x + placement.destination.width).toBeLessThanOrEqual(400);
    expect(placement.destination.y + placement.destination.height).toBeLessThanOrEqual(400);
  });

  it("uses an opaque representative image by default", () => {
    expect(GAME_CONFIG.representativeImageOpacity).toBe(1);
  });

  it("uses configured opacity and clamps explicit values", () => {
    const state = createInitialGameState();
    const summaries = getAllIdolTerritorySummaries(state);
    expect(createRepresentativeLayerSpecs(summaries, state.idols)[0].opacity).toBe(
      GAME_CONFIG.representativeImageOpacity,
    );
    expect(createRepresentativeLayerSpecs(summaries, state.idols, 2)[0].opacity).toBe(1);
  });

  it("increases damage overlay from max HP to HP 1", () => {
    expect(getRepresentativeDamageOpacity(GAME_CONFIG.maxTileHp)).toBe(0);
    expect(getRepresentativeDamageOpacity(3)).toBeGreaterThan(0);
    expect(getRepresentativeDamageOpacity(2)).toBeGreaterThan(
      getRepresentativeDamageOpacity(3),
    );
    expect(getRepresentativeDamageOpacity(1)).toBeCloseTo(0.58);
  });
});

describe("representative image safe rectangle", () => {
  it("uses one tile for a single-tile territory", () => {
    expect(getLargestTerritoryImageSafeRect([{ x: 4, y: 7 }])).toEqual({
      minX: 4,
      minY: 7,
      maxX: 4,
      maxY: 7,
      widthInTiles: 1,
      heightInTiles: 1,
      area: 1,
    });
  });

  it("uses the complete 2 by 2 territory", () => {
    expect(getLargestTerritoryImageSafeRect([
      { x: 1, y: 1 }, { x: 2, y: 1 },
      { x: 1, y: 2 }, { x: 2, y: 2 },
    ])).toMatchObject({ minX: 1, minY: 1, maxX: 2, maxY: 2, area: 4 });
  });

  it("uses complete horizontal and vertical territories", () => {
    expect(getLargestTerritoryImageSafeRect([
      { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 },
    ])).toMatchObject({ minX: 3, minY: 5, maxX: 5, maxY: 5, area: 3 });
    expect(getLargestTerritoryImageSafeRect([
      { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 },
    ])).toMatchObject({ minX: 8, minY: 2, maxX: 8, maxY: 4, area: 3 });
  });

  it("does not include the missing corner of an L-shaped territory", () => {
    expect(getLargestTerritoryImageSafeRect([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 },
    ])).toEqual({
      minX: 0, minY: 0, maxX: 1, maxY: 0,
      widthInTiles: 2, heightInTiles: 1, area: 2,
    });
  });

  it("does not include the center hole of a donut territory", () => {
    const coordinates = [];
    for (let y = 0; y < 3; y += 1) {
      for (let x = 0; x < 3; x += 1) {
        if (x !== 1 || y !== 1) coordinates.push({ x, y });
      }
    }
    const result = getLargestTerritoryImageSafeRect(coordinates);
    expect(result?.area).toBe(3);
    expect(result).toMatchObject({ minX: 0, minY: 0, maxX: 2, maxY: 0 });
  });

  it("uses deterministic tie-breaking and ignores coordinate order", () => {
    const coordinates = [
      { x: 4, y: 4 }, { x: 5, y: 4 },
      { x: 4, y: 5 },
    ];
    const forward = getLargestTerritoryImageSafeRect(coordinates);
    const reverse = getLargestTerritoryImageSafeRect([...coordinates].reverse());
    expect(forward).toEqual(reverse);
    expect(forward).toMatchObject({ minX: 4, minY: 4, maxX: 5, maxY: 4 });
  });

  it("does not mutate coordinates and only depends on sparse stored positions", () => {
    const coordinates = Object.freeze([
      Object.freeze({ x: 0, y: 0 }),
      Object.freeze({ x: 359, y: 215 }),
    ]);
    const before = coordinates.map((coordinate) => ({ ...coordinate }));
    const result = getLargestTerritoryImageSafeRect(coordinates);
    expect(result?.area).toBe(1);
    expect(coordinates).toEqual(before);
  });
});

describe("aspect-aware representative image slot", () => {
  const L_SHAPED_TERRITORY = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 0, y: 3 },
  ] as const;
  const FOUR_BY_FOUR = Array.from({ length: 16 }, (_, index) => ({
    x: index % 4,
    y: Math.floor(index / 4),
  }));

  it("can select different slots for square and portrait images in the same territory", () => {
    const square = getRepresentativeImageSlot(L_SHAPED_TERRITORY, {
      width: 100,
      height: 100,
    });
    const portrait = getRepresentativeImageSlot(L_SHAPED_TERRITORY, {
      width: 100,
      height: 400,
    });

    expect(square?.safeRect).toMatchObject({ widthInTiles: 4, heightInTiles: 1 });
    expect(portrait?.safeRect).toMatchObject({ widthInTiles: 1, heightInTiles: 4 });
  });

  it("lets portrait and landscape images use their matching territory arms", () => {
    const portrait = getRepresentativeImageSlot(L_SHAPED_TERRITORY, {
      width: 200,
      height: 600,
    });
    const landscape = getRepresentativeImageSlot(L_SHAPED_TERRITORY, {
      width: 1600,
      height: 900,
    });

    expect(portrait?.safeRect.heightInTiles).toBe(4);
    expect(portrait?.safeRect.widthInTiles).toBe(1);
    expect(landscape?.safeRect.widthInTiles).toBe(4);
    expect(landscape?.safeRect.heightInTiles).toBe(1);
  });

  it.each([
    ["1:1", 1, 1],
    ["2:3", 2, 3],
    ["3:4", 3, 4],
    ["4:3", 4, 3],
    ["16:9", 16, 9],
    ["very tall", 1, 20],
    ["very wide", 20, 1],
  ])("preserves the %s source ratio and stays inside the safe rectangle", (_, width, height) => {
    const slot = getRepresentativeImageSlot(FOUR_BY_FOUR, { width, height });
    expect(slot).not.toBeNull();
    if (!slot) return;

    const safeWorld = getRegionWorldRectangle(slot.safeRect);
    expect(slot.destination.width / slot.destination.height).toBeCloseTo(width / height);
    expect(slot.destination.x).toBeGreaterThanOrEqual(safeWorld.x);
    expect(slot.destination.y).toBeGreaterThanOrEqual(safeWorld.y);
    expect(slot.destination.x + slot.destination.width).toBeLessThanOrEqual(
      safeWorld.x + safeWorld.width,
    );
    expect(slot.destination.y + slot.destination.height).toBeLessThanOrEqual(
      safeWorld.y + safeWorld.height,
    );
  });

  it("includes padding in candidate evaluation and final placement", () => {
    const slot = getRepresentativeImageSlot(
      FOUR_BY_FOUR,
      { width: 400, height: 300 },
      0.2,
    );
    expect(slot).not.toBeNull();
    if (!slot) return;

    const safeWorld = getRegionWorldRectangle(slot.safeRect);
    expect(slot.destination.x).toBeGreaterThanOrEqual(safeWorld.x + safeWorld.width * 0.2);
    expect(slot.destination.y).toBeGreaterThanOrEqual(safeWorld.y + safeWorld.height * 0.2);
    expect(slot.destination.x + slot.destination.width).toBeLessThanOrEqual(
      safeWorld.x + safeWorld.width * 0.8,
    );
    expect(slot.destination.y + slot.destination.height).toBeLessThanOrEqual(
      safeWorld.y + safeWorld.height * 0.8,
    );
  });

  it("selects the candidate with the greatest displayed image area", () => {
    const portrait = getRepresentativeImageSlot(L_SHAPED_TERRITORY, {
      width: 100,
      height: 400,
    });
    const horizontalCandidate = getRepresentativeImageSlot(
      L_SHAPED_TERRITORY.slice(0, 4),
      { width: 100, height: 400 },
    );
    expect(portrait?.displayedArea).toBeGreaterThan(
      horizontalCandidate?.displayedArea ?? 0,
    );
  });

  it("uses deterministic tie-breaking regardless of coordinate order", () => {
    const forward = getRepresentativeImageSlot(L_SHAPED_TERRITORY, {
      width: 100,
      height: 100,
    });
    const reverse = getRepresentativeImageSlot(
      [...L_SHAPED_TERRITORY].reverse(),
      { width: 100, height: 100 },
    );
    expect(forward).toEqual(reverse);
  });

  it("does not mutate coordinates or image dimensions", () => {
    const coordinates = Object.freeze(
      L_SHAPED_TERRITORY.map((coordinate) => Object.freeze({ ...coordinate })),
    );
    const imageSize = Object.freeze({ width: 200, height: 300 });
    const coordinateSnapshot = coordinates.map((coordinate) => ({ ...coordinate }));

    getRepresentativeImageSlot(coordinates, imageSize);

    expect(coordinates).toEqual(coordinateSnapshot);
    expect(imageSize).toEqual({ width: 200, height: 300 });
  });

  it("contains any positive-ratio image inside one tile", () => {
    const slot = getRepresentativeImageSlot([{ x: 7, y: 9 }], {
      width: 1,
      height: 1000,
    });
    expect(slot?.safeRect).toMatchObject({ widthInTiles: 1, heightInTiles: 1 });
    expect(slot?.destination.width).toBeGreaterThan(0);
    expect(slot?.destination.height).toBeLessThan(GAME_CONFIG.tileSize);
  });
});

describe("representative layer specs", () => {
  it("uses only the actual coordinates of an L-shaped largest region", () => {
    const state = createInitialGameState();
    const coordinates = [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ] as const;
    const region = createRegion(MOCK_IDOLS[0].id, "lumi:1,1", coordinates);
    const summaries = {
      [MOCK_IDOLS[0].id]: createSummary(MOCK_IDOLS[0].id, [region], region),
    };
    const idols = { [MOCK_IDOLS[0].id]: state.idols[MOCK_IDOLS[0].id] };
    const layer = createRepresentativeLayerSpecs(summaries, idols)[0];

    expect(layer.coordinates).toEqual(coordinates);
    expect(layer.coordinates).not.toContainEqual({ x: 2, y: 2 });
  });

  it("excludes smaller separated regions", () => {
    const state = createInitialGameState();
    const largest = createRegion(MOCK_IDOLS[0].id, "lumi:1,1", [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    const smaller = createRegion(MOCK_IDOLS[0].id, "lumi:9,9", [
      { x: 9, y: 9 },
    ]);
    const summaries = {
      [MOCK_IDOLS[0].id]: createSummary(
        MOCK_IDOLS[0].id,
        [largest, smaller],
        largest,
      ),
    };
    const idols = { [MOCK_IDOLS[0].id]: state.idols[MOCK_IDOLS[0].id] };

    expect(createRepresentativeLayerSpecs(summaries, idols)[0]).toMatchObject({
      regionId: largest.id,
      coordinates: largest.coordinates,
    });
  });

  it("creates at most one largest-region layer per idol", () => {
    const state = createInitialGameState();
    const layers = createRepresentativeLayerSpecs(
      getAllIdolTerritorySummaries(state),
      state.idols,
    );

    expect(layers).toHaveLength(MOCK_IDOLS.length);
    expect(new Set(layers.map((layer) => layer.ownerId)).size).toBe(layers.length);
  });

  it("changes regionId when the largest region changes", () => {
    const state = createInitialGameState();
    const first = createRegion(MOCK_IDOLS[0].id, "lumi:1,1", [
      { x: 1, y: 1 },
    ]);
    const second = createRegion(MOCK_IDOLS[0].id, "lumi:5,5", [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
    ]);
    const idols = { [MOCK_IDOLS[0].id]: state.idols[MOCK_IDOLS[0].id] };
    const before = createRepresentativeLayerSpecs(
      {
        [MOCK_IDOLS[0].id]: createSummary(MOCK_IDOLS[0].id, [first], first),
      },
      idols,
    );
    const after = createRepresentativeLayerSpecs(
      {
        [MOCK_IDOLS[0].id]: createSummary(
          MOCK_IDOLS[0].id,
          [first, second],
          second,
        ),
      },
      idols,
    );

    expect(before[0].regionId).not.toBe(after[0].regionId);
  });

  it("does not mutate input summaries or coordinates", () => {
    const state = createInitialGameState();
    const summaries = getAllIdolTerritorySummaries(state);
    const coordinates = summaries[MOCK_IDOLS[0].id].largestRegion?.coordinates;

    createRepresentativeLayerSpecs(summaries, state.idols);

    expect(
      summaries[MOCK_IDOLS[0].id].largestRegion?.coordinates,
    ).toBe(coordinates);
  });

  it("uses only stored largest-region coordinates on a 360×216 map", () => {
    const state = createInitialGameState(LARGE_MAP_SIZE);
    const layers = createRepresentativeLayerSpecs(
      getAllIdolTerritorySummaries(state),
      state.idols,
    );
    const coordinateCount = layers.reduce(
      (total, layer) => total + layer.coordinates.length,
      0,
    );

    expect(coordinateCount).toBeLessThanOrEqual(Object.keys(state.tiles).length);
    expect(coordinateCount).toBeLessThan(
      LARGE_MAP_SIZE.width * LARGE_MAP_SIZE.height,
    );
  });
});
