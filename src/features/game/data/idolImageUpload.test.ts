import { describe, expect, it } from "vitest";
import { canSubmitIdolImage, createIdolImageStoragePath, getIdolImageStoragePathDetails, IDOL_IMAGE_MAX_BYTES, isIdolImageUploadCooldownActive, releaseObjectUrl, validateIdolImageFile } from "./idolImageUpload";

const validDimensions = { width: 800, height: 600, decoded: true };
describe("idol image validation", () => {
  it.each(["image/png", "image/jpeg", "image/webp"])("allows %s", (type) => {
    expect(validateIdolImageFile({ name: "anything", type, size: 1000 }, validDimensions).valid).toBe(true);
  });
  it.each([
    ["image/png", 32, 32],
    ["image/webp", 64, 128],
    ["image/png", 299, 299],
  ])("allows a decodable small %s image at %d×%d", (type, width, height) => {
    expect(validateIdolImageFile(
      { name: "pixel-art", type, size: 1000 },
      { width, height, decoded: true },
    ).valid).toBe(true);
  });
  it.each(["image/svg+xml", "image/gif", "application/pdf", "image/heic", "video/mp4"])("blocks %s", (type) => {
    expect(validateIdolImageFile({ name: "x", type, size: 1000 }, validDimensions).valid).toBe(false);
  });
  it("validates bytes, decoding and positive dimensions", () => {
    expect(validateIdolImageFile({ name: "x", type: "image/png", size: IDOL_IMAGE_MAX_BYTES + 1 }, validDimensions).valid).toBe(false);
    expect(validateIdolImageFile({ name: "x", type: "image/png", size: 1 }, { width: 0, height: 300, decoded: false }).valid).toBe(false);
    expect(validateIdolImageFile({ name: "x", type: "image/png", size: 1 }, { width: 0, height: 32, decoded: true }).valid).toBe(false);
    expect(validateIdolImageFile({ name: "x", type: "image/png", size: 1 }, { width: 32, height: 0, decoded: true }).valid).toBe(false);
    expect(validateIdolImageFile({ name: "x", type: "image/png", size: 1 }, { width: 300, height: 5001, decoded: true }).valid).toBe(false);
  });
  it("creates UUID paths without original filenames", () => {
    const id = "123e4567-e89b-42d3-a456-426614174000";
    const userId = "9cb5d0bd-0c07-417f-b937-12bfd7607c12";
    expect(createIdolImageStoragePath({ userId, seasonId: "season-1", idolId: "bts", submissionId: id, mimeType: "image/jpeg" }))
      .toBe(`${userId}/season-1/bts/${id}.jpg`);
    expect(() => createIdolImageStoragePath({ userId, seasonId: "../x", idolId: "bts", submissionId: id, mimeType: "image/png" })).toThrow();
    expect(() => createIdolImageStoragePath({ userId: "another-user", seasonId: "season-1", idolId: "bts", submissionId: id, mimeType: "image/png" })).toThrow();
  });
  it("uses unique UUID filenames for repeated uploads", () => {
    const userId = "9cb5d0bd-0c07-417f-b937-12bfd7607c12";
    const first = createIdolImageStoragePath({ userId, seasonId: "season-1", idolId: "bts", submissionId: "123e4567-e89b-42d3-a456-426614174000", mimeType: "image/png" });
    const second = createIdolImageStoragePath({ userId, seasonId: "season-1", idolId: "bts", submissionId: "123e4567-e89b-42d3-a456-426614174001", mimeType: "image/png" });
    expect(first).not.toBe(second);
  });
  it("reports the exact safe path segments without authentication tokens", () => {
    const details = getIdolImageStoragePathDetails({
      userId: "9cb5d0bd-0c07-417f-b937-12bfd7607c12",
      seasonId: "season-1",
      idolId: "le-sserafim",
      submissionId: "123e4567-e89b-42d3-a456-426614174000",
      mimeType: "image/webp",
    });
    expect(details).toEqual({
      userId: "9cb5d0bd-0c07-417f-b937-12bfd7607c12",
      seasonId: "season-1",
      idolId: "le-sserafim",
      submissionId: "123e4567-e89b-42d3-a456-426614174000",
      mimeType: "image/webp",
      extension: "webp",
      storagePath: "9cb5d0bd-0c07-417f-b937-12bfd7607c12/season-1/le-sserafim/123e4567-e89b-42d3-a456-426614174000.webp",
    });
    expect(details).not.toHaveProperty("accessToken");
    expect(details).not.toHaveProperty("jwt");
  });
  it("requires confirmation and blocks duplicate submissions", () => {
    expect(canSubmitIdolImage({ hasValidImage: true, confirmed: false, pending: false, remainingSeconds: 0 })).toBe(false);
    expect(canSubmitIdolImage({ hasValidImage: true, confirmed: true, pending: true, remainingSeconds: 0 })).toBe(false);
    expect(canSubmitIdolImage({ hasValidImage: true, confirmed: true, pending: false, remainingSeconds: 1 })).toBe(false);
    expect(canSubmitIdolImage({ hasValidImage: true, confirmed: true, pending: false, remainingSeconds: 0 })).toBe(true);
  });
  it("releases a previous object URL", () => {
    const released: string[] = [];
    releaseObjectUrl("blob:old", (url) => released.push(url));
    expect(released).toEqual(["blob:old"]);
  });
  it("blocks uploads inside 60 seconds and permits them at 60 seconds", () => {
    expect(isIdolImageUploadCooldownActive("2026-08-02T00:00:00.000Z", "2026-08-02T00:00:59.999Z")).toBe(true);
    expect(isIdolImageUploadCooldownActive("2026-08-02T00:00:00.000Z", "2026-08-02T00:01:00.000Z")).toBe(false);
  });
});
