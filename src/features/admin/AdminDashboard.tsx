"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { isPermanentUser } from "@/features/auth/authRepository";
import { isCurrentUserAdmin, loadAdminSummary, type AdminSummary } from "./adminData";
import { useGamePresence } from "./useGamePresence";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { FeedbackAdminPanel } from "./FeedbackAdminPanel";

type AccessStatus = "loading" | "ready" | "forbidden" | "error";

const STAT_CARDS: readonly [keyof AdminSummary, string, string][] = [
  ["totalUsers", "전체 가입자", "정상 profile이 생성된 전체 계정"],
  ["newUsersToday", "오늘 신규 가입자", "한국 시간 오늘 00:00 이후"],
  ["newUsers7d", "최근 7일 신규 가입자", "현재 시각 기준 최근 7×24시간"],
  ["activeUsersToday", "오늘 활동 사용자", "한국 시간 오늘 고유 활동 사용자"],
  ["activeUsers7d", "최근 7일 활동 사용자", "최근 7×24시간 고유 활동 사용자"],
  ["totalImageUploads", "전체 이미지 업로드", "성공적으로 등록된 전체 submission"],
  ["imageUploads24h", "최근 24시간 이미지 업로드", "현재 시각 기준 최근 24시간"],
  ["pendingFeedbackCount", "미처리 피드백", "신규 또는 검토 중인 제안·신고"],
  ["pendingImageReportCount", "미처리 이미지 신고", "신규 또는 검토 중인 이미지 신고"],
];

export function AdminDashboard() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessStatus>("loading");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const presence = useGamePresence(null, access === "ready");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const client = getSupabaseBrowserClient();
      const nextSummary = await loadAdminSummary(client);
      setSummary(nextSummary);
      setLastUpdatedAt(new Date());
      setAccess("ready");
    } catch {
      setAccess((current) => current === "forbidden" ? current : "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      void (async () => {
        const client = getSupabaseBrowserClient();
        const { data, error } = await client.auth.getSession();
        if (!active) return;
        if (error || !isPermanentUser(data.session?.user ?? null)) {
          router.replace("/login");
          return;
        }
        try {
          if (!await isCurrentUserAdmin(client)) { if (active) setAccess("forbidden"); return; }
          if (active) await refresh();
        } catch { if (active) { setAccess("error"); setLoading(false); } }
      })();
    });
    return () => { active = false; };
  }, [refresh, router]);

  if (access === "forbidden") return <main className="grid min-h-dvh place-items-center bg-slate-950 p-4 text-slate-100"><section className="rounded-2xl border border-rose-400/30 bg-slate-900 p-6 text-center"><h1 className="text-2xl font-black">403</h1><p className="mt-2 text-slate-300">관리자 권한이 없습니다.</p><Link href="/" className="mt-5 inline-block rounded-lg bg-rose-500 px-4 py-2 font-bold">게임으로 돌아가기</Link></section></main>;

  const cards = summary ? STAT_CARDS.map(([key, title, description]) => ({ title, description, value: summary[key] })) : [];
  return <main className="min-h-dvh bg-slate-950 px-4 py-8 text-slate-100"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold tracking-[.2em] text-rose-400">PIXEL IDOL</p><h1 className="mt-2 text-3xl font-black">Pixel Idol 관리자 통계</h1></div><div className="flex gap-2"><Link href="/" className="rounded-xl border border-slate-600 px-4 py-3 font-bold">게임으로 돌아가기</Link><button disabled={loading || access !== "ready"} onClick={() => void refresh()} className="rounded-xl bg-rose-500 px-4 py-3 font-bold disabled:opacity-50">새로고침</button></div></div>
    {access === "error" ? <section className="mt-8 rounded-2xl border border-rose-400/30 bg-slate-900 p-6"><p className="font-bold text-rose-200">관리자 통계를 불러오지 못했습니다.</p><button onClick={() => void refresh()} className="mt-4 rounded-lg bg-rose-500 px-4 py-2 font-bold">재시도</button></section> : null}
    <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {loading && !summary ? Array.from({ length: 8 }, (_, index) => <div key={index} aria-label="통계 불러오는 중" className="h-36 animate-pulse rounded-2xl bg-slate-800" />) : <>{cards.map((card) => <article key={card.title} className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><h2 className="text-sm font-bold text-slate-300">{card.title}</h2><p className="mt-3 text-4xl font-black">{card.value.toLocaleString("ko-KR")}</p><p className="mt-3 text-xs leading-5 text-slate-500">{card.description}</p></article>)}<article className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><h2 className="text-sm font-bold text-slate-300">현재 온라인 사용자</h2>{presence.status === "connected" && presence.onlineCount !== null ? <p className="mt-3 text-4xl font-black">{presence.onlineCount.toLocaleString("ko-KR")}</p> : <p className="mt-3 text-lg font-bold text-amber-300">{presence.status === "error" ? "연결 실패" : "집계 중"}</p>}<p className="mt-3 text-xs leading-5 text-slate-500">게임 Presence의 고유 로그인 사용자</p></article></>}
    </section><p className="mt-5 text-right text-xs text-slate-500">마지막 갱신: {lastUpdatedAt ? lastUpdatedAt.toLocaleString("ko-KR") : "-"}</p><FeedbackAdminPanel enabled={access === "ready"} /></div></main>;
}
