import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "@/config/game";
import {
  constrainViewport,
  createFittedViewport,
  createInitialViewport,
  ensureTileVisible,
  getOwnedTerritoryWorldCenter,
  getVisibleTileRange,
  getWheelZoom,
  moveSelectedCoordinate,
  resizeViewport,
  screenToTile,
  screenToWorld,
  tileToScreen,
  worldToScreen,
  zoomViewportAtPoint,
} from "@/features/game/rendering/viewport";
import { createInitialGameState } from "@/features/game/mock/createInitialGame";
import type { Viewport } from "@/features/game/types/viewport";

const BASE_VIEWPORT: Viewport = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  width: 280,
  height: 280,
};

describe("viewport coordinate conversions", () => {
  it("converts a screen point to a tile coordinate", () => {
    expect(screenToTile({ x: 70, y: 98 }, BASE_VIEWPORT)).toEqual({
      x: 2,
      y: 3,
    });
  });

  it("converts a tile coordinate to its top-left screen point", () => {
    expect(tileToScreen({ x: 2, y: 3 }, BASE_VIEWPORT)).toEqual({
      x: 56,
      y: 84,
    });
  });

  it("applies zoom while converting coordinates", () => {
    const viewport = { ...BASE_VIEWPORT, zoom: 2 };

    expect(screenToTile({ x: 140, y: 196 }, viewport)).toEqual({ x: 2, y: 3 });
    expect(tileToScreen({ x: 2, y: 3 }, viewport)).toEqual({ x: 112, y: 168 });
  });

  it("applies viewport movement while converting coordinates", () => {
    const viewport = { ...BASE_VIEWPORT, offsetX: 100, offsetY: 50 };

    expect(screenToTile({ x: 128, y: 78 }, viewport)).toEqual({ x: 1, y: 1 });
    expect(tileToScreen({ x: 1, y: 1 }, viewport)).toEqual({ x: 128, y: 78 });
  });

  it.each([
    { x: -1, y: 20 },
    { x: 20, y: -1 },
    { x: GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize, y: 20 },
    { x: 20, y: GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize },
  ])("rejects a world position outside the map: %o", (worldPoint) => {
    const screenPoint = worldToScreen(worldPoint, BASE_VIEWPORT);
    expect(screenToTile(screenPoint, BASE_VIEWPORT)).toBeNull();
  });

  it("calculates only the tiles visible inside the viewport", () => {
    const viewport = {
      ...BASE_VIEWPORT,
      offsetX: -GAME_CONFIG.tileSize,
      offsetY: -GAME_CONFIG.tileSize,
      width: GAME_CONFIG.tileSize * 3,
      height: GAME_CONFIG.tileSize * 2,
    };

    expect(getVisibleTileRange(viewport)).toEqual({
      startX: 1,
      endX: 4,
      startY: 1,
      endY: 3,
    });
  });

  it("keeps the world point under the pointer fixed while zooming", () => {
    const pointer = { x: 170, y: 90 };
    const worldBefore = screenToWorld(pointer, BASE_VIEWPORT);
    const zoomed = zoomViewportAtPoint(BASE_VIEWPORT, pointer, 2.25);
    const worldAfter = screenToWorld(pointer, zoomed);

    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
  });

  it("limits wheel zoom to the configured minimum and maximum", () => {
    expect(getWheelZoom(GAME_CONFIG.minZoom, Number.POSITIVE_INFINITY)).toBe(
      GAME_CONFIG.minZoom,
    );
    expect(getWheelZoom(GAME_CONFIG.maxZoom, Number.NEGATIVE_INFINITY)).toBe(
      GAME_CONFIG.maxZoom,
    );
    expect(
      zoomViewportAtPoint(BASE_VIEWPORT, { x: 0, y: 0 }, 0).zoom,
    ).toBe(GAME_CONFIG.minZoom);
    expect(
      zoomViewportAtPoint(BASE_VIEWPORT, { x: 0, y: 0 }, 100).zoom,
    ).toBe(GAME_CONFIG.maxZoom);
  });
});

