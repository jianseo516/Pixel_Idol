import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/features/admin/FeedbackAdminPanel.tsx", "utf8");
const preview = readFileSync("src/features/admin/FeedbackImagePreview.tsx", "utf8");

describe("feedback admin panel", () => {
  it("supports category and status filters with latest report details", () => {
    expect(source).toContain("FEEDBACK_CATEGORIES");
    expect(source).toContain("FEEDBACK_STATUSES");
    expect(source).toContain("admin_note");
    expect(source).toContain("contact_email");
    expect(source).toContain("created_at");
  });
  it("supports status updates, notes, and explicit deletion", () => {
    expect(source).toContain("updateAdminFeedbackReport");
    expect(source).toContain("deleteAdminFeedbackReport");
    expect(source).toContain("window.confirm");
  });
  it("uses safe external links and an image fallback", () => {
    expect(source).toContain("isSafeFeedbackLink");
    expect(source).toContain('rel="noreferrer noopener"');
    expect(preview).toContain("이미지 미리보기를 불러오지 못했습니다");
  });
});
