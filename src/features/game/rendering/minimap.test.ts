import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "@/config/game";
import {
  centerViewportFromMinimapPoint,
  minimapPointToWorld,
  worldViewportToMinimapRect,
} from "@/features/game/rendering/minimap";
import { screenToWorld } from "@/features/game/rendering/viewport";
import type { Viewport } from "@/features/game/types/viewport";

const MINIMAP_SIZE = {
  x: GAME_CONFIG.minimapWidth,
  y: GAME_CONFIG.minimapHeight,
} as const;
const VIEWPORT: Viewport = {
  width: 280,
  height: 280,
  zoom: 1,
  offsetX: -280,
  offsetY: -140,
};

describe("minimap conversions", () => {
  it("uses the same fixed landscape ratio as the game map", () => {
    expect(MINIMAP_SIZE.x / MINIMAP_SIZE.y).toBe(
      GAME_CONFIG.mapWidth / GAME_CONFIG.mapHeight,
    );
  });

  it("converts a minimap point to a world point", () => {
    const worldPoint = minimapPointToWorld(
      { x: MINIMAP_SIZE.x / 2, y: MINIMAP_SIZE.y / 4 },
      MINIMAP_SIZE,
    );

    expect(worldPoint).toEqual({
      x: (GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize) / 2,
      y: (GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize) / 4,
    });
  });

  it("converts the visible world viewport to a minimap rectangle", () => {
    const rect = worldViewportToMinimapRect(VIEWPORT, MINIMAP_SIZE);
    const mapWorldWidth = GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize;
    const mapWorldHeight = GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize;

    expect(rect.x).toBeCloseTo((280 / mapWorldWidth) * MINIMAP_SIZE.x);
    expect(rect.y).toBeCloseTo((140 / mapWorldHeight) * MINIMAP_SIZE.y);
    expect(rect.width).toBeCloseTo((280 / mapWorldWidth) * MINIMAP_SIZE.x);
    expect(rect.height).toBeCloseTo((280 / mapWorldHeight) * MINIMAP_SIZE.y);
  });

  it("centers the main viewport on the clicked minimap position", () => {
    const centered = centerViewportFromMinimapPoint(
      { ...VIEWPORT, width: 400, height: 300 },
      { x: MINIMAP_SIZE.x / 2, y: MINIMAP_SIZE.y / 2 },
      MINIMAP_SIZE,
    );
    const worldCenter = screenToWorld(
      { x: centered.width / 2, y: centered.height / 2 },
      centered,
    );

    expect(worldCenter.x).toBeCloseTo(
      (GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize) / 2,
    );
    expect(worldCenter.y).toBeCloseTo(
      (GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize) / 2,
    );
  });

  it("clamps a top-left drag outside the minimap to the map origin", () => {
    expect(minimapPointToWorld({ x: -20, y: -10 }, MINIMAP_SIZE)).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("converts the minimap center during dragging", () => {
    expect(
      minimapPointToWorld(
        { x: MINIMAP_SIZE.x / 2, y: MINIMAP_SIZE.y / 2 },
        MINIMAP_SIZE,
      ),
    ).toEqual({
      x: (GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize) / 2,
      y: (GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize) / 2,
    });
  });

  it("clamps a bottom-right drag outside the minimap to the map boundary", () => {
    expect(
      minimapPointToWorld(
        { x: MINIMAP_SIZE.x + 30, y: MINIMAP_SIZE.y + 20 },
        MINIMAP_SIZE,
      ),
    ).toEqual({
      x: GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize,
      y: GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize,
    });
  });

  it("moves the viewport center to an in-bounds minimap drag position", () => {
    const centered = centerViewportFromMinimapPoint(
      { ...VIEWPORT, width: 400, height: 300 },
      { x: MINIMAP_SIZE.x * 0.75, y: MINIMAP_SIZE.y * 0.25 },
      MINIMAP_SIZE,
    );
    const worldCenter = screenToWorld(
      { x: centered.width / 2, y: centered.height / 2 },
      centered,
    );

    expect(worldCenter).toEqual({
      x: GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize * 0.75,
      y: GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize * 0.25,
    });
  });

  it("constrains the viewport after dragging beyond the minimap boundary", () => {
    const centered = centerViewportFromMinimapPoint(
      { ...VIEWPORT, width: 400, height: 300 },
      { x: MINIMAP_SIZE.x + 50, y: MINIMAP_SIZE.y + 50 },
      MINIMAP_SIZE,
    );

    expect(centered.offsetX).toBe(
      400 - GAME_CONFIG.mapWidth * GAME_CONFIG.tileSize - GAME_CONFIG.mapEdgePadding,
    );
    expect(centered.offsetY).toBe(
      300 - GAME_CONFIG.mapHeight * GAME_CONFIG.tileSize - GAME_CONFIG.mapEdgePadding,
    );
  });
});
