import { describe, expect, it } from "vitest";
import { countUniqueOnlineUsers } from "./presence";

describe("online presence", () => {
  it("counts the same user key once across multiple tabs", () => {
    expect(countUniqueOnlineUsers({ userA: [{ tab: 1 }, { tab: 2 }], userB: [{ tab: 1 }] })).toBe(2);
  });
  it("ignores empty presence keys", () => {
    expect(countUniqueOnlineUsers({ userA: [] })).toBe(0);
  });
});
