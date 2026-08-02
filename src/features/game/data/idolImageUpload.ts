export const IDOL_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const IDOL_IMAGE_MAX_DIMENSION = 5000;
export const IDOL_IMAGE_UPLOAD_COOLDOWN_MS = 60_000;
export const IDOL_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type IdolImageMimeType = (typeof IDOL_IMAGE_MIME_TYPES)[number];

export interface IdolImageDimensions {
  readonly width: number;
  readonly height: number;
  readonly decoded: boolean;
}

export interface IdolImageFileMetadata {
  readonly name: string;
  readonly type: string;
  readonly size: number;
}

export type IdolImageValidationResult =
  | { readonly valid: true; readonly mimeType: IdolImageMimeType }
  | { readonly valid: false; readonly message: string };

export function validateIdolImageFile(
  file: IdolImageFileMetadata,
  dimensions: IdolImageDimensions,
): IdolImageValidationResult {
  if (!IDOL_IMAGE_MIME_TYPES.includes(file.type as IdolImageMimeType)) {
    return { valid: false, message: "PNG, JPEG, WebP 이미지만 업로드할 수 있습니다." };
  }
  if (file.size <= 0 || file.size > IDOL_IMAGE_MAX_BYTES) {
    return { valid: false, message: "이미지 크기는 3MB 이하여야 합니다." };
  }
  if (!dimensions.decoded || dimensions.width <= 0 || dimensions.height <= 0) {
    return { valid: false, message: "이미지를 읽을 수 없습니다." };
  }
  if (dimensions.width > IDOL_IMAGE_MAX_DIMENSION || dimensions.height > IDOL_IMAGE_MAX_DIMENSION) {
    return { valid: false, message: "이미지의 한 변은 최대 5000px입니다." };
  }
  return { valid: true, mimeType: file.type as IdolImageMimeType };
}

const MIME_EXTENSIONS: Record<IdolImageMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export interface IdolImageStoragePathDetails {
  readonly userId: string;
  readonly seasonId: string;
  readonly idolId: string;
  readonly submissionId: string;
  readonly mimeType: IdolImageMimeType;
  readonly extension: string;
  readonly storagePath: string;
}

export function getIdolImageStoragePathDetails(input: {
  readonly userId: string;
  readonly seasonId: string;
  readonly idolId: string;
  readonly submissionId: string;
  readonly mimeType: IdolImageMimeType;
}): IdolImageStoragePathDetails {
  const extension = MIME_EXTENSIONS[input.mimeType];
  return {
    ...input,
    extension,
    storagePath: `${input.userId}/${input.seasonId}/${input.idolId}/${input.submissionId}.${extension}`,
  };
}

export function createIdolImageStoragePath(input: {
  readonly userId: string;
  readonly seasonId: string;
  readonly idolId: string;
  readonly submissionId: string;
  readonly mimeType: IdolImageMimeType;
}): string {
  const segmentPattern = /^[a-z0-9][a-z0-9-]*$/;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(input.userId) || !segmentPattern.test(input.seasonId) || !segmentPattern.test(input.idolId) || !uuidPattern.test(input.submissionId)) {
    throw new Error("올바르지 않은 이미지 저장 경로입니다.");
  }
  return getIdolImageStoragePathDetails(input).storagePath;
}

export function getLocalIdolImageFallback(idolId: string): string {
  return `/mock-idols/${idolId}.svg`;
}

export function canSubmitIdolImage(input: {
  readonly hasValidImage: boolean;
  readonly confirmed: boolean;
  readonly pending: boolean;
  readonly remainingSeconds: number;
}): boolean {
  return input.hasValidImage && input.confirmed && !input.pending && input.remainingSeconds <= 0;
}

export function releaseObjectUrl(
  url: string | null,
  revoke: (url: string) => void,
): void {
  if (url) revoke(url);
}

export function isIdolImageUploadCooldownActive(
  lastSubmissionAt: string | null,
  now: string,
): boolean {
  return Boolean(lastSubmissionAt) && Date.parse(now) - Date.parse(lastSubmissionAt as string) < IDOL_IMAGE_UPLOAD_COOLDOWN_MS;
}
