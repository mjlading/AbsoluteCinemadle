"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * A destructive button that asks for a second click instead of a browser
 * dialog. The request to confirm expires after a few seconds.
 */
export function ConfirmButton({
  onConfirm,
  confirmLabel,
  disabled,
  className = "",
  children,
}: {
  onConfirm: () => void;
  confirmLabel: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      className={`${className} ${armed ? "text-marker font-semibold" : ""}`}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
