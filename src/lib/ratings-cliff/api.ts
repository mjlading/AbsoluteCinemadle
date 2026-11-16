import { request } from "@/lib/game/api";
import type { PublicRatingsCliffBoard, RatingsCliffDay, RatingsCliffGuessResult } from "./types";

export const fetchRatingsCliffDays = () => request<{ days: RatingsCliffDay[] }>("/api/ratings-cliff");

export const fetchRatingsCliffDay = (date: string) =>
  request<PublicRatingsCliffBoard>(`/api/ratings-cliff/day/${encodeURIComponent(date)}`);

export const guessRatingsCliff = (boardId: string, round: number, option: string) =>
  request<RatingsCliffGuessResult>(`/api/ratings-cliff/${encodeURIComponent(boardId)}/guess`, {
    method: "POST",
    body: JSON.stringify({ round, option }),
  });
