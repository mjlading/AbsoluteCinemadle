"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}

/** A native modal dialog: focus trapping, Escape and focus restore come from the browser. */
export function Dialog({ open, onClose, labelledBy, className = "", children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // A layout effect, so the dialog is open before paint and callers can animate it from its final position.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] rounded-xl p-0 shadow-2xl ${className}`}
    >
      {open && <div className="p-5">{children}</div>}
    </dialog>
  );
}
