import { describe, expect, it } from "vitest";
import { classifyAuthAudience, isLegacyAnonymousUser } from "./authAudience";

describe("auth audience", () => {
  it("requires a non-anonymous Supabase user and profile", () => {
    expect(classifyAuthAudience({ is_anonymous: false }, true)).toBe("authenticated");
    expect(classifyAuthAudience({ is_anonymous: false }, false)).toBe("error");
  });
  it("treats legacy anonymous sessions as signed out", () => {
    expect(classifyAuthAudience({ is_anonymous: true }, null)).toBe("unauthenticated");
    expect(isLegacyAnonymousUser({ is_anonymous: true })).toBe(true);
    expect(classifyAuthAudience(null, null)).toBe("unauthenticated");
  });
});
