export function SupabaseSetupNotice() {
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-950 p-6 text-slate-100">
      <section className="max-w-xl rounded-2xl border border-amber-400/30 bg-slate-900 p-6 shadow-2xl">
        <p className="text-sm font-bold text-amber-300">Supabase 설정 필요</p>
        <h1 className="mt-2 text-2xl font-black">공동 플레이 데모를 시작할 수 없습니다.</h1>
        <p className="mt-4 leading-7 text-slate-300">
          공개 Supabase URL과 publishable key를 로컬 환경 변수에 설정한 뒤 개발 서버를 다시 시작해 주세요.
          필요한 변수 이름과 Dashboard 설정 절차는 README에 정리되어 있습니다.
        </p>
      </section>
    </main>
  );
}
