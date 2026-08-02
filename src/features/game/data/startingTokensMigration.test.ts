import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { GAME_CONFIG, STARTING_TOKENS } from "@/config/game";

const migration = readFileSync(
  "supabase/migrations/202608020010_starting_tokens.sql",
  "utf8",
);

describe("starting token migration", () => {
  it("uses 500 as the application starting token constant", () => {
    expect(STARTING_TOKENS).toBe(500);
    expect(GAME_CONFIG.initialUserTokens).toBe(STARTING_TOKENS);
  });

  it("sets the database default for newly inserted players to 500", () => {
    expect(migration).toMatch(/alter column tokens set default 500/i);
  });

  it.each([
    "handle_pixel_idol_auth_user",
    "initialize_player",
  ])("lets %s use the players.tokens column default", (functionName) => {
    const body = migration.match(
      new RegExp(`create or replace function public\\.${functionName}\\([\\s\\S]*?\\$\\$;`, "i"),
    )?.[0] ?? "";
    expect(body).toMatch(/insert into public\.players\(season_id, user_id, supported_idol_id\)/i);
    expect(body).not.toMatch(/insert into public\.players\([^)]*tokens/i);
  });

  it("does not update, delete, or recreate existing player rows", () => {
    expect(migration).not.toMatch(/update\s+public\.players/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.players/i);
    expect(migration).not.toMatch(/truncate\s+(table\s+)?public\.players/i);
    expect(migration).not.toMatch(/drop\s+table\s+(if\s+exists\s+)?public\.players/i);
  });

  it("keeps existing rows on player initialization conflicts", () => {
    expect(migration).toMatch(/on conflict \(season_id, user_id\) do nothing/i);
  });

  it("does not change unrelated balance values", () => {
    expect(GAME_CONFIG.maxActionPoints).toBe(100);
    expect(GAME_CONFIG.claimTokenCost).toBe(1);
    expect(GAME_CONFIG.attackTokenCost).toBe(1);
  });
});
