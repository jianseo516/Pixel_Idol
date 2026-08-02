import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "@/config/game";
import {
  MOCK_IDOLS,
  MOCK_STARTING_TERRITORIES,
} from "@/features/game/mock/createInitialGame";

const EXPECTED_IDS = [
  "bts",
  "blackpink",
  "seventeen",
  "stray-kids",
  "aespa",
  "ive",
  "enhypen",
  "le-sserafim",
] as const;

describe("deployment idol roster", () => {
  it("contains eight unique groups in stable order", () => {
    expect(MOCK_IDOLS.map((idol) => idol.id)).toEqual(EXPECTED_IDS);
    expect(new Set(MOCK_IDOLS.map((idol) => idol.id)).size).toBe(8);
  });

  it("uses valid and distinct service colors", () => {
    expect(MOCK_IDOLS.every((idol) => /^#[0-9A-F]{6}$/.test(idol.color))).toBe(true);
    expect(new Set(MOCK_IDOLS.map((idol) => idol.color)).size).toBe(8);
  });

  it("assigns four unique in-bounds starting tiles to every group", () => {
    const coordinates = Object.entries(MOCK_STARTING_TERRITORIES).flatMap(
      ([ownerId, tiles]) => {
        expect(EXPECTED_IDS).toContain(ownerId);
        expect(tiles).toHaveLength(4);
        return tiles;
      },
    );
    expect(coordinates).toHaveLength(32);
    expect(new Set(coordinates.map(({ x, y }) => `${x},${y}`)).size).toBe(32);
    expect(coordinates.every(({ x, y }) =>
      x >= 3 && y >= 3 && x <= GAME_CONFIG.mapWidth - 4 && y <= GAME_CONFIG.mapHeight - 4,
    )).toBe(true);
  });

  it("does not reference the retired dummy roster", () => {
    const serialized = JSON.stringify({ idols: MOCK_IDOLS, territories: MOCK_STARTING_TERRITORIES });
    expect(serialized).not.toMatch(/lumi|nova|muse/i);
  });
});
