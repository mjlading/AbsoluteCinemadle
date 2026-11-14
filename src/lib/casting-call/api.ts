import { request } from "@/lib/game/api";
import type { CastingBestRoute, CastingCallDay, CastingGuessResult, FoundFace, PublicCastingBoard } from "./types";

const base = (boardId: string) => `/api/casting-call/${encodeURIComponent(boardId)}`;

export const fetchCastingCallDays = () => request<{ days: CastingCallDay[] }>("/api/casting-call");

export const fetchCastingCallDay = (date: string) =>
  request<PublicCastingBoard>(`/api/casting-call/day/${encodeURIComponent(date)}`);

export const guessCastingFilm = (boardId: string, tmdbId: number) =>
  request<CastingGuessResult>(`${base(boardId)}/guess`, { method: "POST", body: JSON.stringify({ tmdbId }) });

export const fetchCastingSolution = (boardId: string) => request<{ faces: FoundFace[] }>(`${base(boardId)}/solution`);

export const fetchCastingBestRoute = (boardId: string) => request<CastingBestRoute>(`${base(boardId)}/best-route`);
