import type { User } from "@supabase/supabase-js";

export type AuthAudience = "authenticated" | "unauthenticated" | "error";

export function classifyAuthAudience(
  user: Pick<User, "is_anonymous"> | null,
  profileExists: boolean | null,
): AuthAudience {
  if (!user) return "unauthenticated";
  if (user.is_anonymous) return "unauthenticated";
  if (profileExists === true) return "authenticated";
  return "error";
}

export function isLegacyAnonymousUser(user: Pick<User, "is_anonymous"> | null): boolean {
  return user?.is_anonymous === true;
}
