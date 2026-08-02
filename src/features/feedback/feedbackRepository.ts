import type { SupabaseClient } from "@supabase/supabase-js";

import { throwSupabaseQueryError } from "@/lib/supabase/errorDiagnostics";
import type { FeedbackDraft } from "./feedbackTypes";

export async function submitFeedbackReport(
  client: SupabaseClient,
  clientId: string,
  draft: FeedbackDraft,
): Promise<string> {
  const { data, error } = await client.rpc("submit_feedback_report", {
    p_client_id: clientId,
    p_category: draft.category,
    p_content: draft.content.trim(),
    p_contact_email: draft.contactEmail.trim() || null,
    p_page_url: draft.pageUrl.trim() || null,
    p_tile_id: draft.tileId.trim() || null,
    p_image_url: draft.imageUrl.trim() || null,
  });
  throwSupabaseQueryError("feedback.submit", error);
  if (typeof data !== "string") throw new Error("피드백 접수 결과를 확인할 수 없습니다.");
  return data;
}
