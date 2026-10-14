import type { BonusResult, PublicBonus } from "@/lib/puzzle/types";

/** What the player is holding: a film waiting for a barcode, or a barcode waiting for a film. */
export type Picked = { kind: "film"; filmId: number } | { kind: "barcode"; barcodeId: string } | null;

export interface BonusState {
  /** Film assigned to each barcode, by barcode id. */
  assignments: Record<string, number>;
  picked: Picked;
  results: BonusResult[] | null;
}

export type BonusAction =
  | { type: "pick_film"; filmId: number }
  | { type: "pick_barcode"; barcodeId: string }
  | { type: "assign"; barcodeId: string; filmId: number }
  | { type: "unassign"; barcodeId: string }
  | { type: "checked"; results: BonusResult[] };

export const initialBonusState: BonusState = { assignments: {}, picked: null, results: null };

/** Puts a film on a barcode; the film leaves any other barcode, and the barcode's old film goes back. */
function assign(state: BonusState, barcodeId: string, filmId: number): BonusState {
  const assignments = Object.fromEntries(Object.entries(state.assignments).filter(([, f]) => f !== filmId));
  return { ...state, assignments: { ...assignments, [barcodeId]: filmId }, picked: null };
}

export function bonusReducer(state: BonusState, action: BonusAction): BonusState {
  if (state.results) return state;
  switch (action.type) {
    case "pick_film": {
      if (state.picked?.kind === "barcode") return assign(state, state.picked.barcodeId, action.filmId);
      const same = state.picked?.kind === "film" && state.picked.filmId === action.filmId;
      return { ...state, picked: same ? null : { kind: "film", filmId: action.filmId } };
    }
    case "pick_barcode": {
      if (state.picked?.kind === "film") return assign(state, action.barcodeId, state.picked.filmId);
      const same = state.picked?.kind === "barcode" && state.picked.barcodeId === action.barcodeId;
      return { ...state, picked: same ? null : { kind: "barcode", barcodeId: action.barcodeId } };
    }
    case "assign":
      return assign(state, action.barcodeId, action.filmId);
    case "unassign": {
      const assignments = { ...state.assignments };
      delete assignments[action.barcodeId];
      return { ...state, assignments, picked: null };
    }
    case "checked":
      return { ...state, results: action.results, picked: null };
  }
}

export const allAssigned = (state: BonusState, bonus: PublicBonus) =>
  bonus.barcodes.every((b) => state.assignments[b.id] !== undefined);

export const correctCount = (state: BonusState) => state.results?.filter((r) => r.correct).length ?? 0;
