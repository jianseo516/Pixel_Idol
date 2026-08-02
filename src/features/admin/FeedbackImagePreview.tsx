"use client";

import { useState } from "react";
import { isSafeFeedbackLink } from "@/features/feedback/feedbackValidation";

export function FeedbackImagePreview({ url }: { readonly url: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!isSafeFeedbackLink(url)) return <p className="text-xs text-slate-500">확인할 수 있는 이미지 URL이 없습니다.</p>;
  if (failed) return <p className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">이미지 미리보기를 불러오지 못했습니다. 아래 안전한 링크로 직접 확인해 주세요.</p>;
  return (
    // 관리자가 제출된 외부 URL을 검토하므로 Next Image 도메인 허용 목록을 확장하지 않는다.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url as string} alt="신고된 대표 이미지 미리보기" onError={() => setFailed(true)} className="max-h-48 w-full rounded-lg bg-slate-900 object-contain" />
  );
}
