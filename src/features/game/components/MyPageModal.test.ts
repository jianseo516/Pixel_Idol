import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/features/game/components/MyPageModal.tsx", "utf8");

describe("my page modal accessibility", () => {
  it("declares a modal dialog and supports escape, outside click, and focus trapping", () => {
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("event.target === event.currentTarget");
    expect(source).toContain('event.key !== "Tab"');
  });
  it("shows exact personal and faction statistics", () => {
    for (const label of ["우리 진영 영토", "내 누적 점령", "내 누적 공격 성공", "내 누적 공격 시도", "자동 회복 없음"]) {
      expect(source).toContain(label);
    }
  });
  it("renders the admin link only behind the server-derived admin flag", () => {
    expect(source).toContain("isAdmin ?");
    expect(source).toContain('href="/admin"');
  });
});
