import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function collect(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? collect(join(directory, entry.name)) : /\.(ts|tsx)$/.test(entry.name) ? [join(directory, entry.name)] : []);
}

describe("admin client security", () => {
  it("does not reference a public service role secret", () => {
    const source = collect("src").map((file) => readFileSync(file, "utf8")).join("\n");
    expect(source).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE" + "_ROLE_KEY");
  });
});
