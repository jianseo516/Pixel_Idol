import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202608020008_remove_anonymous_player_access.sql", "utf8");
const inspection = readFileSync("supabase/maintenance/inspect_legacy_anonymous_users.sql", "utf8");

describe("anonymous access removal", () => {
  it("requires permanent accounts for profile, player, and storage policies", () => {
    expect(migration.match(/public\.is_permanent_user\(\)/g)?.length).toBeGreaterThanOrEqual(5);
    expect(migration).toContain("permanent users read own player state");
    expect(migration).toContain("permanent users delete own idol image objects");
  });
  it("keeps cleanup separate and disabled by default", () => {
    expect(inspection).toContain("where is_anonymous is true");
    expect(inspection).toContain("left join public.players");
    expect(inspection).toMatch(/-- delete from auth\.users/);
  });
});
