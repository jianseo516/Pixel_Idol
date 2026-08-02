import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_MAP_SIZE, GAME_CONFIG } from "@/config/game";
import { isCoordinateInBounds } from "@/features/game/logic/coordinates";
import { MOCK_STARTING_TERRITORIES } from "@/features/game/mock/createInitialGame";

const SQL = readFileSync(join(process.cwd(), "supabase/migrations/202608020006_expand_world_map.sql"), "utf8");
describe("expanded world", () => {
  it("uses a 360x216 sparse logical map", () => {
    expect(DEFAULT_MAP_SIZE).toEqual({ width: 360, height: 216 });
    expect(DEFAULT_MAP_SIZE.width * DEFAULT_MAP_SIZE.height).toBe(77_760);
    expect(isCoordinateInBounds({ x: 0, y: 0 })).toBe(true);
    expect(isCoordinateInBounds({ x: 359, y: 215 })).toBe(true);
    expect(isCoordinateInBounds({ x: 360, y: 0 })).toBe(false);
    expect(isCoordinateInBounds({ x: 0, y: 216 })).toBe(false);
    expect(isCoordinateInBounds({ x: -1, y: 0 })).toBe(false);
  });
  it("moves all 32 starting tiles into the centered legacy rectangle", () => {
    const coordinates = Object.values(MOCK_STARTING_TERRITORIES).flat();
    expect(coordinates).toHaveLength(32);
    expect(new Set(coordinates.map(({ x, y }) => `${x},${y}`)).size).toBe(32);
    for (const coordinate of coordinates) {
      expect(coordinate.x).toBeGreaterThanOrEqual(GAME_CONFIG.worldExpansionOffsetX);
      expect(coordinate.x).toBeLessThan(GAME_CONFIG.worldExpansionOffsetX + GAME_CONFIG.legacyMapWidth);
      expect(coordinate.y).toBeGreaterThanOrEqual(GAME_CONFIG.worldExpansionOffsetY);
      expect(coordinate.y).toBeLessThan(GAME_CONFIG.worldExpansionOffsetY + GAME_CONFIG.legacyMapHeight);
    }
    const legacyTopLeftById: Record<string, readonly [number, number]> = {
      bts: [5, 5], blackpink: [33, 5], seventeen: [70, 5], "stray-kids": [10, 25],
      aespa: [43, 25], ive: [75, 25], enhypen: [25, 45], "le-sserafim": [65, 45],
    };
    for (const [idolId, [legacyX, legacyY]] of Object.entries(legacyTopLeftById)) {
      expect(MOCK_STARTING_TERRITORIES[idolId][0]).toEqual({
        x: legacyX + GAME_CONFIG.worldExpansionOffsetX,
        y: legacyY + GAME_CONFIG.worldExpansionOffsetY,
      });
      expect(MOCK_STARTING_TERRITORIES[idolId]).toHaveLength(4);
    }
  });
  it("uses a transaction and temporary copy before offset reinsertion", () => {
    expect(SQL.trimStart().startsWith("begin;")).toBe(true);
    expect(SQL).toContain("create temporary table season_1_tiles_before_expansion");
    expect(SQL).toContain("delete from public.tiles where season_id = 'season-1'");
    expect(SQL).toContain("x + 135, y + 81");
    expect(SQL).toContain("owner_id, hp, updated_at");
    expect(SQL).toContain("지도 확장이 이미 적용되어 있습니다");
    expect(SQL).toContain("v_width <> 90 or v_height <> 54");
    expect(SQL.match(/where season_id = 'season-1'/g)?.length).toBeGreaterThanOrEqual(3);
    expect(SQL.trimEnd().endsWith("commit;")).toBe(true);
  });
});
