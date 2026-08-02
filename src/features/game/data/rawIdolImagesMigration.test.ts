import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(join(process.cwd(), "supabase/migrations/202608020005_raw_idol_images.sql"), "utf8");
describe("raw idol image migration", () => {
  it("configures a public 3MB raster-only bucket", () => {
    expect(SQL).toContain("'idol-community-images'");
    expect(SQL).toContain("3145728");
    expect(SQL).toContain("array['image/png', 'image/jpeg', 'image/webp']");
  });
  it("limits paths, ownership, active rows and 60-second submissions", () => {
    expect(SQL).toContain("owner_id = auth.uid()::text");
    expect(SQL).toContain("p.supported_idol_id = (storage.foldername(name))[2]");
    expect(SQL).toContain("s.status = 'active'");
    expect(SQL).toContain("interval '60 seconds'");
    expect(SQL).toContain("idol_image_one_active_idx");
    expect(SQL).toContain("set status = 'replaced'");
    expect(SQL).toContain("set representative_image_src = v_public_url");
  });
  it("uses invoker RLS and derives public URLs from the signed JWT issuer", () => {
    expect(SQL).toContain("with (security_invoker = true)");
    expect(SQL).toContain("v_issuer := auth.jwt()->>'iss'");
    expect(SQL).not.toContain("p_public_url text");
    expect(SQL).toContain("set search_path = pg_catalog, pg_temp");
  });
  it("does not grant rollback to authenticated users", () => {
    expect(SQL).toContain("revoke all on function public.rollback_idol_image(text) from public, anon, authenticated");
  });
});
