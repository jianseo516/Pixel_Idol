import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hookSource = readFileSync("src/features/game/hooks/useSupabaseGame.ts", "utf8");
const gameSource = readFileSync("src/features/game/components/GamePrototype.tsx", "utf8");
const panelSource = readFileSync("src/features/game/components/TileInfoPanel.tsx", "utf8");

describe("signed-out personal state", () => {
  it("clears every in-memory personal account field", () => {
    const clearBlock = hookSource.match(/const clearPersonalState[\s\S]*?\n  }, \[\]\);/)?.[0] ?? "";
    expect(clearBlock).toContain("setUser(null)");
    expect(clearBlock).toContain("setProfile(null)");
    expect(clearBlock).toContain("setPlayer(null)");
    expect(clearBlock).toContain("setIsAdmin(false)");
    expect(clearBlock).toContain("setIsUploadingImage(false)");
    expect(clearBlock).toContain("tokens: 0");
  });

  it("clears immediately on the SIGNED_OUT auth event", () => {
    expect(hookSource).toMatch(/event === "SIGNED_OUT"[\s\S]*clearPersonalState\(\)[\s\S]*setAuthStatus\("unauthenticated"\)/);
  });

  it("ignores account and mutation responses from an older auth generation", () => {
    expect(hookSource.match(/isCurrentAuthRequest/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(hookSource).toContain("authGenerationRef.current += 1");
  });

  it("does not expose a public snapshot fallback as a supported idol", () => {
    expect(hookSource).toContain('authStatus === "authenticated" ? player?.supported_idol_id ?? null : null');
    expect(gameSource).toContain("selectedId={personalSupportedIdolId}");
    expect(gameSource).toContain("로그인 후 응원 아이돌을 선택할 수 있습니다.");
  });

  it("hides points, my page, personal navigation, and uploads while signed out", () => {
    expect(panelSource).toContain("isAuthenticated && tokens !== null");
    expect(gameSource).toContain("showPersonalNavigation={remote.isAuthenticated}");
    expect(gameSource).toContain("remote.isAuthenticated && remote.profile && remote.player");
    expect(gameSource).toContain("supportedIdol && remote.isAuthenticated");
  });

  it("keeps the public map and representative layers rendered", () => {
    expect(gameSource).toContain("createRepresentativeLayerSpecs(territorySummaries, gameState.idols)");
    expect(gameSource).toContain("<TileMapCanvas state={gameState}");
  });
});
