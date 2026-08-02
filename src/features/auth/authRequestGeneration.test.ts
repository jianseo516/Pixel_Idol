import { describe, expect, it } from "vitest";

import { isCurrentAuthRequest } from "./authRequestGeneration";

describe("auth request generation", () => {
  it("accepts the latest request", () => {
    expect(isCurrentAuthRequest(4, 4)).toBe(true);
  });

  it("rejects a response started before sign-out or another login", () => {
    expect(isCurrentAuthRequest(4, 5)).toBe(false);
  });
});
