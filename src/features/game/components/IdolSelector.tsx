import type { Idol } from "@/features/game/types/game";

interface IdolSelectorProps {
  readonly idols: readonly Idol[];
  readonly selectedId: Idol["id"];
  readonly onChange: (idolId: Idol["id"]) => void;
  readonly disabled?: boolean;
}

export function IdolSelector({
  idols,
  selectedId,
  onChange,
  disabled = false,
}: IdolSelectorProps) {
  return (
    <div
      className="grid w-full grid-cols-2 gap-1.5 sm:w-auto sm:grid-cols-4"
      aria-label="응원 아이돌 선택"
    >
      {idols.map((idol) => {
        const selected = idol.id === selectedId;
        return (
          <button
            key={idol.id}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(idol.id)}
            className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm leading-tight font-semibold whitespace-normal transition disabled:cursor-not-allowed disabled:opacity-50 ${
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
            <span>{idol.name}</span>
          </button>
        );
      })}
    </div>
  );
}
