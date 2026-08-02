import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

interface SupabasePublicEnvironment {
  readonly url: string | undefined;
  readonly publishableKey: string | undefined;
}

export function hasSupabaseBrowserEnvironment(
  environment: SupabasePublicEnvironment = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
): boolean {
  return Boolean(
    environment.url && environment.publishableKey,
  );
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!hasSupabaseBrowserEnvironment()) {
    throw new Error("Supabase 공개 환경 변수가 설정되지 않았습니다.");
  }
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
    );
  }
  return browserClient;
}
