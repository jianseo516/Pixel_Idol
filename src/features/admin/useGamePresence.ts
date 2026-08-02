"use client";

import { useEffect, useState } from "react";
import { countUniqueOnlineUsers } from "./presence";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type PresenceStatus = "idle" | "connecting" | "connected" | "error";

export function useGamePresence(userId: string | null, observeOnly = false) {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [status, setStatus] = useState<PresenceStatus>(userId || observeOnly ? "connecting" : "idle");

  useEffect(() => {
    if (!userId && !observeOnly) return;
    const client = getSupabaseBrowserClient();
    let active = true;
    const channel = client.channel("pixel-idol:game-presence", {
      config: { presence: { key: userId ?? `observer-${crypto.randomUUID()}` } },
    });
    const updateCount = () => {
      if (active) setOnlineCount(countUniqueOnlineUsers(channel.presenceState()));
    };
    channel.on("presence", { event: "sync" }, updateCount)
      .on("presence", { event: "join" }, updateCount)
      .on("presence", { event: "leave" }, updateCount)
      .subscribe(async (channelStatus) => {
        if (!active) return;
        if (channelStatus === "SUBSCRIBED") {
          if (!observeOnly && userId) await channel.track({ online_at: new Date().toISOString() });
          setStatus("connected");
          updateCount();
        } else if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") {
          setStatus("error");
          setOnlineCount(null);
        }
      });
    return () => {
      active = false;
      if (!observeOnly) void channel.untrack();
      void client.removeChannel(channel);
    };
  }, [observeOnly, userId]);

  return { onlineCount, status } as const;
}
