import { request } from "@/lib/game/api";
import type { HowOldReveal, PublicHowOldBoard } from "./types";

export const fetchHowOldDay = (date: string) =>
  request<PublicHowOldBoard>(`/api/how-old/day/${encodeURIComponent(date)}`);

export const guessHowOld = (boardId: string, round: number, age: number) =>
  request<HowOldReveal>(`/api/how-old/${encodeURIComponent(boardId)}/guess`, {
    method: "POST",
    body: JSON.stringify({ round, age }),
  });
