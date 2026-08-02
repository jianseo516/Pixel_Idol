import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/features/auth/HelpAuthCta.tsx", "utf8");

describe("help auth CTA", () => {
  it("never renders a login CTA while auth is loading", () => {
    expect(source).toMatch(/audience === "loading"[\s\S]*인증 상태 확인 중/);
    expect(source).toMatch(/audience === "unauthenticated"[\s\S]*로그인/);
  });
  it("maps authenticated and signed-out visitors to distinct actions", () => {
    expect(source).toContain('href="/?mypage=1"');
    expect(source).toContain('href="/signup"');
    expect(source).toContain('href="/login"');
  });
  it("uses wrapping mobile-safe CTA layout", () => {
    expect(source).toContain("flex-wrap");
  });
});
