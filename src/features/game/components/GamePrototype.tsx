"use client";

import { useCallback, useMemo, useState } from "react";

import { IdolSelector } from "@/features/game/components/IdolSelector";
import {
  TileInfoPanel,
  type GameActionMessage,
} from "@/features/game/components/TileInfoPanel";
import { TileMapCanvas } from "@/features/game/components/TileMapCanvas";
import { getTileActionPreview } from "@/features/game/logic/actionPreview";
import { getActionableTiles } from "@/features/game/logic/actionableTiles";
import { attackTile, claimTile } from "@/features/game/logic/actions";
import { getStoredTile, getTile } from "@/features/game/logic/coordinates";
import { changeSupportedIdol } from "@/features/game/logic/gameState";
import { createInitialGameState } from "@/features/game/mock/createInitialGame";
import { getOwnedTerritoryWorldCenter } from "@/features/game/rendering/viewport";
import type { Coordinate, Idol } from "@/features/game/types/game";

export function GamePrototype() {
  const [gameState, setGameState] = useState(createInitialGameState);
  const [selectedCoordinate, setSelectedCoordinate] =
    useState<Coordinate | null>(null);
  const [actionMessage, setActionMessage] =
    useState<GameActionMessage | null>(null);

  const supportedIdol = gameState.idols[gameState.supportedIdolId];
  const idols = useMemo(() => Object.values(gameState.idols), [gameState.idols]);
  const territoryCenter = useMemo(
    () => getOwnedTerritoryWorldCenter(gameState, gameState.supportedIdolId),
    [gameState],
  );
  const selectedTile = useMemo(
    () =>
      selectedCoordinate
        ? getTile(gameState, selectedCoordinate) ?? null
        : null,
    [gameState, selectedCoordinate],
  );
  const selectedOwner = selectedTile?.ownerId
    ? gameState.idols[selectedTile.ownerId] ?? null
    : null;
  const actionPreview = useMemo(
    () =>
      selectedCoordinate
        ? getTileActionPreview(gameState, selectedCoordinate)
        : null,
    [gameState, selectedCoordinate],
  );
  const actionableTiles = useMemo(
    () => getActionableTiles(gameState),
    [gameState],
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
    setGameState((current) => changeSupportedIdol(current, idolId));
    setActionMessage(null);
  }, []);

  const handleAction = useCallback(() => {
    if (!selectedCoordinate || !actionPreview?.allowed) {
      return;
    }

    const previousOwnerId = getStoredTile(
      gameState,
      selectedCoordinate,
    )?.ownerId;
    const result =
      actionPreview.actionType === "CLAIM"
        ? claimTile(gameState, selectedCoordinate)
        : attackTile(gameState, selectedCoordinate);

    if (!result.ok) {
      setActionMessage({ kind: "error", text: result.error.message });
      return;
    }

    setGameState(result.state);
    if (actionPreview.actionType === "CLAIM") {
      setActionMessage({ kind: "success", text: "빈 영토를 점령했습니다." });
      return;
    }

    const captured =
      previousOwnerId !== result.tile.ownerId &&
      result.tile.ownerId === gameState.supportedIdolId;
    setActionMessage({
      kind: "success",
      text: captured
        ? "공격에 성공하여 영토를 점령했습니다."
        : "상대 영토를 공격했습니다.",
    });
  }, [actionPreview, gameState, selectedCoordinate]);

  return (
    <main className="flex min-h-dvh flex-col bg-slate-950 text-slate-100 lg:h-dvh lg:overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-rose-400 uppercase">
            Pixel Idol
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
            아이돌 픽셀
          </h1>
        </div>

        <IdolSelector
          idols={idols}
          selectedId={gameState.supportedIdolId}
          onChange={handleIdolChange}
        />

        <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2">
          <span
            className="size-3 rounded-full"
            style={{ backgroundColor: supportedIdol?.color }}
            aria-hidden="true"
          />
          <div className="text-right">
            <p className="text-xs text-slate-500">응원 중</p>
            <p className="text-sm font-bold">{supportedIdol?.name}</p>
          </div>
        </div>
      </header>

      <section className="grid min-w-0 flex-1 gap-3 p-3 sm:p-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_288px]">
        <div className="relative h-[65dvh] min-h-0 min-w-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/30 lg:h-full">
          <TileMapCanvas
            state={gameState}
            selectedCoordinate={selectedCoordinate}
            initialFocusWorldPoint={territoryCenter}
            actionableTiles={actionableTiles}
            onSelect={handleSelect}
          />
        </div>

        <TileInfoPanel
          selectedTile={selectedTile}
          owner={selectedOwner}
          tokens={gameState.tokens}
          preview={actionPreview}
          actionMessage={actionMessage}
          onAction={handleAction}
          onClear={handleClear}
        />
      </section>
    </main>
  );
}
