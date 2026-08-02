import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(join(process.cwd(), "supabase/migrations/202608030015_fix_coalesce_in_submit_raw_idol_image.sql"), "utf8");

describe("submit_raw_idol_image COALESCE repair migration", () => {
  it("uses the SQL COALESCE expression with matching bigint operands", () => {
    expect(SQL).not.toContain("pg_catalog.coalesce");
    expect(SQL).toContain("coalesce((metadata->>'size')::bigint, 0::bigint) = p_file_size::bigint");
  });

  it("keeps authentication, player, season, format, size, dimension and cooldown checks", () => {
    expect(SQL).toContain("v_user_id is null or not public.is_permanent_user()");
    expect(SQL).toContain("perform public.assert_active_season(p_season_id)");
    expect(SQL).toContain("v_player.supported_idol_id <> p_idol_id");
    expect(SQL).toContain("p_mime_type not in ('image/png', 'image/jpeg', 'image/webp')");
    expect(SQL).toContain("p_file_size > 3145728");
    expect(SQL).toContain("p_width <= 0 or p_height <= 0 or p_width > 5000 or p_height > 5000");
    expect(SQL).toContain("interval '60 seconds'");
  });

  it("revalidates the user path and exact owned Storage object before updating the DB", () => {
    expect(SQL).toContain("v_expected_path := v_user_id::text || '/' || p_season_id");
    expect(SQL).toContain("bucket_id = 'idol-community-images'");
    expect(SQL).toContain("owner_id = v_user_id::text");
    expect(SQL).toContain("(metadata->>'mimetype') = p_mime_type");
    expect(SQL).toContain("set status = 'replaced'");
    expect(SQL).toContain("insert into public.idol_image_submissions");
    expect(SQL).toContain("set representative_image_src = v_public_url");
  });

  it("keeps SECURITY DEFINER permissions and a user-folder-only cleanup policy", () => {
    expect(SQL).toContain("security definer");
    expect(SQL).toContain("set search_path = pg_catalog, pg_temp");
    expect(SQL).toContain("from public, anon");
    expect(SQL).toContain("to authenticated");
    expect(SQL).toContain("for delete");
    expect(SQL).toContain("(storage.foldername(name))[1] = auth.uid()::text");
    expect(SQL).not.toMatch(/disable row level security|service_role|using \(true\)/i);
    expect(SQL).toContain("notify pgrst, 'reload schema'");
  });
});
