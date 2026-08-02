import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("anonymous auth removal", () => {
  it("does not request anonymous authentication from runtime source", () => {
    const collect = (directory: string): string[] => readdirSync(directory, { withFileTypes: true })
      .flatMap((entry) => entry.isDirectory()
        ? collect(join(directory, entry.name))
        : /\.(ts|tsx)$/.test(entry.name) ? [join(directory, entry.name)] : []);
    const sources = collect("src")
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(sources).not.toContain("signIn" + "Anonymously");
    expect(sources).not.toContain("anonymous" + "_provider_disabled");
  });
});
