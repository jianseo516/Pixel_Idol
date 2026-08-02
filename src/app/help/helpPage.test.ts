import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/help/page.tsx", "utf8");

describe("help page", () => {
  it("is a public route with all required guidance sections", () => {
    for (const heading of ["게임 목표", "시작 방법", "점령과 공격", "공격 포인트", "대표 이미지", "실시간 플레이", "계정 안내", "운영 정책"]) {
      expect(source).toContain(heading);
    }
    expect(source).toContain("HelpAuthCta");
  });
  it("uses game and upload configuration instead of duplicating numeric rules", () => {
    expect(source).toContain("GAME_CONFIG.claimTokenCost");
    expect(source).toContain("GAME_CONFIG.maxTileHp");
    expect(source).toContain("IDOL_IMAGE_MAX_BYTES");
    expect(source).toContain("IDOL_IMAGE_UPLOAD_COOLDOWN_MS");
  });
});
