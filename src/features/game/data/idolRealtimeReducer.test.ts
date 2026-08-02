import { describe, expect, it } from "vitest";
import { reduceIdolRealtimeUpdate } from "./idolRealtimeReducer";

describe("idol Realtime reducer", () => {
  it("replaces one idol without touching tiles or tokens", () => {
    const idols = { bts: { id: "bts", name: "BTS", color: "#000000", representativeImageSrc: "/old" }, ive: { id: "ive", name: "IVE", color: "#ffffff", representativeImageSrc: "/ive" } };
    const untouched = idols.ive;
    const next = reduceIdolRealtimeUpdate(idols, { id: "bts", name: "BTS", color: "#000000", representative_image_src: "/new" });
    expect(next.bts.representativeImageSrc).toBe("/new");
    expect(next.ive).toBe(untouched);
    expect(idols.bts.representativeImageSrc).toBe("/old");
  });
});
