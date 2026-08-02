"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signInWithNickname, signUpWithNickname } from "./authRepository";
import { useAuthAudience } from "./useAuthAudience";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { initializeAuthenticatedAccount } from "./accountInitialization";

export function AuthForm({ mode }: { readonly mode: "login" | "signup" }) {
  const router = useRouter();
  const audience = useAuthAudience();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sessionInitializationFailed, setSessionInitializationFailed] = useState(false);
  const lockUntilRef = useRef(0);

  useEffect(() => {
    if (audience !== "authenticated") return;
    let active = true;
    const continueAuthenticatedSession = async () => {
      try {
        const client = getSupabaseBrowserClient();
        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        const user = data.session?.user;
        if (!user || user.is_anonymous) return;
        await initializeAuthenticatedAccount(client, user.id);
        if (active) router.replace("/");
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "계정 초기화에 실패했습니다.");
          setSessionInitializationFailed(true);
        }
      }
    };
    void continueAuthenticatedSession();
    return () => { active = false; };
  }, [audience, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending || Date.now() < lockUntilRef.current) return;
    setPending(true);
    setError(null);
    try {
      const client = getSupabaseBrowserClient();
      const user = mode === "signup"
        ? await signUpWithNickname(client, nickname, password, confirmation)
        : await signInWithNickname(client, nickname, password);
      if (!user) throw new Error("계정 정보를 확인하지 못했습니다.");
      await initializeAuthenticatedAccount(client, user.id);
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "요청을 완료하지 못했습니다.");
      if (mode === "login") lockUntilRef.current = Date.now() + 800;
    } finally {
      setPending(false);
    }
  };

  if (audience === "loading" || (audience === "authenticated" && !sessionInitializationFailed)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-950 p-4 text-slate-100">
        <div aria-label="인증 상태 확인 중" className="h-72 w-full max-w-md animate-pulse rounded-3xl bg-slate-900" />
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-950 p-4 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <p className="text-xs font-bold tracking-[0.2em] text-rose-400">PIXEL IDOL</p>
        <h1 className="mt-2 text-2xl font-black">{mode === "signup" ? "회원가입" : "로그인"}</h1>
        <form className="mt-6 grid gap-4" onSubmit={(event) => void submit(event)}>
          <label className="grid gap-1.5 text-sm font-semibold">닉네임<input autoComplete="username" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={16} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-rose-400" /></label>
          <label className="grid gap-1.5 text-sm font-semibold">비밀번호<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-rose-400" /></label>
          {mode === "signup" ? <label className="grid gap-1.5 text-sm font-semibold">비밀번호 확인<input type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 outline-none focus:border-rose-400" /></label> : null}
          {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
          <button disabled={pending} className="rounded-xl bg-rose-500 px-4 py-3 font-black disabled:opacity-50">{pending ? "처리 중…" : mode === "signup" ? "가입하기" : "로그인"}</button>
        </form>
        {mode === "signup" ? <div className="mt-4 text-xs leading-5 text-slate-400"><p>이 서비스는 이메일을 수집하지 않습니다.</p><p>비밀번호를 잊으면 계정을 복구할 수 없습니다.</p></div> : null}
        <div className="mt-6 flex justify-between text-sm"><Link href="/" className="text-slate-400 hover:text-white">게임 보기</Link><Link href={mode === "signup" ? "/login" : "/signup"} className="font-bold text-rose-300">{mode === "signup" ? "로그인" : "회원가입"}</Link></div>
      </section>
    </main>
  );
}
