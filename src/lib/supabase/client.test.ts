import { describe, expect, it } from "vitest";

import { hasSupabaseBrowserEnvironment } from "@/lib/supabase/client";

describe("Supabase public environment validation", () => {
  it("requires both public variables", () => {
    expect(hasSupabaseBrowserEnvironment({ url: "https://example.invalid", publishableKey: "public-test" })).toBe(true);
    expect(hasSupabaseBrowserEnvironment({ url: undefined, publishableKey: "public-test" })).toBe(false);
    expect(hasSupabaseBrowserEnvironment({ url: "https://example.invalid", publishableKey: undefined })).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(hasSupabaseBrowserEnvironment({ url: "", publishableKey: "" })).toBe(false);
  });
});
