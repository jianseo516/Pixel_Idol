import type { Idol } from "@/features/game/types/game";

interface IdolSelectorProps {
  readonly idols: readonly Idol[];
  readonly selectedId: Idol["id"];
  readonly onChange: (idolId: Idol["id"]) => void;
}

export function IdolSelector({
  idols,
  selectedId,
  onChange,
}: IdolSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="응원 아이돌 선택">
      {idols.map((idol) => {
        const selected = idol.id === selectedId;
        return (
          <button
            key={idol.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(idol.id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              selected
                ? "border-white/50 bg-slate-700 text-white"
                : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-white"
            }`}
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: idol.color }}
              aria-hidden="true"
            />
            {idol.name}
          </button>
        );
      })}
    </div>
  );
}
