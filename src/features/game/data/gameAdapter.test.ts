import { describe, expect, it } from "vitest";

import { adaptSupabaseRowsToGameState } from "@/features/game/data/gameAdapter";
import type { GameSnapshotRows } from "@/features/game/types/database";

const ROWS: GameSnapshotRows = {
  season: {
    id: "season-test",
    name: "테스트 시즌",
    starts_at: "2026-01-01T00:00:00Z",
    ends_at: "2027-01-01T00:00:00Z",
    status: "active",
    map_width: 360,
    map_height: 216,
  },
  idols: [
    {
      id: "bts",
      name: "BTS",
      color: "#7C3AED",
      representative_image_src: "/mock-idols/bts.svg",
    },
  ],
  tiles: [
    {
      season_id: "season-test",
      x: 2,
      y: 3,
      owner_id: "bts",
      hp: 4,
      updated_at: "2026-08-02T00:00:00Z",
    },
  ],
  player: {
    season_id: "season-test",
    user_id: "00000000-0000-0000-0000-000000000001",
    supported_idol_id: "bts",
    tokens: 87,
    claimed_tiles_count: 0,
    successful_attacks_count: 0,
    total_attacks_count: 0,
    created_at: "2026-08-02T00:00:00.000Z",
  },
};

describe("Supabase game adapter", () => {
  it("maps public rows to the existing sparse GameState", () => {
    const state = adaptSupabaseRowsToGameState(ROWS);

    expect(state.mapSize).toEqual({ width: 360, height: 216 });
    expect(state.supportedIdolId).toBe("bts");
    expect(state.tokens).toBe(87);
    expect(Object.keys(state.tiles)).toHaveLength(1);
    expect(state.tiles["season-test:2,3"]).toMatchObject({
      ownerId: "bts",
      hp: 4,
      coordinate: { x: 2, y: 3 },
    });
  });

  it("does not create missing empty tiles", () => {
    const state = adaptSupabaseRowsToGameState({ ...ROWS, tiles: [] });
    expect(state.tiles).toEqual({});
  });

  it("does not mutate source rows", () => {
    const snapshot = structuredClone(ROWS);
    adaptSupabaseRowsToGameState(ROWS);
    expect(ROWS).toEqual(snapshot);
  });
});
