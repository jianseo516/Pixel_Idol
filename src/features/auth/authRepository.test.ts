import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clearLegacyAnonymousSession, isPermanentUser, signInWithNickname, signOut } from "./authRepository";

describe("auth repository", () => {
  it("distinguishes permanent and anonymous users", () => {
    expect(isPermanentUser(null)).toBe(false);
    expect(isPermanentUser({ is_anonymous: true })).toBe(false);
    expect(isPermanentUser({ is_anonymous: false })).toBe(true);
  });
  it("returns the same safe message for failed login", async () => {
    const client = { auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: { message: "internal email leaked" } }) } } as unknown as SupabaseClient;
    await expect(signInWithNickname(client, "tester", "password1")).rejects.toThrow("닉네임 또는 비밀번호가 올바르지 않습니다.");
  });
  it("signs out through Supabase Auth", async () => {
    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    await signOut({ auth: { signOut: signOutMock } } as unknown as SupabaseClient);
    expect(signOutMock).toHaveBeenCalledOnce();
  });
  it("clears a legacy anonymous session locally", async () => {
    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    const client = { auth: { signOut: signOutMock } } as unknown as SupabaseClient;
    await expect(clearLegacyAnonymousSession(client, { is_anonymous: true })).resolves.toBe(true);
    expect(signOutMock).toHaveBeenCalledWith({ scope: "local" });
  });
});
