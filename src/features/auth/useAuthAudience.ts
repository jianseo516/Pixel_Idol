"use client";

import { useCallback, useEffect, useState } from "react";
import { classifyAuthAudience, isLegacyAnonymousUser, type AuthAudience } from "./authAudience";
import { clearLegacyAnonymousSession } from "./authRepository";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { logSupabaseQueryError } from "@/lib/supabase/errorDiagnostics";

export function useAuthAudience(): "loading" | AuthAudience {
  const [audience, setAudience] = useState<"loading" | AuthAudience>("loading");

  const refresh = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    const { data, error } = await client.auth.getSession();
    if (error) {
      logSupabaseQueryError("auth.session", error);
      setAudience("error");
      return;
    }
    const user = data.session?.user ?? null;
    if (isLegacyAnonymousUser(user)) {
      await clearLegacyAnonymousSession(client, user);
      setAudience("unauthenticated");
      return;
    }
    if (!user) {
      setAudience("unauthenticated");
      return;
    }
    const profile = await client.from("profiles").select("user_id").eq("user_id", user.id).maybeSingle();
    if (profile.error) logSupabaseQueryError("auth.profile", profile.error);
    setAudience(profile.error ? "error" : classifyAuthAudience(user, Boolean(profile.data)));
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    const client = getSupabaseBrowserClient();
    const { data } = client.auth.onAuthStateChange(() => {
      window.setTimeout(() => { if (active) void refresh(); }, 0);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [refresh]);

  return audience;
}
