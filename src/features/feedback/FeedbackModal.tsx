"use client";

import { useEffect, useRef, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { submitFeedbackReport } from "./feedbackRepository";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  type FeedbackCategory,
} from "./feedbackTypes";
import {
  FEEDBACK_LAST_SUBMITTED_AT_KEY,
  getFeedbackCooldownRemaining,
  getOrCreateFeedbackClientId,
  isSafeFeedbackLink,
  validateFeedbackDraft,
} from "./feedbackValidation";

interface Props {
  readonly onClose: () => void;
  readonly initialCategory?: FeedbackCategory;
  readonly initialTileId?: string | null;
  readonly initialImageUrl?: string | null;
}

export function FeedbackModal({
  onClose,
  initialCategory = "bug",
  initialTileId = null,
  initialImageUrl = null,
}: Props) {
  const [category, setCategory] = useState<FeedbackCategory>(initialCategory);
  const [content, setContent] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [tileId, setTileId] = useState(initialTileId ?? "");
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);
  const requestGenerationRef = useRef(0);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const currentUrl = window.location.href;
    queueMicrotask(() => {
      setPageUrl(currentUrl);
      closeButtonRef.current?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const client = getSupabaseBrowserClient();
    const { data } = client.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT") return;
      requestGenerationRef.current += 1;
      submittingRef.current = false;
      setPending(false);
    });
    return () => {
      requestGenerationRef.current += 1;
      data.subscription.unsubscribe();
      window.removeEventListener("keydown", handleKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [onClose]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const draft = { category, content, contactEmail, pageUrl, tileId, imageUrl };
    const validationError = validateFeedbackDraft(draft);
    if (validationError) {
      setMessage({ kind: "error", text: validationError });
      return;
    }
    const cooldown = getFeedbackCooldownRemaining(
      window.localStorage.getItem(FEEDBACK_LAST_SUBMITTED_AT_KEY),
      Date.now(),
    );
    if (cooldown > 0) {
      setMessage({ kind: "error", text: `피드백은 ${Math.ceil(cooldown / 1000)}초 후 다시 제출할 수 있습니다.` });
      return;
    }

    const generation = requestGenerationRef.current;
    submittingRef.current = true;
    setPending(true);
    setMessage(null);
    try {
      const clientId = getOrCreateFeedbackClientId(window.localStorage, crypto.randomUUID);
      await submitFeedbackReport(getSupabaseBrowserClient(), clientId, draft);
      if (generation !== requestGenerationRef.current) return;
      window.localStorage.setItem(FEEDBACK_LAST_SUBMITTED_AT_KEY, String(Date.now()));
      setContent("");
      setContactEmail("");
      setMessage({ kind: "success", text: "의견이 정상적으로 전달되었습니다. 감사합니다." });
    } catch (error) {
      if (generation !== requestGenerationRef.current) return;
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "피드백을 제출하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      if (generation === requestGenerationRef.current) {
        submittingRef.current = false;
        setPending(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="my-auto w-full max-w-xl rounded-2xl border border-slate-600 bg-slate-900 p-5 text-slate-100 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold tracking-[.18em] text-sky-300">BETA FEEDBACK</p><h2 id="feedback-title" className="mt-1 text-xl font-black">건의·오류 신고</h2></div>
          <button ref={closeButtonRef} type="button" aria-label="피드백 창 닫기" onClick={onClose} className="rounded-lg border border-slate-600 px-3 py-1.5 text-lg hover:bg-slate-800">×</button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-400">보내주신 내용은 서비스 개선과 신고 처리를 위해 관리자에게 전달됩니다. 비밀번호나 민감한 개인정보를 입력하지 마세요.</p>
        <form className="mt-5 grid gap-4" onSubmit={(event) => void submit(event)}>
          <label className="grid gap-1.5 text-sm font-bold">유형<select value={category} onChange={(event) => setCategory(event.target.value as FeedbackCategory)} className="rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5">{FEEDBACK_CATEGORIES.map((value) => <option key={value} value={value}>{FEEDBACK_CATEGORY_LABELS[value]}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-bold">내용<textarea required minLength={10} maxLength={2000} rows={7} value={content} onChange={(event) => setContent(event.target.value)} className="resize-y rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5" placeholder="문제가 발생한 과정이나 제안 내용을 10자 이상 적어주세요." /><span className="text-right text-xs font-normal text-slate-500">{content.length} / 2000</span></label>
          <label className="grid gap-1.5 text-sm font-bold">답변 받을 이메일 <span className="font-normal text-slate-500">(선택)</span><input type="email" maxLength={320} value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5" /></label>
          <details className="rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm"><summary className="cursor-pointer font-bold text-slate-300">관련 정보 확인</summary><div className="mt-3 grid gap-3"><label className="grid gap-1 text-xs text-slate-400">페이지 주소<input maxLength={2048} value={pageUrl} onChange={(event) => setPageUrl(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200" /></label><label className="grid gap-1 text-xs text-slate-400">타일 ID<input maxLength={128} value={tileId} onChange={(event) => setTileId(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200" /></label><label className="grid gap-1 text-xs text-slate-400">이미지 URL<input maxLength={2048} value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200" /></label>{isSafeFeedbackLink(imageUrl) ? <a href={imageUrl} target="_blank" rel="noreferrer noopener" className="w-fit text-xs font-bold text-sky-300 underline">관련 이미지 새 탭에서 확인</a> : null}</div></details>
          <button type="submit" disabled={pending} className="rounded-xl bg-sky-300 px-4 py-3 font-black text-sky-950 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "제출 중…" : "피드백 보내기"}</button>
          <div aria-live="polite">{message ? <p className={`rounded-lg border px-3 py-2 text-sm ${message.kind === "success" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-rose-400/30 bg-rose-400/10 text-rose-200"}`}>{message.text}</p> : null}</div>
        </form>
      </section>
    </div>
  );
}
