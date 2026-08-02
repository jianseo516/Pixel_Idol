export const FEEDBACK_CATEGORIES = ["bug", "suggestion", "image_report", "other"] as const;
export const FEEDBACK_STATUSES = ["new", "reviewing", "resolved", "rejected"] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export interface FeedbackDraft {
  readonly category: FeedbackCategory;
  readonly content: string;
  readonly contactEmail: string;
  readonly pageUrl: string;
  readonly tileId: string;
  readonly imageUrl: string;
}

export interface FeedbackReport {
  readonly id: string;
  readonly user_id: string | null;
  readonly nickname: string | null;
  readonly category: FeedbackCategory;
  readonly content: string;
  readonly contact_email: string | null;
  readonly page_url: string | null;
  readonly tile_id: string | null;
  readonly image_url: string | null;
  readonly status: FeedbackStatus;
  readonly admin_note: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "오류 신고",
  suggestion: "기능 건의",
  image_report: "부적절한 이미지 신고",
  other: "기타",
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: "신규",
  reviewing: "검토 중",
  resolved: "처리 완료",
  rejected: "반려",
};
