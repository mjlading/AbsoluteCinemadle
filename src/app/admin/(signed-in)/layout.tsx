import type { Metadata } from "next";
import Link from "next/link";

import { logout } from "../actions";

export const metadata: Metadata = { title: "Admin | Absolute Cinemadle", robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-ink/10 bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="font-display text-2xl font-[900] leading-none">
            Cinemadle editor
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="underline-offset-2 hover:underline">
              Open the game
            </Link>
            <form action={logout}>
              <button type="submit" className="underline-offset-2 hover:underline">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
    </div>
  );
}
