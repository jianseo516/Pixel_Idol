import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { adaptAdminSummary, isCurrentUserAdmin } from "./adminData";

describe("admin summary adapter", () => {
  it("normalizes PostgreSQL bigint values without changing meanings", () => {
    expect(adaptAdminSummary({ total_users: "10", new_users_today: 2, new_users_7d: "4", active_users_today: 3, active_users_7d: "7", total_image_uploads: "8", image_uploads_24h: 1 })).toEqual({
      totalUsers: 10, newUsersToday: 2, newUsers7d: 4, activeUsersToday: 3,
      activeUsers7d: 7, totalImageUploads: 8, imageUploads24h: 1,
    });
  });
  it("treats an absent admin row as a normal user", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    } as unknown as SupabaseClient;
    await expect(isCurrentUserAdmin(client)).resolves.toBe(false);
  });
});
