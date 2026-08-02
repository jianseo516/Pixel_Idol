import { describe, expect, it } from "vitest";
import { consumeMyPageQuery } from "./myPageNavigation";

describe("my page navigation", () => {
  it("opens the modal and removes only its one-shot query", () => {
    expect(consumeMyPageQuery("/", "?mypage=1&from=help")).toEqual({
      shouldOpen: true,
      cleanedPath: "/?from=help",
    });
  });
  it("does not open for other values", () => {
    expect(consumeMyPageQuery("/", "?mypage=0").shouldOpen).toBe(false);
  });
});
