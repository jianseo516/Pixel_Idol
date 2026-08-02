import type { Idol } from "@/features/game/types/game";
import type { IdolRow } from "@/features/game/types/database";

export function reduceIdolRealtimeUpdate(
  idols: Readonly<Record<string, Idol>>,
  row: IdolRow,
): Readonly<Record<string, Idol>> {
  const current = idols[row.id];
  if (!current) return idols;
  const next = { id: row.id, name: row.name, color: row.color, representativeImageSrc: row.representative_image_src };
  if (current.name === next.name && current.color === next.color && current.representativeImageSrc === next.representativeImageSrc) return idols;
  return { ...idols, [row.id]: next };
}
