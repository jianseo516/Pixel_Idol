export interface SupabaseErrorDetails {
  readonly code?: string;
  readonly message: string;
  readonly details?: string;
  readonly hint?: string;
}

export function logSupabaseQueryError(
  queryStep: string,
  error: SupabaseErrorDetails,
): void {
  if (process.env.NODE_ENV !== "development") return;

  console.error("[Supabase query error]", {
    queryStep,
    code: error.code ?? null,
    message: error.message,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
}

export function throwSupabaseQueryError(
  queryStep: string,
  error: SupabaseErrorDetails | null,
): void {
  if (!error) return;
  logSupabaseQueryError(queryStep, error);
  throw new Error(error.message);
}
