import type { SupabaseClient } from "@supabase/supabase-js";
import { throwSupabaseQueryError } from "@/lib/supabase/errorDiagnostics";

export interface AdminSummary {
  readonly totalUsers: number;
  readonly newUsersToday: number;
  readonly newUsers7d: number;
  readonly activeUsersToday: number;
  readonly activeUsers7d: number;
  readonly totalImageUploads: number;
  readonly imageUploads24h: number;
}

interface AdminSummaryRow {
  readonly total_users: number | string;
  readonly new_users_today: number | string;
  readonly new_users_7d: number | string;
  readonly active_users_today: number | string;
  readonly active_users_7d: number | string;
  readonly total_image_uploads: number | string;
  readonly image_uploads_24h: number | string;
}

const toCount = (value: number | string): number => Number(value);

export function adaptAdminSummary(row: AdminSummaryRow): AdminSummary {
  return {
    totalUsers: toCount(row.total_users),
    newUsersToday: toCount(row.new_users_today),
    newUsers7d: toCount(row.new_users_7d),
    activeUsersToday: toCount(row.active_users_today),
    activeUsers7d: toCount(row.active_users_7d),
    totalImageUploads: toCount(row.total_image_uploads),
    imageUploads24h: toCount(row.image_uploads_24h),
  };
}

export async function isCurrentUserAdmin(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc("is_current_user_admin");
  throwSupabaseQueryError("admin.current-user", error);
  return data === true;
}

export async function loadAdminSummary(client: SupabaseClient): Promise<AdminSummary> {
  const { data, error } = await client.rpc("admin_get_summary");
  throwSupabaseQueryError("admin.summary", error);
  if (!data) throw new Error("관리자 통계 결과가 없습니다.");
  return adaptAdminSummary(data as AdminSummaryRow);
}

export async function recordLoginActivity(client: SupabaseClient): Promise<void> {
  const { error } = await client.rpc("record_login_activity");
  throwSupabaseQueryError("admin.record-login", error);
}
