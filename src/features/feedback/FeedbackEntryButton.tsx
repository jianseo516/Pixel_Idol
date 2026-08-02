"use client";

import { useState } from "react";
import { FeedbackModal } from "./FeedbackModal";

interface Props {
  readonly className?: string;
  readonly label?: string;
}

export function FeedbackEntryButton({ className = "", label = "건의·오류 신고" }: Props) {
  const [open, setOpen] = useState(false);
  return <>{<button type="button" onClick={() => setOpen(true)} className={className}>{label}</button>}{open ? <FeedbackModal onClose={() => setOpen(false)} /> : null}</>;
}
