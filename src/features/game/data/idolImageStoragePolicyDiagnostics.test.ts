import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(join(process.cwd(), "supabase/migrations/202608030013_diagnose_and_fix_image_storage_policy.sql"), "utf8");

describe("idol image Storage policy diagnostics migration", () => {
  it("uses a security definer boolean function instead of policy subqueries", () => {
    expect(SQL).toContain("function public.can_upload_idol_image_object(p_object_name text)");
    expect(SQL).toContain("security definer");
    expect(SQL).toContain("set search_path = pg_catalog, pg_temp");
    expect(SQL).toContain("public.players");
    expect(SQL).toContain("public.seasons");
    expect(SQL.replace(/\s+/g, " ")).toContain(
      "with check ( bucket_id = 'idol-community-images' and public.can_upload_idol_image_object(name) )",
    );
  });

  it("checks the authenticated user's exact folders, idol, active season and UUID filename", () => {
    expect(SQL).toContain("v_folders[1] <> v_user_id::text");
    expect(SQL).toContain("p.season_id = v_folders[2]");
    expect(SQL).toContain("p.supported_idol_id = v_folders[3]");
    expect(SQL).toContain("s.status = 'active'");
    expect(SQL).toContain("pg_catalog.now() >= s.starts_at");
    expect(SQL).toContain("\\.(png|jpg|webp)$");
  });

  it("returns only condition booleans and grants diagnostics to authenticated users", () => {
    for (const key of [
      "authenticated", "is_permanent_user", "path_segment_count_valid",
      "user_folder_matches", "player_exists", "season_matches", "idol_matches",
      "season_status_active", "season_time_valid", "filename_matches",
      "extension_allowed", "can_upload",
    ]) expect(SQL).toContain(`'${key}'`);
    expect(SQL).toContain("grant execute on function public.diagnose_idol_image_upload_path(text) to authenticated");
    expect(SQL).toContain("revoke all on function public.diagnose_idol_image_upload_path(text) from public, anon");
    expect(SQL).not.toMatch(/auth\.jwt\(\)/);
  });

  it("does not weaken Storage RLS", () => {
    expect(SQL).not.toMatch(/disable row level security/i);
    expect(SQL).not.toMatch(/with check \(true\)/i);
    expect(SQL).not.toMatch(/for insert\s+to anon/i);
    expect(SQL).not.toMatch(/service_role/i);
  });
});
