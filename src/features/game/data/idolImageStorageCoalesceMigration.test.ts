import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(join(process.cwd(), "supabase/migrations/202608030014_fix_coalesce_in_image_storage_functions.sql"), "utf8");
const POLICY_SQL = readFileSync(join(process.cwd(), "supabase/migrations/202608030013_diagnose_and_fix_image_storage_policy.sql"), "utf8");

describe("idol image Storage COALESCE repair migration", () => {
  it("redefines both functions without schema-qualifying COALESCE", () => {
    expect(SQL).toContain("create or replace function public.can_upload_idol_image_object");
    expect(SQL).toContain("create or replace function public.diagnose_idol_image_upload_path");
    expect(SQL).not.toContain("pg_catalog.coalesce");
    expect(SQL).toContain("coalesce(pg_catalog.cardinality(v_folders), 0)");
    expect(SQL).toContain("coalesce(pg_catalog.substring(v_filename, '\\.([^.]+)$'), '')");
  });

  it("preserves the authenticated user, player, season, idol and filename checks", () => {
    expect(SQL).toContain("v_user_id is null or not public.is_permanent_user()");
    expect(SQL).toContain("v_folders[1] <> v_user_id::text");
    expect(SQL).toContain("p.season_id = v_folders[2]");
    expect(SQL).toContain("p.supported_idol_id = v_folders[3]");
    expect(SQL).toContain("s.status = 'active'");
    expect(SQL).toContain("pg_catalog.now() >= s.starts_at");
    expect(SQL).toContain("\\.(png|jpg|webp)$");
  });

  it("keeps secure function settings and authenticated-only execution", () => {
    expect(SQL.match(/security definer/g)).toHaveLength(2);
    expect(SQL.match(/stable/g)).toHaveLength(2);
    expect(SQL.match(/set search_path = pg_catalog, pg_temp/g)).toHaveLength(2);
    expect(SQL).toContain("revoke all on function public.can_upload_idol_image_object(text) from public, anon");
    expect(SQL).toContain("grant execute on function public.can_upload_idol_image_object(text) to authenticated");
    expect(SQL).toContain("revoke all on function public.diagnose_idol_image_upload_path(text) from public, anon");
    expect(SQL).toContain("grant execute on function public.diagnose_idol_image_upload_path(text) to authenticated");
    expect(SQL).toContain("notify pgrst, 'reload schema'");
  });

  it("keeps the existing narrow Storage INSERT policy and does not weaken RLS", () => {
    expect(POLICY_SQL.replace(/\s+/g, " ")).toContain(
      "with check ( bucket_id = 'idol-community-images' and public.can_upload_idol_image_object(name) )",
    );
    expect(SQL).not.toMatch(/disable row level security/i);
    expect(SQL).not.toMatch(/with check \(true\)/i);
    expect(SQL).not.toMatch(/service_role/i);
  });
});
