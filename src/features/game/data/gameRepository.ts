import type { SupabaseClient } from "@supabase/supabase-js";

import { adaptSupabaseRowsToGameState } from "@/features/game/data/gameAdapter";
import type { Coordinate, GameState, Idol } from "@/features/game/types/game";
import type {
  IdolRow,
  PlayerRow,
  SeasonRow,
  TileRow,
} from "@/features/game/types/database";

function throwIfError(error: { readonly message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

let anonymousSessionPromise: Promise<void> | null = null;

async function createAnonymousSession(client: SupabaseClient): Promise<void> {
  const { data, error } = await client.auth.getSession();
  throwIfError(error);
  if (data.session) {
    return;
  }
  const signInResult = await client.auth.signInAnonymously();
  throwIfError(signInResult.error);
}

export function ensureAnonymousSession(client: SupabaseClient): Promise<void> {
  if (!anonymousSessionPromise) {
    anonymousSessionPromise = createAnonymousSession(client).catch((error) => {
      anonymousSessionPromise = null;
      throw error;
    });
  }
  return anonymousSessionPromise;
}

async function getActiveSeason(client: SupabaseClient): Promise<SeasonRow> {
  const { data, error } = await client
    .from("seasons")
    .select("id,name,starts_at,ends_at,status,map_width,map_height")
    .eq("status", "active")
    .order("starts_at", { ascending: false })
    .limit(1)
    .single();
  throwIfError(error);
  if (!data) throw new Error("활성 시즌을 찾을 수 없습니다.");
  return data as SeasonRow;
}

export async function loadGameState(
  client: SupabaseClient,
  seasonId?: string,
): Promise<GameState> {
  const season = seasonId
    ? await (async () => {
        const { data, error } = await client
          .from("seasons")
          .select("id,name,starts_at,ends_at,status,map_width,map_height")
          .eq("id", seasonId)
          .single();
        throwIfError(error);
        if (!data) throw new Error("시즌을 찾을 수 없습니다.");
        return data as SeasonRow;
      })()
    : await getActiveSeason(client);

  const initialization = await client.rpc("initialize_player", {
    p_season_id: season.id,
  });
  throwIfError(initialization.error);

  const [idolResult, tileResult, playerResult] = await Promise.all([
    client
      .from("idols")
      .select("id,name,color,representative_image_src")
      .order("sort_order"),
    client
      .from("tiles")
      .select("season_id,x,y,owner_id,hp")
      .eq("season_id", season.id),
    client
      .from("players")
      .select("season_id,user_id,supported_idol_id,tokens")
      .eq("season_id", season.id)
      .single(),
  ]);
  throwIfError(idolResult.error);
  throwIfError(tileResult.error);
  throwIfError(playerResult.error);
  if (!playerResult.data) throw new Error("플레이어 상태를 찾을 수 없습니다.");

  return adaptSupabaseRowsToGameState({
    season,
    idols: (idolResult.data ?? []) as IdolRow[],
    tiles: (tileResult.data ?? []) as TileRow[],
    player: playerResult.data as PlayerRow,
  });
}

export async function changeSupportedIdolRemote(
  client: SupabaseClient,
  seasonId: string,
  idolId: Idol["id"],
): Promise<GameState> {
  const result = await client.rpc("change_supported_idol", {
    p_season_id: seasonId,
    p_idol_id: idolId,
  });
  throwIfError(result.error);
  return loadGameState(client, seasonId);
}

async function runTileAction(
  client: SupabaseClient,
  rpcName: "claim_tile" | "attack_tile",
  seasonId: string,
  coordinate: Coordinate,
): Promise<GameState> {
  const result = await client.rpc(rpcName, {
    p_season_id: seasonId,
    p_x: coordinate.x,
    p_y: coordinate.y,
  });
  throwIfError(result.error);
  return loadGameState(client, seasonId);
}

export function claimTileRemote(
  client: SupabaseClient,
  seasonId: string,
  coordinate: Coordinate,
): Promise<GameState> {
  return runTileAction(client, "claim_tile", seasonId, coordinate);
}

export function attackTileRemote(
  client: SupabaseClient,
  seasonId: string,
  coordinate: Coordinate,
): Promise<GameState> {
  return runTileAction(client, "attack_tile", seasonId, coordinate);
}
