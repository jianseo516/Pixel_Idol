import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/202608020007_nickname_auth_profiles_and_player_stats.sql", "utf8");

describe("nickname auth migration", () => {
  it("creates unique profiles and private player statistics", () => {
    expect(sql).toMatch(/create table if not exists public\.profiles/i);
    expect(sql).toMatch(/normalized_nickname text not null unique/i);
    expect(sql).toMatch(/claimed_tiles_count integer not null default 0/i);
    expect(sql).toMatch(/successful_attacks_count integer not null default 0/i);
    expect(sql).toMatch(/total_attacks_count integer not null default 0/i);
  });
  it("allows public map reads but blocks anonymous mutations", () => {
    expect(sql).toMatch(/for select to anon using \(true\)/i);
    expect(sql.match(/if not public\.is_permanent_user\(\)/gi)?.length).toBeGreaterThanOrEqual(4);
  });
  it("updates statistics only inside successful action transaction paths", () => {
    expect(sql).toMatch(/claimed_tiles_count=claimed_tiles_count\+1/i);
    expect(sql).toMatch(/total_attacks_count=total_attacks_count\+1/i);
    expect(sql).toMatch(/successful_attacks_count=successful_attacks_count\+case when v_captured then 1 else 0 end/i);
  });
});
