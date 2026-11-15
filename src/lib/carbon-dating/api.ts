import { request } from "@/lib/game/api";
import type { CarbonReveal, PublicCarbonBoard } from "./game";

export const fetchCarbonDay = (date: string) =>
  request<PublicCarbonBoard>(`/api/carbon-dating/day/${encodeURIComponent(date)}`);

export const guessCarbonYear = (boardId: string, round: number, year: number) =>
  request<CarbonReveal>(`/api/carbon-dating/${encodeURIComponent(boardId)}/guess`, {
    method: "POST",
    body: JSON.stringify({ round, year }),
  });
