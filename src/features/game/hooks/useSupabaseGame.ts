"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  attackTileRemote,
  changeSupportedIdolRemote,
  claimTileRemote,
  ensureAnonymousSession,
  loadGameSnapshot,
  loadIdolRows,
  loadTileRows,
  submitIdolImageRemote,
} from "@/features/game/data/gameRepository";
import { reduceIdolRealtimeUpdate } from "@/features/game/data/idolRealtimeReducer";
import type { IdolImageMimeType } from "@/features/game/data/idolImageUpload";
import {
  createTileRealtimeState,
  mergeTileSnapshot,
  reduceTileRealtimeEvent,
  type TileRealtimeState,
} from "@/features/game/data/tileRealtimeReducer";
import {
  createExclusiveTaskRunner,
  createSingleFlightRunner,
  shouldResynchronizeAfterTileActionError,
  shouldSynchronizeOnVisibilityChange,
} from "@/features/game/data/requestControl";
import type { Coordinate, GameState, Idol } from "@/features/game/types/game";
import type { IdolRow, PlayerRow, TileActionRpcResult, TileRow } from "@/features/game/types/database";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type LoadStatus = "loading" | "ready" | "error";
export type RealtimeConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

const EMPTY_TILE_REALTIME_STATE: TileRealtimeState = {
  tiles: {},
  updatedAtByTileId: {},
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

export function useSupabaseGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeConnectionStatus>("connecting");
  const mutationRunnerRef = useRef(createExclusiveTaskRunner());
  const synchronizationRunnerRef = useRef(createSingleFlightRunner());
  const idolSynchronizationRunnerRef = useRef(createSingleFlightRunner());
  const uploadRunnerRef = useRef(createExclusiveTaskRunner());
  const lastVisibilityRef = useRef<DocumentVisibilityState>("visible");
  const tileRealtimeRef = useRef<TileRealtimeState>(EMPTY_TILE_REALTIME_STATE);

  const setLoadedSnapshot = useCallback(
    (snapshot: Awaited<ReturnType<typeof loadGameSnapshot>>) => {
      tileRealtimeRef.current = createTileRealtimeState(snapshot.tileRows);
      setGameState({ ...snapshot.gameState, tiles: tileRealtimeRef.current.tiles });
      setStatus("ready");
      setErrorMessage(null);
    },
    [],
  );

  const initialize = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const client = getSupabaseBrowserClient();
      await ensureAnonymousSession(client);
      setLoadedSnapshot(await loadGameSnapshot(client));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setStatus("error");
    }
  }, [setLoadedSnapshot]);

  useEffect(() => {
    let active = true;
    const client = getSupabaseBrowserClient();
    void ensureAnonymousSession(client)
      .then(() => loadGameSnapshot(client))
      .then((snapshot) => {
        if (active) setLoadedSnapshot(snapshot);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(getErrorMessage(error));
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [setLoadedSnapshot]);

  const mergeTileRow = useCallback(
    (
      seasonId: string,
      row: TileRow,
      eventType: "INSERT" | "UPDATE",
      player?: PlayerRow,
    ) => {
      setGameState((current) => {
        if (!current || current.season.id !== seasonId) return current;
        const merged = reduceTileRealtimeEvent(
          tileRealtimeRef.current,
          seasonId,
          { eventType, row },
        );
        tileRealtimeRef.current = merged;
        if (merged.tiles === current.tiles && !player) return current;
        return {
          ...current,
          tiles: merged.tiles,
          ...(player ? { tokens: player.tokens } : {}),
        };
      });
    },
    [],
  );

  const synchronizeTiles = useCallback(() => synchronizationRunnerRef.current.run(async () => {
    const seasonId = gameState?.season.id;
    if (!seasonId) return;
    setIsSynchronizing(true);
    try {
      const rows = await loadTileRows(getSupabaseBrowserClient(), seasonId);
      const synchronized = mergeTileSnapshot(
        tileRealtimeRef.current,
        seasonId,
        rows,
      );
      tileRealtimeRef.current = synchronized;
      setGameState((current) =>
        current?.season.id === seasonId
          ? { ...current, tiles: synchronized.tiles }
          : current,
      );
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setRealtimeStatus("error");
      throw error;
    } finally {
      setIsSynchronizing(false);
    }
  }), [gameState?.season.id]);

  const mergeIdolRow = useCallback((row: IdolRow) => {
    setGameState((current) => current
      ? { ...current, idols: reduceIdolRealtimeUpdate(current.idols, row) }
      : current);
  }, []);

  const synchronizeIdols = useCallback(() => idolSynchronizationRunnerRef.current.run(async () => {
    const rows = await loadIdolRows(getSupabaseBrowserClient());
    setGameState((current) => {
      if (!current) return current;
      const idols = rows.reduce(reduceIdolRealtimeUpdate, current.idols);
      return idols === current.idols ? current : { ...current, idols };
    });
  }), []);

  useEffect(() => {
    const seasonId = gameState?.season.id;
    if (!seasonId) return;
    const client = getSupabaseBrowserClient();
    let connectedOnce = false;
    let active = true;
    queueMicrotask(() => {
      if (active) setRealtimeStatus("connecting");
    });
    const handlePayload = (eventType: "INSERT" | "UPDATE", value: unknown) => {
      mergeTileRow(seasonId, value as TileRow, eventType);
    };
    const channel = client
      .channel(`tiles:${seasonId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tiles", filter: `season_id=eq.${seasonId}` },
        (payload) => handlePayload("INSERT", payload.new),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tiles", filter: `season_id=eq.${seasonId}` },
        (payload) => handlePayload("UPDATE", payload.new),
      )
      .subscribe((channelStatus) => {
        if (!active) return;
        if (channelStatus === "SUBSCRIBED") {
          connectedOnce = true;
          setRealtimeStatus("connected");
          void synchronizeTiles().catch(() => undefined);
        } else if (channelStatus === "CHANNEL_ERROR") {
          setRealtimeStatus("error");
        } else if (channelStatus === "TIMED_OUT" || channelStatus === "CLOSED") {
          setRealtimeStatus(connectedOnce ? "reconnecting" : "connecting");
        }
      });
    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [gameState?.season.id, mergeTileRow, synchronizeTiles]);

  useEffect(() => {
    const seasonId = gameState?.season.id;
    if (!seasonId) return;
    const client = getSupabaseBrowserClient();
    let active = true;
    const channel = client.channel(`idols:${seasonId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "idols" }, (payload) => {
        if (active) mergeIdolRow(payload.new as IdolRow);
      })
      .subscribe((channelStatus) => {
        if (active && channelStatus === "SUBSCRIBED") {
          void synchronizeIdols().catch(() => undefined);
        }
      });
    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [gameState?.season.id, mergeIdolRow, synchronizeIdols]);

  useEffect(() => {
    lastVisibilityRef.current = document.visibilityState;
    const handleVisibilityChange = () => {
      const previous = lastVisibilityRef.current;
      lastVisibilityRef.current = document.visibilityState;
      if (shouldSynchronizeOnVisibilityChange(previous, document.visibilityState)) {
        void synchronizeTiles().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [synchronizeTiles]);

  const runMutation = useCallback(
    async <Result,>(mutation: () => Promise<Result>): Promise<Result | null> => {
      const result = await mutationRunnerRef.current.tryRun(async () => {
        setIsPending(true);
        try {
          return await mutation();
        } finally {
          setIsPending(false);
        }
      });
      return result.value;
    },
    [],
  );

  const changeSupportedIdol = useCallback(
    async (idolId: Idol["id"]) => {
      const seasonId = gameState?.season.id;
      if (!seasonId) return null;
      const player = await runMutation(() =>
        changeSupportedIdolRemote(getSupabaseBrowserClient(), seasonId, idolId),
      );
      if (player) {
        setGameState((current) => current?.season.id === seasonId
          ? { ...current, supportedIdolId: player.supported_idol_id, tokens: player.tokens }
          : current);
      }
      return player;
    },
    [gameState?.season.id, runMutation],
  );

  const runTileAction = useCallback(
    async (
      coordinate: Coordinate,
      eventType: "INSERT" | "UPDATE",
      action: (seasonId: string, coordinate: Coordinate) => Promise<TileActionRpcResult>,
    ) => {
      const seasonId = gameState?.season.id;
      if (!seasonId) return null;
      try {
        const result = await runMutation(() => action(seasonId, coordinate));
        if (result) {
          mergeTileRow(seasonId, result.tile, eventType, result.player);
        }
        return result?.tile ?? null;
      } catch (error) {
        if (shouldResynchronizeAfterTileActionError(error)) {
          await synchronizeTiles().catch(() => undefined);
        }
        throw error;
      }
    },
    [gameState?.season.id, mergeTileRow, runMutation, synchronizeTiles],
  );

  const claimTile = useCallback(
    (coordinate: Coordinate) => runTileAction(
      coordinate,
      "INSERT",
      (seasonId, target) => claimTileRemote(getSupabaseBrowserClient(), seasonId, target),
    ),
    [runTileAction],
  );
  const attackTile = useCallback(
    (coordinate: Coordinate) => runTileAction(
      coordinate,
      "UPDATE",
      (seasonId, target) => attackTileRemote(getSupabaseBrowserClient(), seasonId, target),
    ),
    [runTileAction],
  );

  const submitIdolImage = useCallback(async (input: {
    readonly file: File;
    readonly width: number;
    readonly height: number;
    readonly mimeType: IdolImageMimeType;
  }) => {
    const seasonId = gameState?.season.id;
    const idolId = gameState?.supportedIdolId;
    if (!seasonId || !idolId) return null;
    const result = await uploadRunnerRef.current.tryRun(async () => {
      setIsUploadingImage(true);
      try {
        return await submitIdolImageRemote(getSupabaseBrowserClient(), {
          seasonId, idolId, ...input,
        });
      } finally {
        setIsUploadingImage(false);
      }
    });
    if (result.value) mergeIdolRow(result.value.idol);
    return result.value;
  }, [gameState?.season.id, gameState?.supportedIdolId, mergeIdolRow]);

  return {
    gameState,
    status,
    errorMessage,
    isPending,
    isSynchronizing,
    isUploadingImage,
    realtimeStatus,
    retry: initialize,
    synchronizeTiles,
    changeSupportedIdol,
    claimTile,
    attackTile,
    submitIdolImage,
  } as const;
}
