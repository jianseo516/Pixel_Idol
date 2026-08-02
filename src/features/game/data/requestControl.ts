export const ACTION_COOLDOWN_MS = 500;

export interface ExclusiveTaskResult<Result> {
  readonly started: boolean;
  readonly value: Result | null;
}

export function isActionCooldownActive(
  lastActionAt: string | null,
  now: string,
  cooldownMs = ACTION_COOLDOWN_MS,
): boolean {
  if (!lastActionAt) return false;
  return Date.parse(now) - Date.parse(lastActionAt) < cooldownMs;
}

export function createExclusiveTaskRunner() {
  let pending = false;
  return {
    isPending: () => pending,
    async tryRun<Result>(task: () => Promise<Result>): Promise<ExclusiveTaskResult<Result>> {
      if (pending) return { started: false, value: null };
      pending = true;
      try {
        return { started: true, value: await task() };
      } finally {
        pending = false;
      }
    },
  };
}

export function createSingleFlightRunner() {
  let inFlight: Promise<void> | null = null;
  return {
    run(task: () => Promise<void>): Promise<void> {
      if (inFlight) return inFlight;
      inFlight = task().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
    isRunning: () => inFlight !== null,
  };
}

const TILE_CONFLICT_MESSAGES = [
  "빈 영토만 점령할 수 있습니다.",
  "상대 아이돌 소유 타일만 공격할 수 있습니다.",
  "내 영토입니다.",
  "내 영토와 상하좌우로 인접해야 합니다.",
] as const;

export function shouldResynchronizeAfterTileActionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return TILE_CONFLICT_MESSAGES.some((candidate) => message.includes(candidate));
}

export function shouldSynchronizeOnVisibilityChange(
  previous: DocumentVisibilityState,
  next: DocumentVisibilityState,
): boolean {
  return previous !== "visible" && next === "visible";
}
