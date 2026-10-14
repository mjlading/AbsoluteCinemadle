import type { Metadata } from "next";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin sign-in | Absolute Cinemadle", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4">
      <h1 className="font-display text-4xl font-[900] leading-none">Absolute Cinemadle</h1>
      <p className="mt-1 text-ink-soft">Puzzle editor</p>
      <LoginForm />
    </main>
  );
}
