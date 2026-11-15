import { request } from "@/lib/game/api";
import type { DeepCutGuessResult, DeepCutReveal, PublicDeepCutBoard } from "./types";

/* The client's calls to /api/deep-cut/... */

export const fetchDeepCutDay = (date: string) =>
  request<PublicDeepCutBoard>(`/api/deep-cut/day/${encodeURIComponent(date)}`);

export const guessDeepCut = (boardId: string, prompt: number, tmdbId: number, triesUsed: number) =>
  request<DeepCutGuessResult>(`/api/deep-cut/${encodeURIComponent(boardId)}/guess`, {
    method: "POST",
    body: JSON.stringify({ prompt, tmdbId, triesUsed }),
  });

export const revealDeepCut = (boardId: string, prompt: number) =>
  request<DeepCutReveal>(`/api/deep-cut/${encodeURIComponent(boardId)}/reveal`, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
