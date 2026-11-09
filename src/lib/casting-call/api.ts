import { request } from "@/lib/game/api";
import type { CastingGuessResult, FoundFace, PublicCastingBoard } from "./types";

const base = (boardId: string) => `/api/casting-call/${encodeURIComponent(boardId)}`;

export const fetchCastingBoard = (boardId: string) => request<PublicCastingBoard>(base(boardId));

export const guessCastingFilm = (boardId: string, tmdbId: number) =>
  request<CastingGuessResult>(`${base(boardId)}/guess`, { method: "POST", body: JSON.stringify({ tmdbId }) });

export const fetchCastingSolution = (boardId: string) => request<{ faces: FoundFace[] }>(`${base(boardId)}/solution`);
