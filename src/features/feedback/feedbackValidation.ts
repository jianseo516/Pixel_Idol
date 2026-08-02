import type { FeedbackDraft } from "./feedbackTypes";

export const FEEDBACK_MIN_CONTENT_LENGTH = 10;
export const FEEDBACK_MAX_CONTENT_LENGTH = 2000;
export const FEEDBACK_COOLDOWN_MS = 60_000;
export const FEEDBACK_CLIENT_ID_KEY = "pixel-idol-feedback-client-id";
export const FEEDBACK_LAST_SUBMITTED_AT_KEY = "pixel-idol-feedback-last-submitted-at";
export const BETA_NOTICE_DISMISSED_KEY = "pixel-idol-beta-notice-dismissed";

const EMAIL_PATTERN = /^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateFeedbackDraft(draft: FeedbackDraft): string | null {
  const length = draft.content.trim().length;
  if (length < FEEDBACK_MIN_CONTENT_LENGTH || length > FEEDBACK_MAX_CONTENT_LENGTH) {
    return `내용은 ${FEEDBACK_MIN_CONTENT_LENGTH}자 이상 ${FEEDBACK_MAX_CONTENT_LENGTH}자 이하로 입력해 주세요.`;
  }
  const email = draft.contactEmail.trim();
  if (email && (email.length > 320 || !EMAIL_PATTERN.test(email))) {
    return "올바른 이메일 형식을 입력해 주세요.";
  }
  if (draft.pageUrl.length > 2048 || draft.imageUrl.length > 2048 || draft.tileId.length > 128) {
    return "관련 정보가 허용 길이를 초과했습니다.";
  }
  return null;
}

export function getOrCreateFeedbackClientId(
  storage: Pick<Storage, "getItem" | "setItem">,
  createId: () => string,
): string {
  const stored = storage.getItem(FEEDBACK_CLIENT_ID_KEY);
  if (stored && UUID_PATTERN.test(stored)) return stored;
  const created = createId();
  if (!UUID_PATTERN.test(created)) throw new Error("피드백 제출 식별자를 만들 수 없습니다.");
  storage.setItem(FEEDBACK_CLIENT_ID_KEY, created);
  return created;
}

export function getFeedbackCooldownRemaining(
  lastSubmittedAt: string | null,
  now: number,
): number {
  if (!lastSubmittedAt) return 0;
  const elapsed = now - Number(lastSubmittedAt);
  if (!Number.isFinite(elapsed)) return 0;
  return Math.max(0, FEEDBACK_COOLDOWN_MS - elapsed);
}

export function isSafeFeedbackLink(url: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
