"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GAME_CONFIG } from "@/config/game";
import type { Idol } from "@/features/game/types/game";
import type { PlayerRow, ProfileRow } from "@/features/game/types/database";

interface Props {
  readonly profile: ProfileRow;
  readonly player: PlayerRow;
  readonly idols: readonly Idol[];
  readonly supportedIdol: Idol | undefined;
  readonly factionTerritoryCount: number;
  readonly onClose: () => void;
  readonly onChangeIdol: (idolId: string) => Promise<unknown>;
  readonly onLogout: () => Promise<void>;
  readonly isAdmin?: boolean;
}

export function MyPageModal({ profile, player, idols, supportedIdol, factionTerritoryCount, onClose, onChangeIdol, onLogout, isAdmin = false }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [idolId, setIdolId] = useState(player.supported_idol_id);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll<HTMLElement>("button,select,[href],input,[tabindex]:not([tabindex='-1'])")].filter((item) => !item.hasAttribute("disabled"));
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", handleKey); };
  }, [onClose]);

  const changeIdol = async () => {
    if (idolId === player.supported_idol_id || !window.confirm("응원 아이돌을 변경하시겠습니까?")) return;
    setPending(true); setError(null);
    try { await onChangeIdol(idolId); } catch (caught) { setError(caught instanceof Error ? caught.message : "변경하지 못했습니다."); } finally { setPending(false); }
  };

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="my-page-title" className="w-full max-w-[380px] rounded-3xl border border-slate-600 bg-slate-900 p-5 shadow-2xl outline-none">
      <div className="flex items-center justify-between"><h2 id="my-page-title" className="text-xl font-black">마이페이지</h2><button type="button" onClick={onClose} aria-label="마이페이지 닫기" className="rounded-lg px-3 py-2 text-slate-400 hover:bg-slate-800">✕</button></div>
      <dl className="mt-5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 text-sm"><dt className="text-slate-400">닉네임</dt><dd className="font-bold">{profile.nickname}</dd><dt className="text-slate-400">응원 아이돌</dt><dd className="font-bold">{supportedIdol?.name ?? "-"}</dd><dt className="text-slate-400">현재 공격 포인트</dt><dd>{player.tokens} / {GAME_CONFIG.maxActionPoints}</dd><dt className="text-slate-400">다음 포인트 회복</dt><dd>자동 회복 없음</dd><dt className="text-slate-400">우리 진영 영토</dt><dd>{factionTerritoryCount}칸</dd><dt className="text-slate-400">내 누적 점령</dt><dd>{player.claimed_tiles_count ?? 0}회</dd><dt className="text-slate-400">내 누적 공격 성공</dt><dd>{player.successful_attacks_count ?? 0}회</dd><dt className="text-slate-400">내 누적 공격 시도</dt><dd>{player.total_attacks_count ?? 0}회</dd><dt className="text-slate-400">가입일</dt><dd>{new Date(profile.created_at).toLocaleDateString("ko-KR")}</dd></dl>
      <div className="mt-6 grid gap-2"><label className="text-xs font-bold text-slate-400">응원 아이돌 변경</label><div className="flex gap-2"><select value={idolId} onChange={(e) => setIdolId(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2">{idols.map((idol) => <option key={idol.id} value={idol.id}>{idol.name}</option>)}</select><button disabled={pending || idolId === player.supported_idol_id} onClick={() => void changeIdol()} className="rounded-lg bg-rose-500 px-3 py-2 font-bold disabled:opacity-40">변경</button></div>{error ? <p role="alert" className="text-xs text-rose-300">{error}</p> : null}{isAdmin ? <Link href="/admin" className="mt-2 rounded-lg bg-amber-400 px-3 py-2 text-center font-black text-slate-950">관리자 통계</Link> : null}<button onClick={() => void onLogout()} className="mt-2 rounded-lg border border-slate-600 px-3 py-2 font-bold hover:bg-slate-800">로그아웃</button></div>
    </div>
  </div>;
}
