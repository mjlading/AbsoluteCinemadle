import { request } from "@/lib/game/api";
import type { DoubleFeatureReveal, PublicDoubleFeatureBoard } from "./types";

export const fetchDoubleFeatureDay = (date: string) =>
  request<PublicDoubleFeatureBoard>(`/api/double-feature/day/${encodeURIComponent(date)}`);

export const guessDoubleFeature = (boardId: string, round: number, option: string) =>
  request<DoubleFeatureReveal>(`/api/double-feature/${encodeURIComponent(boardId)}/guess`, {
    method: "POST",
    body: JSON.stringify({ round, option }),
  });
