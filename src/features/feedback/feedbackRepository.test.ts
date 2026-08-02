import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { submitFeedbackReport } from "./feedbackRepository";

const draft = { category: "suggestion" as const, content: "새로운 기능을 제안합니다.", contactEmail: "", pageUrl: "https://example.com", tileId: "", imageUrl: "" };

describe("feedback repository", () => {
  it("uses the same safe RPC for signed-in and signed-out clients", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "report-id", error: null });
    const client = { rpc } as unknown as SupabaseClient;
    await expect(submitFeedbackReport(client, "123e4567-e89b-42d3-a456-426614174000", draft)).resolves.toBe("report-id");
    expect(rpc).toHaveBeenCalledWith("submit_feedback_report", expect.objectContaining({
      p_category: "suggestion",
      p_contact_email: null,
    }));
  });
});
