"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
  type FeedbackCategory,
  type FeedbackReport,
  type FeedbackStatus,
} from "@/features/feedback/feedbackTypes";
import { isSafeFeedbackLink } from "@/features/feedback/feedbackValidation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteAdminFeedbackReport,
  loadAdminFeedbackReports,
  updateAdminFeedbackReport,
} from "./adminData";
import { FeedbackImagePreview } from "./FeedbackImagePreview";

export function FeedbackAdminPanel({ enabled }: { readonly enabled: boolean }) {
  const [category, setCategory] = useState<FeedbackCategory | "">("");
  const [status, setStatus] = useState<FeedbackStatus | "">("");
  const [reports, setReports] = useState<readonly FeedbackReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<FeedbackStatus>("new");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => reports.find((report) => report.id === selectedId) ?? null,
    [reports, selectedId],
  );

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const next = await loadAdminFeedbackReports(getSupabaseBrowserClient(), {
        category: category || null,
        status: status || null,
      });
      setReports(next);
      setSelectedId((current) => current && next.some((report) => report.id === current) ? current : null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "피드백 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [category, enabled, status]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    return () => { active = false; };
  }, [refresh]);

  const choose = (report: FeedbackReport) => {
    setSelectedId(report.id);
    setSelectedStatus(report.status);
    setAdminNote(report.admin_note ?? "");
  };

  const save = async () => {
    if (!selected || pending) return;
    setPending(true);
    setError(null);
    try {
      const updated = await updateAdminFeedbackReport(
        getSupabaseBrowserClient(), selected.id, selectedStatus, adminNote,
      );
      setReports((current) => current.map((report) => report.id === updated.id ? updated : report));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "피드백을 수정하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    if (!selected || pending || !window.confirm("이 피드백을 삭제하시겠습니까?")) return;
    setPending(true);
    try {
      await deleteAdminFeedbackReport(getSupabaseBrowserClient(), selected.id);
      setReports((current) => current.filter((report) => report.id !== selected.id));
      setSelectedId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "피드백을 삭제하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-black">제안·신고 관리</h2><p className="mt-1 text-xs text-slate-400">최근 200건을 최신 접수순으로 확인합니다.</p></div><div className="flex flex-wrap gap-2"><label className="grid gap-1 text-xs text-slate-400">유형<select value={category} onChange={(event) => setCategory(event.target.value as FeedbackCategory | "")} className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"><option value="">전체</option>{FEEDBACK_CATEGORIES.map((value) => <option key={value} value={value}>{FEEDBACK_CATEGORY_LABELS[value]}</option>)}</select></label><label className="grid gap-1 text-xs text-slate-400">상태<select value={status} onChange={(event) => setStatus(event.target.value as FeedbackStatus | "")} className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"><option value="">전체</option>{FEEDBACK_STATUSES.map((value) => <option key={value} value={value}>{FEEDBACK_STATUS_LABELS[value]}</option>)}</select></label><button type="button" disabled={loading} onClick={() => void refresh()} className="self-end rounded-lg border border-slate-600 px-3 py-2 text-sm font-bold disabled:opacity-50">새로고침</button></div></div>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <div className="min-w-0 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs text-slate-400"><tr><th className="px-3 py-2">접수 시각</th><th className="px-3 py-2">유형</th><th className="px-3 py-2">작성자</th><th className="px-3 py-2">내용</th><th className="px-3 py-2">상태</th></tr></thead><tbody>{reports.map((report) => <tr key={report.id} onClick={() => choose(report)} className={`cursor-pointer border-t border-slate-800 hover:bg-slate-800/60 ${selectedId === report.id ? "bg-slate-800" : ""}`}><td className="whitespace-nowrap px-3 py-3 text-xs text-slate-400">{new Date(report.created_at).toLocaleString("ko-KR")}</td><td className="px-3 py-3">{FEEDBACK_CATEGORY_LABELS[report.category]}</td><td className="px-3 py-3">{report.nickname ?? "비로그인"}</td><td className="max-w-xs truncate px-3 py-3">{report.content}</td><td className="px-3 py-3">{FEEDBACK_STATUS_LABELS[report.status]}</td></tr>)}</tbody></table>{!loading && reports.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">조건에 맞는 피드백이 없습니다.</p> : null}</div>
        <aside className="min-h-72 rounded-xl border border-slate-700 bg-slate-950/60 p-4">{selected ? <div className="grid gap-4 text-sm"><div><p className="text-xs text-slate-500">전체 내용</p><p className="mt-1 whitespace-pre-wrap break-words leading-6">{selected.content}</p></div><dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs"><dt className="text-slate-500">연락 이메일</dt><dd className="break-all">{selected.contact_email ?? "-"}</dd><dt className="text-slate-500">페이지</dt><dd className="break-all">{isSafeFeedbackLink(selected.page_url) ? <a target="_blank" rel="noreferrer noopener" href={selected.page_url as string} className="text-sky-300 underline">새 탭에서 확인</a> : selected.page_url ?? "-"}</dd><dt className="text-slate-500">타일 ID</dt><dd className="break-all">{selected.tile_id ?? "-"}</dd><dt className="text-slate-500">이미지</dt><dd className="break-all">{isSafeFeedbackLink(selected.image_url) ? <a target="_blank" rel="noreferrer noopener" href={selected.image_url as string} className="text-sky-300 underline">새 탭에서 확인</a> : selected.image_url ?? "-"}</dd></dl>{selected.category === "image_report" ? <FeedbackImagePreview key={selected.image_url} url={selected.image_url} /> : null}<label className="grid gap-1 text-xs font-bold">처리 상태<select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as FeedbackStatus)} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2">{FEEDBACK_STATUSES.map((value) => <option key={value} value={value}>{FEEDBACK_STATUS_LABELS[value]}</option>)}</select></label><label className="grid gap-1 text-xs font-bold">관리자 메모<textarea maxLength={2000} rows={5} value={adminNote} onChange={(event) => setAdminNote(event.target.value)} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2" /></label><div className="flex gap-2"><button type="button" disabled={pending} onClick={() => void save()} className="flex-1 rounded-lg bg-sky-300 px-3 py-2 font-black text-sky-950 disabled:opacity-50">저장</button><button type="button" disabled={pending} onClick={() => void remove()} className="rounded-lg border border-rose-400/40 px-3 py-2 font-bold text-rose-300 disabled:opacity-50">삭제</button></div></div> : <p className="grid min-h-64 place-items-center text-sm text-slate-500">목록에서 피드백을 선택하세요.</p>}</aside>
      </div>
    </section>
  );
}
