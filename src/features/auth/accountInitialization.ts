import type { SupabaseClient } from "@supabase/supabase-js";

import type { PlayerRow, ProfileRow } from "@/features/game/types/database";
import { throwSupabaseQueryError } from "@/lib/supabase/errorDiagnostics";

const PLAYER_COLUMNS = "season_id,user_id,supported_idol_id,tokens,last_action_at,claimed_tiles_count,successful_attacks_count,total_attacks_count,created_at";
const PROFILE_COLUMNS = "user_id,nickname,normalized_nickname,created_at,updated_at";

export class AccountInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountInitializationError";
  }
}

export async function loadOptionalProfile(
  client: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  throwSupabaseQueryError("account.profile", error);
  return data as ProfileRow | null;
}

export async function loadOptionalPlayer(
  client: SupabaseClient,
  seasonId: string,
  userId: string,
): Promise<PlayerRow | null> {
  const { data, error } = await client
    .from("players")
    .select(PLAYER_COLUMNS)
    .eq("season_id", seasonId)
    .eq("user_id", userId)
    .maybeSingle();
  throwSupabaseQueryError("account.player", error);
  return data as PlayerRow | null;
}

async function loadActiveSeasonId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client
    .from("seasons")
    .select("id")
    .eq("status", "active")
    .maybeSingle();
  throwSupabaseQueryError("account.active-season", error);
  if (!data) throw new AccountInitializationError("활성 시즌을 찾을 수 없습니다.");
  return (data as { readonly id: string }).id;
}

export async function initializeAuthenticatedAccount(
  client: SupabaseClient,
  userId: string,
): Promise<{
  readonly profile: ProfileRow;
  readonly player: PlayerRow;
  readonly seasonId: string;
}> {
  const profile = await loadOptionalProfile(client, userId);
  if (!profile) {
    throw new AccountInitializationError(
      "계정 프로필이 아직 생성되지 않았습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  const seasonId = await loadActiveSeasonId(client);
  let player = await loadOptionalPlayer(client, seasonId, userId);
  if (!player) {
    const initialization = await client.rpc("initialize_player", {
      p_season_id: seasonId,
    });
    throwSupabaseQueryError("account.initialize-player", initialization.error);
    player = await loadOptionalPlayer(client, seasonId, userId);
  }

  if (!player) {
    throw new AccountInitializationError(
      "플레이어 초기화를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  return { profile, player, seasonId };
}
