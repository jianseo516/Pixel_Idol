import type { SupabaseClient } from "@supabase/supabase-js";

import { adaptSupabaseRowsToGameState } from "@/features/game/data/gameAdapter";
import type { Coordinate, GameState, Idol } from "@/features/game/types/game";
import type {
  IdolRow,
  PlayerRow,
  SeasonRow,
  TileRow,
  TileActionRpcResult,
  SubmitIdolImageRpcResult,
} from "@/features/game/types/database";
import { createIdolImageStoragePath, type IdolImageMimeType } from "@/features/game/data/idolImageUpload";

export interface LoadedGameSnapshot {
  readonly gameState: GameState;
  readonly tileRows: readonly TileRow[];
}

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

export async function loadGameSnapshot(
  client: SupabaseClient,
  seasonId?: string,
): Promise<LoadedGameSnapshot> {
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
      .select("season_id,x,y,owner_id,hp,updated_at")
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

  const tileRows = (tileResult.data ?? []) as TileRow[];
  return { gameState: adaptSupabaseRowsToGameState({
    season,
    idols: (idolResult.data ?? []) as IdolRow[],
    tiles: tileRows,
    player: playerResult.data as PlayerRow,
  }), tileRows };
}

export async function loadGameState(client: SupabaseClient, seasonId?: string): Promise<GameState> {
  return (await loadGameSnapshot(client, seasonId)).gameState;
}

export async function loadTileRows(
  client: SupabaseClient,
  seasonId: string,
): Promise<readonly TileRow[]> {
  const { data, error } = await client
    .from("tiles")
    .select("season_id,x,y,owner_id,hp,updated_at")
    .eq("season_id", seasonId);
  throwIfError(error);
  return (data ?? []) as TileRow[];
}

export async function loadIdolRows(client: SupabaseClient): Promise<readonly IdolRow[]> {
  const { data, error } = await client.from("idols")
    .select("id,name,color,representative_image_src").order("sort_order");
  throwIfError(error);
  return (data ?? []) as IdolRow[];
}

export async function submitIdolImageRemote(
  client: SupabaseClient,
  input: {
    readonly seasonId: string;
    readonly idolId: string;
    readonly file: File;
    readonly width: number;
    readonly height: number;
    readonly mimeType: IdolImageMimeType;
  },
): Promise<SubmitIdolImageRpcResult> {
  const submissionId = crypto.randomUUID();
  const storagePath = createIdolImageStoragePath({
    seasonId: input.seasonId,
    idolId: input.idolId,
    submissionId,
    mimeType: input.mimeType,
  });
  const bucket = client.storage.from("idol-community-images");
  const upload = await bucket.upload(storagePath, input.file, {
    contentType: input.mimeType,
    upsert: false,
  });
  throwIfError(upload.error);
  try {
    const result = await client.rpc("submit_raw_idol_image", {
      p_season_id: input.seasonId,
      p_idol_id: input.idolId,
      p_submission_id: submissionId,
      p_storage_path: storagePath,
      p_original_file_name: input.file.name,
      p_mime_type: input.mimeType,
      p_file_size: input.file.size,
      p_width: input.width,
      p_height: input.height,
    });
    throwIfError(result.error);
    if (!result.data) throw new Error("대표 이미지 변경 결과가 없습니다.");
    return result.data as SubmitIdolImageRpcResult;
  } catch (error) {
    void bucket.remove([storagePath]).then(({ error: cleanupError }) => {
      if (cleanupError) console.warn("업로드 실패 파일을 정리하지 못했습니다.", cleanupError.message);
    });
    throw error;
  }
}

export async function changeSupportedIdolRemote(
  client: SupabaseClient,
  seasonId: string,
  idolId: Idol["id"],
): Promise<PlayerRow> {
  const result = await client.rpc("change_supported_idol", {
    p_season_id: seasonId,
    p_idol_id: idolId,
  });
  throwIfError(result.error);
  if (!result.data) throw new Error("플레이어 변경 결과가 없습니다.");
  return result.data as PlayerRow;
}

async function runTileAction(
  client: SupabaseClient,
  rpcName: "claim_tile" | "attack_tile",
  seasonId: string,
  coordinate: Coordinate,
): Promise<TileActionRpcResult> {
  const result = await client.rpc(rpcName, {
    p_season_id: seasonId,
    p_x: coordinate.x,
    p_y: coordinate.y,
  });
  throwIfError(result.error);
  if (!result.data) throw new Error("타일 행동 결과가 없습니다.");
  return result.data as TileActionRpcResult;
}

export function claimTileRemote(
  client: SupabaseClient,
  seasonId: string,
  coordinate: Coordinate,
): Promise<TileActionRpcResult> {
  return runTileAction(client, "claim_tile", seasonId, coordinate);
}

export function attackTileRemote(
  client: SupabaseClient,
  seasonId: string,
  coordinate: Coordinate,
): Promise<TileActionRpcResult> {
  return runTileAction(client, "attack_tile", seasonId, coordinate);
}
