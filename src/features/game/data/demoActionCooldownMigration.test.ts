import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  join(process.cwd(), "supabase/migrations/202608020004_demo_action_cooldown.sql"),
  "utf8",
);

describe("demo action cooldown migration", () => {
  it("adds the nullable player action timestamp", () => {
    expect(SQL).toMatch(/add column if not exists last_action_at timestamptz null/i);
  });

  it.each(["claim_tile", "attack_tile"])("locks the player and applies 500ms cooldown in %s", (name) => {
    const start = SQL.indexOf(`create or replace function public.${name}`);
    const next = SQL.indexOf("create or replace function public.", start + 1);
    const body = SQL.slice(start, next < 0 ? undefined : next);
    expect(body).toMatch(/from public\.players[\s\S]*for update;/i);
    expect(body).toContain("interval '500 milliseconds'");
    expect(body).toContain("너무 빠르게 행동하고 있습니다. 잠시 후 다시 시도해 주세요.");
    const tileMutation = name === "claim_tile" ? "insert into public.tiles" : "update public.tiles";
    expect(body.indexOf("last_action_at = v_now")).toBeGreaterThan(body.indexOf(tileMutation));
  });

  it("updates last_action_at only in the two successful action updates", () => {
    expect(SQL.match(/last_action_at = v_now/g)).toHaveLength(2);
  });
});
