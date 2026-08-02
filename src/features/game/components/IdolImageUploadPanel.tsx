"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";

import { canSubmitIdolImage, releaseObjectUrl, validateIdolImageFile, type IdolImageMimeType } from "@/features/game/data/idolImageUpload";
import type { Idol } from "@/features/game/types/game";

interface SelectedImage {
  readonly file: File;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly mimeType: IdolImageMimeType;
}

interface Props {
  readonly idol: Idol;
  readonly isUploading: boolean;
  readonly onSubmit: (image: Omit<SelectedImage, "url">) => Promise<unknown>;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

export function IdolImageUploadPanel({ idol, isUploading, onSubmit }: Props) {
  const [selected, setSelected] = useState<SelectedImage | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    releaseObjectUrl(objectUrlRef.current, URL.revokeObjectURL);
  }, []);
  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const timer = window.setInterval(() => setRemainingSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [remainingSeconds]);

  const chooseFile = (file: File | undefined) => {
    releaseObjectUrl(objectUrlRef.current, URL.revokeObjectURL);
    objectUrlRef.current = null;
    setSelected(null);
    setConfirmed(false);
    setMessage(null);
    if (!file) return;
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    const image = new Image();
    image.onload = () => {
      const result = validateIdolImageFile(file, { width: image.naturalWidth, height: image.naturalHeight, decoded: true });
      if (!result.valid) {
        setMessage({ kind: "error", text: result.message });
        URL.revokeObjectURL(url);
        if (objectUrlRef.current === url) objectUrlRef.current = null;
        return;
      }
      setSelected({ file, url, width: image.naturalWidth, height: image.naturalHeight, mimeType: result.mimeType });
    };
    image.onerror = () => {
      setMessage({ kind: "error", text: "이미지를 읽을 수 없습니다." });
      URL.revokeObjectURL(url);
      if (objectUrlRef.current === url) objectUrlRef.current = null;
    };
    image.src = url;
  };

  const submit = async () => {
    if (!selected || !canSubmitIdolImage({ hasValidImage: true, confirmed, pending: isUploading, remainingSeconds })) return;
    setMessage(null);
    try {
      await onSubmit({ file: selected.file, width: selected.width, height: selected.height, mimeType: selected.mimeType });
      setMessage({ kind: "success", text: `${idol.name} 대표 이미지가 즉시 적용되었습니다.` });
      setRemainingSeconds(60);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "업로드에 실패했습니다." });
    }
  };

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/90 p-4 text-sm">
      <h2 className="font-black text-white">우리 진영 대표 이미지 바꾸기</h2>
      <p className="mt-2 text-xs leading-5 text-slate-400">업로드한 이미지는 즉시 모든 이용자의 해당 아이돌 영토에 표시되며, 다른 이용자가 새 이미지를 올리면 교체됩니다.</p>
      <input className="mt-3 block w-full text-xs text-slate-300 file:mr-2 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-white" type="file" accept="image/png,image/jpeg,image/webp" disabled={isUploading} onChange={(event) => chooseFile(event.target.files?.[0])} />
      {selected ? <div className="mt-3 grid grid-cols-[72px_1fr] gap-3"><NextImage unoptimized src={selected.url} width={72} height={72} alt="업로드 미리보기" className="size-[72px] rounded-lg bg-slate-950 object-contain [image-rendering:pixelated]" /><div className="min-w-0 text-xs text-slate-300"><p className="break-all font-semibold">{selected.file.name}</p><p className="mt-1">{formatBytes(selected.file.size)} · {selected.width}×{selected.height}</p></div></div> : null}
      <label className="mt-3 flex items-start gap-2 text-xs text-slate-300"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />업로드한 이미지가 즉시 공개된다는 점을 확인했습니다.</label>
      <button type="button" disabled={!canSubmitIdolImage({ hasValidImage: Boolean(selected), confirmed, pending: isUploading, remainingSeconds })} onClick={() => void submit()} className="mt-3 w-full rounded-lg bg-rose-500 px-3 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{isUploading ? "업로드 중..." : remainingSeconds > 0 ? `${remainingSeconds}초 후 다시 가능` : "대표 이미지 업로드"}</button>
      {message ? <p role="status" className={`mt-2 text-xs ${message.kind === "success" ? "text-emerald-300" : "text-rose-300"}`}>{message.text}</p> : null}
    </section>
  );
}
