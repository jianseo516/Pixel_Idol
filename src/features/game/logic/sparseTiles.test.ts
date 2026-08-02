import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "@/config/game";
import { attackTile, claimTile } from "@/features/game/logic/actions";
import {
  createTileId,
  getStoredTile,
  getTile,
  hasStoredTile,
  isCoordinateInBounds,
} from "@/features/game/logic/coordinates";
import {
  createInitialGameState,
  MOCK_IDOLS,
  MOCK_STARTING_TERRITORIES,
} from "@/features/game/mock/createInitialGame";
import {
  minimapPointToWorld,
} from "@/features/game/rendering/minimap";
import {
  createFittedViewport,
  getMapWorldSize,
  getVisibleTileRange,
} from "@/features/game/rendering/viewport";
import type { GameState, MapSize, Tile } from "@/features/game/types/game";

const LARGE_MAP_SIZE: MapSize = { width: 360, height: 216 };
const ADJACENT_TARGET = { x: 139, y: 86 } as const;

function addEnemyTile(state: GameState): GameState {
  const id = createTileId(state.season.id, ADJACENT_TARGET);
  const tile: Tile = {
    id,
    seasonId: state.season.id,
    coordinate: ADJACENT_TARGET,
    ownerId: MOCK_IDOLS[1].id,
    hp: GAME_CONFIG.maxTileHp,
  };
  return { ...state, tiles: { ...state.tiles, [id]: tile } };
}

describe("sparse tile storage on a large map", () => {
  it("stores only starting territories instead of every 360×216 coordinate", () => {
    const state = createInitialGameState(LARGE_MAP_SIZE);
    const startingTileCount = Object.values(MOCK_STARTING_TERRITORIES).reduce(
      (total, coordinates) => total + coordinates.length,
      0,
    );

    expect(Object.keys(state.tiles)).toHaveLength(startingTileCount);
    expect(Object.keys(state.tiles).length).toBeLessThan(
      LARGE_MAP_SIZE.width * LARGE_MAP_SIZE.height,
    );
  });

  it("distinguishes a virtual empty tile from out-of-bounds coordinates", () => {
    const state = createInitialGameState(LARGE_MAP_SIZE);
    const bottomRight = { x: LARGE_MAP_SIZE.width - 1, y: LARGE_MAP_SIZE.height - 1 };
    const emptyTile = getTile(state, bottomRight);

    expect(isCoordinateInBounds(bottomRight, LARGE_MAP_SIZE)).toBe(true);
    expect(emptyTile).toEqual({
      id: createTileId(state.season.id, bottomRight),
      seasonId: state.season.id,
      coordinate: bottomRight,
      ownerId: null,
      hp: 0,
    });
    expect(getStoredTile(state, bottomRight)).toBeUndefined();
    expect(hasStoredTile(state, bottomRight)).toBe(false);
    expect(getTile(state, { x: LARGE_MAP_SIZE.width, y: bottomRight.y })).toBeUndefined();
  });

  it("claims an empty tile without materializing the other empty coordinates", () => {
    const state = createInitialGameState(LARGE_MAP_SIZE);
    const result = claimTile(state, ADJACENT_TARGET);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.state.tiles)).toHaveLength(
        Object.keys(state.tiles).length + 1,
      );
      expect(getStoredTile(result.state, ADJACENT_TARGET)).toBe(result.tile);
    }
  });

  it("attacks a stored enemy tile on the large map", () => {
    const state = addEnemyTile(createInitialGameState(LARGE_MAP_SIZE));
    const result = attackTile(state, ADJACENT_TARGET);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tile.hp).toBe(GAME_CONFIG.maxTileHp - GAME_CONFIG.attackDamage);
      expect(Object.keys(result.state.tiles)).toHaveLength(Object.keys(state.tiles).length);
    }
  });

  it("converts minimap coordinates using the large map dimensions", () => {
    const minimapSize = { x: 165, y: 99 };
    const mapWorldSize = getMapWorldSize(LARGE_MAP_SIZE);

    expect(
      minimapPointToWorld(
        { x: minimapSize.x / 2, y: minimapSize.y / 2 },
        minimapSize,
        LARGE_MAP_SIZE,
      ),
    ).toEqual({ x: mapWorldSize.x / 2, y: mapWorldSize.y / 2 });
  });

  it("fits the full large map and calculates only the visible range", () => {
    const viewport = createFittedViewport(1200, 700, LARGE_MAP_SIZE);
    const mapWorldSize = getMapWorldSize(LARGE_MAP_SIZE);

    expect(mapWorldSize.x * viewport.zoom).toBeLessThanOrEqual(
      viewport.width - GAME_CONFIG.viewportPadding * 2,
    );
    expect(mapWorldSize.y * viewport.zoom).toBeLessThanOrEqual(
      viewport.height - GAME_CONFIG.viewportPadding * 2,
    );

    const navigationViewport = {
      width: 1200,
      height: 700,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    };
    const range = getVisibleTileRange(navigationViewport, LARGE_MAP_SIZE);
    expect(range.endX - range.startX).toBeLessThan(LARGE_MAP_SIZE.width);
    expect(range.endY - range.startY).toBeLessThan(LARGE_MAP_SIZE.height);
  });
});
