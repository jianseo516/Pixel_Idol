import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/202608020009_minimal_admin_stats.sql", "utf8");

describe("minimal admin statistics migration", () => {
  it("creates private admin and activity tables without destructive statements", () => {
    expect(sql).toMatch(/create table if not exists public\.admin_users/i);
    expect(sql).toMatch(/create table if not exists public\.activity_events/i);
    expect(sql).toMatch(/revoke all on public\.admin_users, public\.activity_events/i);
    expect(sql).not.toMatch(/delete from|truncate table|drop table/i);
  });
  it("checks admin membership inside the summary RPC", () => {
    expect(sql).toMatch(/if not public\.is_current_user_admin\(\)/i);
    expect(sql).toMatch(/security definer set search_path = pg_catalog, pg_temp/i);
  });
  it("uses Seoul midnight, rolling windows, and distinct active users", () => {
    expect(sql).toContain("Asia/Seoul");
    expect(sql).toMatch(/interval '7 days'/i);
    expect(sql.match(/count\(distinct user_id\)/gi)).toHaveLength(2);
    expect(sql).toMatch(/interval '24 hours'/i);
  });
  it("deduplicates login events for thirty minutes and records successful DB mutations", () => {
    expect(sql).toMatch(/event_type = 'login'[\s\S]*interval '30 minutes'/i);
    for (const event of ["claim_success", "attack_attempt", "image_upload", "supported_idol_change"]) expect(sql).toContain(event);
  });
});
