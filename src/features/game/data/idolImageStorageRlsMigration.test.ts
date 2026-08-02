import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(join(process.cwd(), "supabase/migrations/202608030012_fix_idol_image_storage_rls.sql"), "utf8");

describe("idol image Storage RLS repair migration", () => {
  it("allows only permanent authenticated users in their own UUID folder", () => {
    expect(SQL).toContain("for insert to authenticated");
    expect(SQL).toContain("public.is_permanent_user()");
    expect(SQL).toContain("bucket_id = 'idol-community-images'");
    expect(SQL).toContain("(storage.foldername(name))[1] = auth.uid()::text");
    expect(SQL).not.toMatch(/for insert to (anon|public)/);
  });

  it("matches the user, season, supported idol and safe generated filename", () => {
    expect(SQL).toContain("p.season_id = (storage.foldername(name))[2]");
    expect(SQL).toContain("p.supported_idol_id = (storage.foldername(name))[3]");
    expect(SQL).toContain("\\.(png|jpg|webp)$");
    expect(SQL).toContain("v_expected_path := v_user_id::text || '/' || p_season_id");
  });

  it("keeps raster, size, positive dimensions, cooldown and DB update checks", () => {
    expect(SQL).toContain("p_mime_type not in ('image/png', 'image/jpeg', 'image/webp')");
    expect(SQL).toContain("p_file_size > 3145728");
    expect(SQL).toContain("p_width <= 0 or p_height <= 0");
    expect(SQL).toContain("interval '60 seconds'");
    expect(SQL).toContain("set representative_image_src = v_public_url");
  });

  it("does not disable RLS or broaden Storage mutation permissions", () => {
    expect(SQL).not.toMatch(/disable row level security/i);
    expect(SQL).not.toMatch(/grant\s+(insert|update|delete).*storage\.objects/i);
    expect(SQL).not.toMatch(/service_role/i);
  });
});
