import { describe, expect, it } from "vitest";

import type { FeedbackDraft } from "./feedbackTypes";
import {
  BETA_NOTICE_DISMISSED_KEY,
  FEEDBACK_CLIENT_ID_KEY,
  FEEDBACK_COOLDOWN_MS,
  getFeedbackCooldownRemaining,
  getOrCreateFeedbackClientId,
  isSafeFeedbackLink,
  validateFeedbackDraft,
} from "./feedbackValidation";

const draft: FeedbackDraft = {
  category: "bug",
  content: "오류가 반복해서 발생합니다.",
  contactEmail: "",
  pageUrl: "https://example.com/game",
  tileId: "season-1:1:2",
  imageUrl: "",
};
const clientId = "123e4567-e89b-42d3-a456-426614174000";

describe("feedback validation and client throttling", () => {
  it("accepts valid logged-in or signed-out form values", () => {
    expect(validateFeedbackDraft(draft)).toBeNull();
  });
  it("rejects content shorter than 10 or longer than 2000 characters", () => {
    expect(validateFeedbackDraft({ ...draft, content: "짧음" })).toContain("10자");
    expect(validateFeedbackDraft({ ...draft, content: "가".repeat(2001) })).toContain("2000자");
  });
  it("rejects malformed optional email addresses", () => {
    expect(validateFeedbackDraft({ ...draft, contactEmail: "wrong-address" })).toContain("이메일");
  });
  it("creates and reuses an anonymous rate-limit id", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(getOrCreateFeedbackClientId(storage, () => clientId)).toBe(clientId);
    expect(values.get(FEEDBACK_CLIENT_ID_KEY)).toBe(clientId);
    expect(getOrCreateFeedbackClientId(storage, () => crypto.randomUUID())).toBe(clientId);
  });
  it("enforces a 60 second browser cooldown", () => {
    expect(getFeedbackCooldownRemaining("1000", 1000 + FEEDBACK_COOLDOWN_MS - 1)).toBe(1);
    expect(getFeedbackCooldownRemaining("1000", 1000 + FEEDBACK_COOLDOWN_MS)).toBe(0);
  });
  it("allows only http links in admin link actions", () => {
    expect(isSafeFeedbackLink("https://example.com/image.png")).toBe(true);
    expect(isSafeFeedbackLink("javascript:alert(1)")).toBe(false);
  });
  it("uses the specified beta dismissal key", () => {
    expect(BETA_NOTICE_DISMISSED_KEY).toBe("pixel-idol-beta-notice-dismissed");
  });
});
