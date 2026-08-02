import { GamePrototype } from "@/features/game/components/GamePrototype";
import { SupabaseSetupNotice } from "@/features/game/components/SupabaseSetupNotice";

export default function Home() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return <SupabaseSetupNotice />;
  }
  return <GamePrototype />;
}
