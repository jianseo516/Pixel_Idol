import { describe, expect, it, vi } from "vitest";

import {
  createExclusiveTaskRunner,
  createSingleFlightRunner,
  isActionCooldownActive,
  shouldResynchronizeAfterTileActionError,
  shouldSynchronizeOnVisibilityChange,
} from "@/features/game/data/requestControl";

describe("action request control", () => {
  it("rejects a second action inside 500ms and permits it after cooldown", () => {
    expect(isActionCooldownActive("2026-08-02T00:00:00.000Z", "2026-08-02T00:00:00.499Z")).toBe(true);
    expect(isActionCooldownActive("2026-08-02T00:00:00.000Z", "2026-08-02T00:00:00.500Z")).toBe(false);
  });

  it("does not change the previous action time when a task fails", async () => {
    const previous = "2026-08-02T00:00:00.000Z";
    const runner = createExclusiveTaskRunner();
    await expect(runner.tryRun(async () => { throw new Error("검증 실패"); })).rejects.toThrow("검증 실패");
    expect(previous).toBe("2026-08-02T00:00:00.000Z");
    expect(runner.isPending()).toBe(false);
  });

  it("blocks a duplicate mutation while the first mutation is pending", async () => {
    let release: (() => void) | undefined;
    const runner = createExclusiveTaskRunner();
    const first = runner.tryRun(() => new Promise<number>((resolve) => { release = () => resolve(1); }));
    const duplicate = await runner.tryRun(async () => 2);
    expect(duplicate).toEqual({ started: false, value: null });
    release?.();
    await expect(first).resolves.toEqual({ started: true, value: 1 });
  });

  it("deduplicates repeated synchronization requests", async () => {
    let release: (() => void) | undefined;
    const task = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    const runner = createSingleFlightRunner();
    const first = runner.run(task);
    const second = runner.run(task);
    expect(first).toBe(second);
    expect(task).toHaveBeenCalledTimes(1);
    release?.();
    await first;
  });

  it("synchronizes once only when visibility returns", () => {
    expect(shouldSynchronizeOnVisibilityChange("hidden", "visible")).toBe(true);
    expect(shouldSynchronizeOnVisibilityChange("visible", "visible")).toBe(false);
  });

  it("resynchronizes conflict errors but not ordinary validation errors", () => {
    expect(shouldResynchronizeAfterTileActionError(new Error("빈 영토만 점령할 수 있습니다."))).toBe(true);
    expect(shouldResynchronizeAfterTileActionError(new Error("내 영토입니다."))).toBe(true);
    expect(shouldResynchronizeAfterTileActionError(new Error("토큰이 부족합니다."))).toBe(false);
    expect(shouldResynchronizeAfterTileActionError(new Error("너무 빠르게 행동하고 있습니다. 잠시 후 다시 시도해 주세요."))).toBe(false);
  });
});
