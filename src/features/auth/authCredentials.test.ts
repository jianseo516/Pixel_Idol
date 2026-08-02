import { describe, expect, it } from "vitest";
import { getLoginErrorMessage, nicknameToInternalEmail, normalizeNickname, validateNickname, validatePassword } from "./authCredentials";

describe("nickname credentials", () => {
  it("normalizes whitespace, Unicode, and English casing", () => {
    expect(normalizeNickname("  Seo_JIAN  ")).toBe("seo_jian");
    expect(validateNickname("서지안").valid).toBe(true);
  });
  it.each(["a", "abcdefghijklmnopq", "hello world", "nick!name"])("rejects invalid nickname %s", (nickname) => {
    expect(validateNickname(nickname).valid).toBe(false);
  });
  it("creates stable distinct email-safe identifiers", () => {
    const first = nicknameToInternalEmail(normalizeNickname("서지안"));
    expect(first).toBe(nicknameToInternalEmail(normalizeNickname("서지안")));
    expect(first).not.toBe(nicknameToInternalEmail(normalizeNickname("서지민")));
    expect(first).toMatch(/^[A-Za-z0-9_-]+@pixel-idol\.local$/);
  });
  it("validates password strength and confirmation without exposing input", () => {
    expect(validatePassword("password")).not.toBeNull();
    expect(validatePassword("password1", "password2")).toBe("비밀번호 확인이 일치하지 않습니다.");
    expect(validatePassword("password1", "password1")).toBeNull();
  });
  it("uses one login failure message", () => {
    expect(getLoginErrorMessage()).toBe("닉네임 또는 비밀번호가 올바르지 않습니다.");
  });
});
