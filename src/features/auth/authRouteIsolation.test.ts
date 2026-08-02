import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const authForm = readFileSync("src/features/auth/AuthForm.tsx", "utf8");
const loginPage = readFileSync("src/app/login/page.tsx", "utf8");
const signupPage = readFileSync("src/app/signup/page.tsx", "utf8");
const helpPage = readFileSync("src/app/help/page.tsx", "utf8");

describe("auth route game-data isolation", () => {
  it.each([
    ["login", loginPage],
    ["signup", signupPage],
    ["help", helpPage],
  ])("does not mount the game loader on /%s", (_, source) => {
    expect(source).not.toMatch(/GamePrototype|useSupabaseGame|loadGameSnapshot/);
  });

  it("initializes account rows only after successful password auth", () => {
    const signIn = authForm.indexOf("signInWithNickname");
    const initialize = authForm.indexOf("initializeAuthenticatedAccount", signIn);
    const navigate = authForm.indexOf('router.replace("/")', initialize);
    expect(signIn).toBeGreaterThanOrEqual(0);
    expect(initialize).toBeGreaterThan(signIn);
    expect(navigate).toBeGreaterThan(initialize);
  });

  it("hides the form CTA while authentication is loading", () => {
    expect(authForm).toContain('audience === "loading"');
    expect(authForm).toContain('aria-label="인증 상태 확인 중"');
  });
});
