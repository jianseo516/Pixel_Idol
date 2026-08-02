import { describe, expect, it, vi } from "vitest";
import { cleanupFailedIdolImageUpload } from "./gameRepository";

describe("failed idol image upload cleanup", () => {
  it("deletes only the exact newly uploaded path", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const storagePath = "user-id/season-1/bts/submission-id.png";
    await cleanupFailedIdolImageUpload({ remove }, storagePath);
    expect(remove).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith([storagePath]);
  });

  it("does not throw when compensating cleanup fails", async () => {
    const remove = vi.fn().mockResolvedValue({ error: { code: "403", message: "denied" } });
    await expect(cleanupFailedIdolImageUpload(
      { remove },
      "user-id/season-1/bts/submission-id.png",
    )).resolves.toBeUndefined();
  });
});
