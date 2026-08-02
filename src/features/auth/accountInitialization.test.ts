import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  initializeAuthenticatedAccount,
  loadOptionalProfile,
} from "./accountInitialization";

const profile = {
  user_id: "user-1",
  nickname: "tester",
  normalized_nickname: "tester",
  created_at: "2026-08-02T00:00:00Z",
  updated_at: "2026-08-02T00:00:00Z",
};
const player = {
  season_id: "season-1",
  user_id: "user-1",
  supported_idol_id: "bts",
  tokens: 100,
};

function createClient(options: {
  readonly profile?: typeof profile | null;
  readonly playerSequence?: Array<typeof player | null>;
  readonly profileError?: { code: string; message: string; details: string; hint: string };
}) {
  const playerSequence = [...(options.playerSequence ?? [player])];
  const maybeSingle = vi.fn(async (table: string) => {
    if (table === "profiles") {
      return { data: options.profile ?? null, error: options.profileError ?? null };
    }
    if (table === "seasons") return { data: { id: "season-1" }, error: null };
    return { data: playerSequence.shift() ?? null, error: null };
  });
  const from = vi.fn((table: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: () => maybeSingle(table),
    };
    return builder;
  });
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  return {
    client: { from, rpc } as unknown as SupabaseClient,
    from,
    rpc,
  };
}

describe("authenticated account initialization", () => {
  it("treats a missing optional profile as null", async () => {
    const { client } = createClient({ profile: null });
    await expect(loadOptionalProfile(client, "user-1")).resolves.toBeNull();
  });

  it("initializes a missing player exactly once and reloads it", async () => {
    const { client, rpc } = createClient({ profile, playerSequence: [null, player] });
    await expect(initializeAuthenticatedAccount(client, "user-1")).resolves.toMatchObject({
      profile,
      player,
      seasonId: "season-1",
    });
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("initialize_player", { p_season_id: "season-1" });
  });

  it("does not initialize when the player already exists", async () => {
    const { client, rpc } = createClient({ profile, playerSequence: [player] });
    await initializeAuthenticatedAccount(client, "user-1");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("surfaces a multiple-row response as a data error", async () => {
    const { client } = createClient({
      profileError: {
        code: "PGRST116",
        message: "Cannot coerce the result to a single JSON object",
        details: "The result contains 2 rows",
        hint: "",
      },
    });
    await expect(loadOptionalProfile(client, "user-1")).rejects.toThrow(
      "Cannot coerce the result to a single JSON object",
    );
  });
});
