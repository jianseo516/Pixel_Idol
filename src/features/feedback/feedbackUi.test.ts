import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const banner = readFileSync("src/features/feedback/BetaNoticeBanner.tsx", "utf8");
const modal = readFileSync("src/features/feedback/FeedbackModal.tsx", "utf8");
const game = readFileSync("src/features/game/components/GamePrototype.tsx", "utf8");
const help = readFileSync("src/app/help/page.tsx", "utf8");

describe("beta feedback UI", () => {
  it("shows the banner independent of authentication and persists dismissal", () => {
    expect(banner).not.toContain("isAuthenticated");
    expect(banner).toContain("BETA_NOTICE_DISMISSED_KEY");
    expect(banner).toContain("window.localStorage.setItem");
    expect(banner).toContain('href="/help"');
  });
  it("opens feedback from the game banner, footer, and help page", () => {
    expect(game.match(/setIsFeedbackOpen\(true\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(help).toContain("FeedbackEntryButton");
  });
  it("provides accessible modal focus, escape, labels, live errors, and loading", () => {
    expect(modal).toContain('role="dialog"');
    expect(modal).toContain('aria-modal="true"');
    expect(modal).toContain('event.key === "Escape"');
    expect(modal).toContain('aria-live="polite"');
    expect(modal).toContain("제출 중…");
    expect(modal).toContain("restoreFocusRef.current?.focus()");
  });
  it("prevents duplicate clicks and clears inputs after success", () => {
    expect(modal).toContain("submittingRef.current");
    expect(modal).toContain('setContent("")');
    expect(modal).toContain('setContactEmail("")');
  });
  it("clears pending identity-bound requests on sign out", () => {
    expect(modal).toMatch(/event !== "SIGNED_OUT"[\s\S]*requestGenerationRef\.current \+= 1[\s\S]*setPending\(false\)/);
  });
  it("uses wrapping responsive layouts", () => {
    expect(banner).toContain("flex-wrap");
    expect(modal).toContain("w-full max-w-xl");
  });
});
