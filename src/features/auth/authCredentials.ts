const NICKNAME_PATTERN = /^[가-힣a-z0-9_]{2,16}$/u;

export type NicknameValidationResult =
  | { readonly valid: true; readonly normalizedNickname: string }
  | { readonly valid: false; readonly message: string };

export function normalizeNickname(nickname: string): string {
  return nickname.trim().normalize("NFC").toLocaleLowerCase("en-US");
}

export function validateNickname(nickname: string): NicknameValidationResult {
  const normalizedNickname = normalizeNickname(nickname);
  return NICKNAME_PATTERN.test(normalizedNickname)
    ? { valid: true, normalizedNickname }
    : { valid: false, message: "닉네임은 한글, 영문, 숫자, 밑줄을 사용해 2~16자로 입력해주세요." };
}

function encodeBase64Url(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const value = (first << 16) | (second << 8) | third;
    result += alphabet[(value >>> 18) & 63];
    result += alphabet[(value >>> 12) & 63];
    if (index + 1 < bytes.length) result += alphabet[(value >>> 6) & 63];
    if (index + 2 < bytes.length) result += alphabet[value & 63];
  }
  return result;
}

export function nicknameToInternalEmail(normalizedNickname: string): string {
  return `${encodeBase64Url(new TextEncoder().encode(normalizedNickname))}@pixel-idol.local`;
}

export function validatePassword(password: string, confirmation?: string): string | null {
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "비밀번호는 영문과 숫자를 포함해 8자 이상으로 입력해주세요.";
  }
  if (confirmation !== undefined && password !== confirmation) {
    return "비밀번호 확인이 일치하지 않습니다.";
  }
  return null;
}

export function getLoginErrorMessage(): string {
  return "닉네임 또는 비밀번호가 올바르지 않습니다.";
}
