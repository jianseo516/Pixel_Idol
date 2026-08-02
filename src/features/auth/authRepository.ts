import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getLoginErrorMessage, nicknameToInternalEmail, validateNickname, validatePassword } from "./authCredentials";
import { isLegacyAnonymousUser } from "./authAudience";

export function isPermanentUser(user: Pick<User, "is_anonymous"> | null): boolean {
  return Boolean(user && !user.is_anonymous);
}

export async function clearLegacyAnonymousSession(
  client: SupabaseClient,
  user: Pick<User, "is_anonymous"> | null,
): Promise<boolean> {
  if (!isLegacyAnonymousUser(user)) return false;
  await client.auth.signOut({ scope: "local" });
  return true;
}

export async function signUpWithNickname(client: SupabaseClient, nickname: string, password: string, confirmation: string) {
  const validation = validateNickname(nickname);
  if (!validation.valid) throw new Error(validation.message);
  const passwordError = validatePassword(password, confirmation);
  if (passwordError) throw new Error(passwordError);
  const displayNickname = nickname.trim().normalize("NFC");
  const { data, error } = await client.auth.signUp({
    email: nicknameToInternalEmail(validation.normalizedNickname),
    password,
    options: { data: { nickname: displayNickname, normalized_nickname: validation.normalizedNickname } },
  });
  if (error) {
    if (/already|registered|duplicate|unique/i.test(error.message)) throw new Error("이미 사용 중인 닉네임입니다.");
    throw new Error("회원가입을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }
  if (!data.session) throw new Error("이메일 확인이 비활성화되어 있는지 Supabase Auth 설정을 확인해주세요.");
  return data.user;
}

export async function signInWithNickname(client: SupabaseClient, nickname: string, password: string) {
  const validation = validateNickname(nickname);
  if (!validation.valid) throw new Error(getLoginErrorMessage());
  const { data, error } = await client.auth.signInWithPassword({
    email: nicknameToInternalEmail(validation.normalizedNickname),
    password,
  });
  if (error || !data.user || data.user.is_anonymous) throw new Error(getLoginErrorMessage());
  return data.user;
}

export async function signOut(client: SupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) throw new Error("로그아웃하지 못했습니다. 다시 시도해주세요.");
}