describe("viewport navigation", () => {
  it("moves a selected tile in all four keyboard directions", () => {
    expect(moveSelectedCoordinate({ x: 5, y: 5 }, "ArrowUp")).toEqual({ x: 5, y: 4 });
    expect(moveSelectedCoordinate({ x: 5, y: 5 }, "ArrowDown")).toEqual({ x: 5, y: 6 });
    expect(moveSelectedCoordinate({ x: 5, y: 5 }, "ArrowLeft")).toEqual({ x: 4, y: 5 });
    expect(moveSelectedCoordinate({ x: 5, y: 5 }, "ArrowRight")).toEqual({ x: 6, y: 5 });
  });

  it("does not move without a selection or beyond map boundaries", () => {
    expect(moveSelectedCoordinate(null, "ArrowRight")).toBeNull();
    const topLeft = { x: 0, y: 0 };
    const bottomRight = { x: GAME_CONFIG.mapWidth - 1, y: GAME_CONFIG.mapHeight - 1 };
    expect(moveSelectedCoordinate(topLeft, "ArrowUp")).toBe(topLeft);
    expect(moveSelectedCoordinate(topLeft, "ArrowLeft")).toBe(topLeft);
    expect(moveSelectedCoordinate(bottomRight, "ArrowDown")).toBe(bottomRight);
    expect(moveSelectedCoordinate(bottomRight, "ArrowRight")).toBe(bottomRight);
  });

  it("keeps an already visible tile without changing the viewport", () => {
    const viewport = { ...BASE_VIEWPORT, width: 560, height: 280 };
    expect(ensureTileVisible(viewport, { x: 5, y: 5 })).toBe(viewport);
  });

  it.each([
    [{ x: 0, y: 5 }, "offsetX"],
    [{ x: 19, y: 5 }, "offsetX"],
    [{ x: 5, y: 0 }, "offsetY"],
    [{ x: 5, y: 9 }, "offsetY"],
  ] as const)("minimally reveals a tile outside each edge: %o", (coordinate, changedAxis) => {
    const viewport: Viewport = {
      width: 280,
      height: 196,
      zoom: 1,
      offsetX: -GAME_CONFIG.tileSize * 5,
      offsetY: -GAME_CONFIG.tileSize * 3,
    };
    const result = ensureTileVisible(viewport, coordinate);
    expect(result[changedAxis]).not.toBe(viewport[changedAxis]);
    const screen = tileToScreen(coordinate, result);
    expect(screen.x + GAME_CONFIG.tileSize).toBeGreaterThan(0);
    expect(screen.x).toBeLessThan(result.width);
    expect(screen.y + GAME_CONFIG.tileSize).toBeGreaterThan(0);
    expect(screen.y).toBeLessThan(result.height);
  });

  it("constrains viewport movement and preserves inputs in a rectangular canvas", () => {
    const viewport = Object.freeze({
      width: 1200, height: 650, zoom: 1, offsetX: -500, offsetY: -300,
    });
    const coordinate = Object.freeze({ x: 89, y: 53 });
    const next = ensureTileVisible(viewport, coordinate);
    const constrained = constrainViewport(next);
    expect(next).toEqual(constrained);
    expect(viewport).toEqual({ width: 1200, height: 650, zoom: 1, offsetX: -500, offsetY: -300 });
    expect(coordinate).toEqual({ x: 89, y: 53 });
  });

  it("uses a large landscape map that exceeds a laptop viewport", () => {
    const displayedWidth =
      GAME_CONFIG.mapWidth * GAME_CONFIG.defaultTileDisplaySize;
    const displayedHeight =
      GAME_CONFIG.mapHeight * GAME_CONFIG.defaultTileDisplaySize;

    expect(GAME_CONFIG.mapWidth).toBeGreaterThan(GAME_CONFIG.mapHeight);
    expect(GAME_CONFIG.mapWidth / GAME_CONFIG.mapHeight).toBeCloseTo(5 / 3);
    expect(displayedWidth).toBeGreaterThan(1920);
    expect(displayedHeight).toBeGreaterThan(1080);
  });

  it("uses the configured default tile display size", () => {
    const viewport = createInitialViewport(640, 480, { x: 168, y: 168 });
    const displaySize = GAME_CONFIG.tileSize * viewport.zoom;

    expect(displaySize).toBe(GAME_CONFIG.defaultTileDisplaySize);
    expect(displaySize).toBeGreaterThanOrEqual(28);
    expect(displaySize).toBeLessThanOrEqual(36);
    expect(viewport.zoom).toBeGreaterThan(GAME_CONFIG.minZoom);
  });

  it("places the supported idol territory near the initial screen center", () => {
    const state = createInitialGameState();
    const territoryCenter = getOwnedTerritoryWorldCenter(
      state,
      state.supportedIdolId,
    );
    const viewport = createInitialViewport(640, 480, territoryCenter);
    const screenPoint = worldToScreen(territoryCenter, viewport);

    expect(Math.abs(screenPoint.x - viewport.width / 2)).toBeLessThan(100);
    expect(Math.abs(screenPoint.y - viewport.height / 2)).toBeLessThan(100);
  });

  it("fits the entire map inside the overview viewport", () => {
    const viewport = createFittedViewport(900, 600);
    const topLeft = worldToScreen({ x: 0, y: 0 }, viewport);
    const bottomRight = worldToScreen(
      {
        x: GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize,
        y: GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize,
      },
      viewport,
    );

    expect(topLeft.x).toBeGreaterThanOrEqual(0);
    expect(topLeft.y).toBeGreaterThanOrEqual(0);
    expect(bottomRight.x).toBeLessThanOrEqual(viewport.width);
    expect(bottomRight.y).toBeLessThanOrEqual(viewport.height);
  });

  it("prevents the map from being dragged completely outside the viewport", () => {
    const positive = constrainViewport({
      ...BASE_VIEWPORT,
      offsetX: 10_000,
      offsetY: 10_000,
    });
    const negative = constrainViewport({
      ...BASE_VIEWPORT,
      offsetX: -10_000,
      offsetY: -10_000,
    });
    const mapScreenWidth = GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize;
    const mapScreenHeight = GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize;

    expect(positive.offsetX).toBe(GAME_CONFIG.mapEdgePadding);
    expect(positive.offsetY).toBe(GAME_CONFIG.mapEdgePadding);
    expect(negative.offsetX).toBe(
      BASE_VIEWPORT.width - mapScreenWidth - GAME_CONFIG.mapEdgePadding,
    );
    expect(negative.offsetY).toBe(
      BASE_VIEWPORT.height - mapScreenHeight - GAME_CONFIG.mapEdgePadding,
    );
  });

  it("corrects viewport bounds after zooming out", () => {
    const viewport = {
      ...BASE_VIEWPORT,
      width: 600,
      height: 500,
      offsetX: GAME_CONFIG.mapEdgePadding,
      offsetY: GAME_CONFIG.mapEdgePadding,
    };
    const zoomed = zoomViewportAtPoint(viewport, { x: 0, y: 0 }, 0);
    const mapScreenWidth =
      GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize * zoomed.zoom;
    const mapScreenHeight =
      GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize * zoomed.zoom;

    expect(zoomed.offsetX).toBeGreaterThanOrEqual(
      zoomed.width - mapScreenWidth - GAME_CONFIG.mapEdgePadding,
    );
    expect(zoomed.offsetX).toBeLessThanOrEqual(GAME_CONFIG.mapEdgePadding);
    expect(zoomed.offsetY).toBe((zoomed.height - mapScreenHeight) / 2);
  });

  it("keeps the previous world center after canvas resizing", () => {
    const viewport = {
      ...BASE_VIEWPORT,
      width: 400,
      height: 300,
      offsetX: -300,
      offsetY: -300,
    };
    const centerBefore = screenToWorld(
      { x: viewport.width / 2, y: viewport.height / 2 },
      viewport,
    );
    const resized = resizeViewport(viewport, 500, 400);
    const centerAfter = screenToWorld(
      { x: resized.width / 2, y: resized.height / 2 },
      resized,
    );

    expect(centerAfter.x).toBeCloseTo(centerBefore.x);
    expect(centerAfter.y).toBeCloseTo(centerBefore.y);
  });

  it("centers the initial focus in a wide laptop viewport", () => {
    const focus = { x: 700, y: 700 };
    const viewport = createInitialViewport(1200, 650, focus);
    const focusOnScreen = worldToScreen(focus, viewport);

    expect(focusOnScreen.x).toBeCloseTo(viewport.width / 2);
    expect(focusOnScreen.y).toBeCloseTo(viewport.height / 2);
  });

  it("fits the full map in the center of a wide viewport", () => {
    const viewport = createFittedViewport(1200, 650);
    const topLeft = worldToScreen({ x: 0, y: 0 }, viewport);
    const bottomRight = worldToScreen(
      {
        x: GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize,
        y: GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize,
      },
      viewport,
    );

    expect(topLeft.x).toBeCloseTo(viewport.width - bottomRight.x);
    expect(topLeft.y).toBeCloseTo(viewport.height - bottomRight.y);
    expect(topLeft.y).toBe(GAME_CONFIG.viewportPadding);
  });

  it("calculates a rectangular visible tile range", () => {
    const viewport: Viewport = {
      width: GAME_CONFIG.tileSize * 20,
      height: GAME_CONFIG.tileSize * 10,
      zoom: 1,
      offsetX: -GAME_CONFIG.tileSize * 10,
      offsetY: -GAME_CONFIG.tileSize * 5,
    };

    expect(getVisibleTileRange(viewport)).toEqual({
      startX: 10,
      endX: 30,
      startY: 5,
      endY: 15,
    });
  });

  it("constrains both axes independently in a wide viewport", () => {
    const viewport = constrainViewport({
      width: 1200,
      height: 650,
      zoom: 1,
      offsetX: -10_000,
      offsetY: 10_000,
    });

    expect(viewport.offsetX).toBe(
      1200 - GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize - GAME_CONFIG.mapEdgePadding,
    );
    expect(viewport.offsetY).toBe(GAME_CONFIG.mapEdgePadding);
  });

  it("preserves the world center when a wide viewport is resized", () => {
    const viewport: Viewport = {
      width: 1000,
      height: 600,
      zoom: 1,
      offsetX: -200,
      offsetY: -300,
    };
    const before = screenToWorld({ x: 500, y: 300 }, viewport);
    const resized = resizeViewport(viewport, 1300, 700);
    const after = screenToWorld({ x: 650, y: 350 }, resized);

    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
});
