"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { IdolSelector } from "@/features/game/components/IdolSelector";
import { TileInfoPanel, type GameActionMessage } from "@/features/game/components/TileInfoPanel";
import { TileMapCanvas } from "@/features/game/components/TileMapCanvas";
import { TerritorySummaryPanel } from "@/features/game/components/TerritorySummaryPanel";
import { useSupabaseGame } from "@/features/game/hooks/useSupabaseGame";
import { getTileActionPreview } from "@/features/game/logic/actionPreview";
import { getActionableTiles } from "@/features/game/logic/actionableTiles";
import { getStoredTile, getTile } from "@/features/game/logic/coordinates";
import { getAllIdolTerritorySummaries } from "@/features/game/logic/territories";
import { getTerritoryBoundarySegments } from "@/features/game/logic/territoryBoundary";
import { createRepresentativeLayerSpecs } from "@/features/game/rendering/representativeImage";
import { getOwnedTerritoryWorldCenter } from "@/features/game/rendering/viewport";
import type { Coordinate, Idol } from "@/features/game/types/game";

export function GamePrototype() {
  const remote = useSupabaseGame();
  const gameState = remote.gameState;
  const [selectedCoordinate, setSelectedCoordinate] = useState<Coordinate | null>(null);
  const [actionMessage, setActionMessage] = useState<GameActionMessage | null>(null);

  const idols = useMemo(() => Object.values(gameState?.idols ?? {}), [gameState]);
  const territoryCenter = useMemo(
    () => gameState
      ? getOwnedTerritoryWorldCenter(gameState, gameState.supportedIdolId)
      : { x: 0, y: 0 },
    [gameState],
  );
  const selectedTile = useMemo(
    () => gameState && selectedCoordinate ? getTile(gameState, selectedCoordinate) ?? null : null,
    [gameState, selectedCoordinate],
  );
  const selectedOwner = selectedTile?.ownerId && gameState
    ? gameState.idols[selectedTile.ownerId] ?? null
    : null;
  const actionPreview = useMemo(
    () => gameState && selectedCoordinate
      ? getTileActionPreview(gameState, selectedCoordinate)
      : null,
    [gameState, selectedCoordinate],
  );
  const actionableTiles = useMemo(
    () => gameState ? getActionableTiles(gameState) : { claimable: [], attackable: [] },
    [gameState],
  );
  const territorySummaries = useMemo(
    () => gameState ? getAllIdolTerritorySummaries(gameState) : {},
    [gameState],
  );
  const supportedSummary = useMemo(
    () => gameState
      ? territorySummaries[gameState.supportedIdolId] ?? {
          ownerId: gameState.supportedIdolId,
          regions: [],
          largestRegion: null,
          totalTileCount: 0,
        }
      : { ownerId: "", regions: [], largestRegion: null, totalTileCount: 0 },
    [gameState, territorySummaries],
  );
  const representativeBoundary = useMemo(
    () => getTerritoryBoundarySegments(supportedSummary?.largestRegion?.coordinates ?? []),
    [supportedSummary],
  );
  const representativeLayerSpecs = useMemo(
    () => gameState
      ? createRepresentativeLayerSpecs(territorySummaries, gameState.idols)
      : [],
    [gameState, territorySummaries],
  );

  const handleSelect = useCallback((coordinate: Coordinate) => {
    setSelectedCoordinate(coordinate);
    setActionMessage(null);
  }, []);
  const handleClear = useCallback(() => {
    setSelectedCoordinate(null);
    setActionMessage(null);
  }, []);
  const handleIdolChange = useCallback((idolId: Idol["id"]) => {
    setActionMessage(null);
    void remote.changeSupportedIdol(idolId).catch((error: unknown) => {
      setActionMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "응원 아이돌 변경에 실패했습니다.",
      });
    });
  }, [remote]);

  const handleAction = useCallback(async () => {
    if (!gameState || !selectedCoordinate || !actionPreview?.allowed || remote.isPending) return;
    const previousOwnerId = getStoredTile(gameState, selectedCoordinate)?.ownerId;
    try {
      const changedTile = await (actionPreview.actionType === "CLAIM"
        ? remote.claimTile(selectedCoordinate)
        : remote.attackTile(selectedCoordinate));
      if (!changedTile) return;
      if (actionPreview.actionType === "CLAIM") {
        setActionMessage({ kind: "success", text: "빈 영토를 점령했습니다." });
        return;
      }
      const nextOwnerId = changedTile.owner_id;
      const captured = previousOwnerId !== nextOwnerId && nextOwnerId === gameState.supportedIdolId;
      setActionMessage({
        kind: "success",
        text: captured
          ? "공격에 성공하여 영토를 점령했습니다."
          : "상대 영토를 공격했습니다.",
      });
    } catch (error) {
      setActionMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "행동 처리에 실패했습니다.",
      });
    }
  }, [actionPreview, gameState, remote, selectedCoordinate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.repeat || !actionPreview?.allowed) return;
      const target = event.target;
      if (target instanceof Element && target.closest("button, input, select, textarea, [contenteditable='true']")) return;
      event.preventDefault();
      void handleAction();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actionPreview?.allowed, handleAction]);

  if (remote.status === "error") {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-950 p-6 text-slate-100">
        <section className="max-w-lg rounded-2xl border border-rose-400/30 bg-slate-900 p-6">
          <h1 className="text-xl font-black">공동 플레이 데이터를 불러오지 못했습니다.</h1>
          <p className="mt-3 text-sm text-rose-200">{remote.errorMessage}</p>
          <button type="button" className="mt-5 rounded-lg bg-rose-500 px-4 py-2 font-bold" onClick={() => void remote.retry()}>다시 시도</button>
        </section>
      </main>
    );
  }
  if (!gameState) {
    return <main className="grid min-h-dvh place-items-center bg-slate-950 text-slate-200">공동 플레이에 연결하는 중입니다…</main>;
  }

  const supportedIdol = gameState.idols[gameState.supportedIdolId];
  const realtimeLabels = {
    connecting: "연결 중",
    connected: "실시간 연결됨",
    reconnecting: "재연결 중",
    error: "실시간 오류",
  } as const;
  const realtimeColors = {
    connecting: "bg-amber-400",
    connected: "bg-emerald-400",
    reconnecting: "bg-orange-400",
    error: "bg-rose-500",
  } as const;
  return (
    <main className="flex min-h-dvh flex-col bg-slate-950 text-slate-100 lg:h-dvh lg:overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
        <div><p className="text-xs font-semibold tracking-[0.22em] text-rose-400 uppercase">Pixel Idol</p><h1 className="mt-1 text-xl font-black sm:text-2xl">아이돌 픽셀</h1></div>
        <IdolSelector idols={idols} selectedId={gameState.supportedIdolId} onChange={handleIdolChange} />
        <TerritorySummaryPanel idol={supportedIdol} summary={supportedSummary} />
        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs">
          <span className={`size-2.5 rounded-full ${realtimeColors[remote.realtimeStatus]}`} aria-hidden="true" />
          <span className="font-semibold text-slate-200">{realtimeLabels[remote.realtimeStatus]}</span>
          <button
            type="button"
            className="rounded-md border border-slate-600 px-2 py-1 font-bold hover:bg-slate-800 disabled:opacity-50"
            disabled={remote.isSynchronizing}
            onClick={() => void remote.synchronizeTiles().catch(() => undefined)}
          >
            {remote.isSynchronizing ? "동기화 중" : "동기화"}
          </button>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2">
          <span className="size-3 rounded-full" style={{ backgroundColor: supportedIdol?.color }} aria-hidden="true" />
          <div className="text-right"><p className="text-xs text-slate-500">응원 중</p><p className="text-sm font-bold">{supportedIdol?.name}</p></div>
        </div>
      </header>
      <section className="grid min-w-0 flex-1 gap-3 p-3 sm:p-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_288px]">
        <div className="relative h-[65dvh] min-h-0 min-w-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/30 lg:h-full">
          <TileMapCanvas state={gameState} selectedCoordinate={selectedCoordinate} initialFocusWorldPoint={territoryCenter} actionableTiles={actionableTiles} representativeBoundary={representativeBoundary} representativeLayerSpecs={representativeLayerSpecs} onSelect={handleSelect} />
        </div>
        <TileInfoPanel selectedTile={selectedTile} owner={selectedOwner} tokens={gameState.tokens} preview={actionPreview} actionMessage={actionMessage} isPending={remote.isPending} onAction={() => void handleAction()} onClear={handleClear} />
      </section>
      <p className="shrink-0 border-t border-slate-800 px-4 py-2 text-center text-[11px] text-slate-500">
        공개 데모의 안정성을 위해 행동 간 짧은 대기 시간이 적용됩니다. · 본 서비스는 비공식 팬 제작 프로토타입이며 각 아티스트 및 소속사와 관련이 없습니다. 현재 대표 이미지는 직접 제작한 워드마크 목업입니다.
      </p>
    </main>
  );
}
