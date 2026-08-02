import { describe, expect, it } from "vitest";

import {
  createTileRealtimeState,
  mergeTileSnapshot,
  reduceTileRealtimeEvent,
} from "@/features/game/data/tileRealtimeReducer";
import type { TileRow } from "@/features/game/types/database";

const FIRST_ROW: TileRow = {
  season_id: "season-1",
  x: 3,
  y: 4,
  owner_id: "bts",
  hp: 5,
  updated_at: "2026-08-02T00:00:01Z",
};

describe("tile Realtime event reducer", () => {
  it("adds an inserted row to sparse tiles", () => {
    const initial = createTileRealtimeState([]);
    const next = reduceTileRealtimeEvent(initial, "season-1", {
      eventType: "INSERT",
      row: FIRST_ROW,
    });

    expect(Object.keys(next.tiles)).toEqual(["season-1:3,4"]);
    expect(next.tiles["season-1:3,4"]).toMatchObject({ ownerId: "bts", hp: 5 });
  });

  it("replaces only the updated tile", () => {
    const secondRow: TileRow = { ...FIRST_ROW, x: 8, y: 9 };
    const initial = createTileRealtimeState([FIRST_ROW, secondRow]);
    const untouchedTile = initial.tiles["season-1:8,9"];
    const next = reduceTileRealtimeEvent(initial, "season-1", {
      eventType: "UPDATE",
      row: {
        ...FIRST_ROW,
        owner_id: "blackpink",
        hp: 3,
        updated_at: "2026-08-02T00:00:02Z",
      },
    });

    expect(next.tiles["season-1:3,4"]).toMatchObject({ ownerId: "blackpink", hp: 3 });
    expect(next.tiles["season-1:8,9"]).toBe(untouchedTile);
  });

  it("ignores rows from another season", () => {
    const initial = createTileRealtimeState([FIRST_ROW]);
    const next = reduceTileRealtimeEvent(initial, "season-1", {
      eventType: "INSERT",
      row: { ...FIRST_ROW, season_id: "season-2", x: 10 },
    });
    expect(next).toBe(initial);
  });

  it("ignores duplicate and older events", () => {
    const initial = createTileRealtimeState([FIRST_ROW]);
    const duplicate = reduceTileRealtimeEvent(initial, "season-1", {
      eventType: "UPDATE",
      row: { ...FIRST_ROW, owner_id: "blackpink" },
    });
    const older = reduceTileRealtimeEvent(initial, "season-1", {
      eventType: "UPDATE",
      row: {
        ...FIRST_ROW,
        owner_id: "blackpink",
        updated_at: "2026-08-01T23:59:59Z",
      },
    });
    expect(duplicate).toBe(initial);
    expect(older).toBe(initial);
    expect(initial.tiles["season-1:3,4"].ownerId).toBe("bts");
  });

  it("accepts a newer event after an RPC result with the same key", () => {
    const rpcState = createTileRealtimeState([FIRST_ROW]);
    const realtimeDuplicate = reduceTileRealtimeEvent(rpcState, "season-1", {
      eventType: "INSERT",
      row: FIRST_ROW,
    });
    const newer = reduceTileRealtimeEvent(realtimeDuplicate, "season-1", {
      eventType: "UPDATE",
      row: {
        ...FIRST_ROW,
        hp: 4,
        updated_at: "2026-08-02T00:00:03Z",
      },
    });
    expect(realtimeDuplicate).toBe(rpcState);
    expect(newer.tiles["season-1:3,4"].hp).toBe(4);
  });

  it("does not let a resynchronization snapshot overwrite a newer event", () => {
    const current = createTileRealtimeState([{
      ...FIRST_ROW,
      hp: 3,
      updated_at: "2026-08-02T00:00:05Z",
    }]);
    const synchronized = mergeTileSnapshot(current, "season-1", [{
      ...FIRST_ROW,
      hp: 4,
      updated_at: "2026-08-02T00:00:04Z",
    }]);
    expect(synchronized).toBe(current);
    expect(synchronized.tiles["season-1:3,4"].hp).toBe(3);
  });

  it("does not mutate the event row or previous state", () => {
    const row = Object.freeze({ ...FIRST_ROW });
    const initial = createTileRealtimeState([]);
    reduceTileRealtimeEvent(initial, "season-1", { eventType: "INSERT", row });
    expect(row).toEqual(FIRST_ROW);
    expect(initial.tiles).toEqual({});
  });
});
