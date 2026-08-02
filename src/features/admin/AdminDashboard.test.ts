import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/features/admin/AdminDashboard.tsx", "utf8");

describe("minimal admin dashboard", () => {
  it("contains exactly seven SQL cards plus the online presence card", () => {
    expect(source.match(/\["(totalUsers|newUsersToday|newUsers7d|activeUsersToday|activeUsers7d|totalImageUploads|imageUploads24h)"/g)).toHaveLength(7);
    expect(source).toContain("현재 온라인 사용자");
  });
  it("provides access errors, skeletons, retry, refresh, and navigation", () => {
    for (const text of ["403", "통계 불러오는 중", "관리자 통계를 불러오지 못했습니다.", "재시도", "새로고침", "게임으로 돌아가기"]) expect(source).toContain(text);
  });
  it("uses responsive one, two, and four column layouts", () => {
    expect(source).toContain("grid-cols-1");
    expect(source).toContain("sm:grid-cols-2");
    expect(source).toContain("lg:grid-cols-4");
  });
});
