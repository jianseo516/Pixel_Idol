"use client";

import Link from "next/link";
import { useAuthAudience } from "./useAuthAudience";

export function HelpAuthCta() {
  const audience = useAuthAudience();
  return <div className="mt-8 flex min-h-12 flex-wrap gap-3">
    <Link href="/" className="rounded-xl bg-rose-500 px-4 py-3 font-bold">게임으로 돌아가기</Link>
    {audience === "loading" ? <span aria-label="인증 상태 확인 중" className="h-12 w-28 animate-pulse rounded-xl bg-slate-800" /> : null}
    {audience === "authenticated" ? <Link href="/?mypage=1" className="rounded-xl border border-slate-600 px-4 py-3 font-bold">마이페이지</Link> : null}
    {audience === "unauthenticated" ? <><Link href="/login" className="rounded-xl border border-slate-600 px-4 py-3 font-bold">로그인</Link><Link href="/signup" className="rounded-xl border border-slate-600 px-4 py-3 font-bold">회원가입</Link></> : null}
    {audience === "error" ? <span role="status" className="self-center text-sm text-amber-300">계정 상태를 확인하지 못했습니다.</span> : null}
  </div>;
}
