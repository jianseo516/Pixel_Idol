"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  attackTileRemote,
  changeSupportedIdolRemote,
  claimTileRemote,
  ensureAnonymousSession,
  loadGameState,
} from "@/features/game/data/gameRepository";
import type { Coordinate, GameState, Idol } from "@/features/game/types/game";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type LoadStatus = "loading" | "ready" | "error";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}

export function useSupabaseGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);

  const initialize = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const client = getSupabaseBrowserClient();
      await ensureAnonymousSession(client);
      setGameState(await loadGameState(client));
      setStatus("ready");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    const client = getSupabaseBrowserClient();
    void ensureAnonymousSession(client)
      .then(() => loadGameState(client))
      .then((nextState) => {
        if (!active) return;
        setGameState(nextState);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(getErrorMessage(error));
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const runMutation = useCallback(
    async (mutation: () => Promise<GameState>): Promise<GameState | null> => {
      if (pendingRef.current) return null;
      pendingRef.current = true;
      setIsPending(true);
      try {
        const nextState = await mutation();
        setGameState(nextState);
        setErrorMessage(null);
        return nextState;
      } finally {
        pendingRef.current = false;
        setIsPending(false);
      }
    },
    [],
  );

  const changeSupportedIdol = useCallback(
    (idolId: Idol["id"]) =>
      gameState
        ? runMutation(() =>
            changeSupportedIdolRemote(
              getSupabaseBrowserClient(),
              gameState.season.id,
              idolId,
            ),
          )
        : Promise.resolve(null),
    [gameState, runMutation],
  );
  const claimTile = useCallback(
    (coordinate: Coordinate) =>
      gameState
        ? runMutation(() =>
            claimTileRemote(
              getSupabaseBrowserClient(),
              gameState.season.id,
              coordinate,
            ),
          )
        : Promise.resolve(null),
    [gameState, runMutation],
  );
  const attackTile = useCallback(
    (coordinate: Coordinate) =>
      gameState
        ? runMutation(() =>
            attackTileRemote(
              getSupabaseBrowserClient(),
              gameState.season.id,
              coordinate,
            ),
          )
        : Promise.resolve(null),
    [gameState, runMutation],
  );

  return {
    gameState,
    status,
    errorMessage,
    isPending,
    retry: initialize,
    changeSupportedIdol,
    claimTile,
    attackTile,
  } as const;
}
