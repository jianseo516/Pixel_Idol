"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BETA_NOTICE_DISMISSED_KEY } from "./feedbackValidation";

interface Props {
  readonly onOpenFeedback: () => void;
}

export function BetaNoticeBanner({ onOpenFeedback }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setVisible(window.localStorage.getItem(BETA_NOTICE_DISMISSED_KEY) !== "true");
    });
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    window.localStorage.setItem(BETA_NOTICE_DISMISSED_KEY, "true");
    setVisible(false);
  };

  return (
    <section className="relative z-20 border-b border-sky-400/20 bg-sky-950/90 px-4 py-3 text-sky-50">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-5 gap-y-2 pr-8 text-sm">
        <div className="min-w-0 flex-1">
          <strong className="font-black">베타 서비스 안내</strong>
          <span className="ml-2 text-xs leading-5 text-sky-100/80 sm:text-sm">
            Pixel Idol은 현재 베타 서비스입니다. 오류나 부적절한 이미지를 발견하면 알려주세요. 베타 기간에는 게임 규칙과 데이터가 조정될 수 있습니다.
          </span>
        </div>
        <div className="flex shrink-0 gap-2 text-xs font-bold">
          <Link href="/help" className="rounded-lg border border-sky-300/30 px-3 py-2 hover:bg-white/10">게임 방법 보기</Link>
          <button type="button" onClick={onOpenFeedback} className="rounded-lg bg-sky-300 px-3 py-2 text-sky-950 hover:bg-sky-200">건의·오류 신고</button>
        </div>
        <button type="button" aria-label="베타 안내 닫기" onClick={dismiss} className="absolute top-2 right-3 rounded-md px-2 py-1 text-lg text-sky-100/70 hover:bg-white/10 hover:text-white">×</button>
      </div>
    </section>
  );
}
