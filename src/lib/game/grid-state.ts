import { RULES } from "@/config/rules";
import type {
  GuessResult,
  HintKind,
  IssuedHint,
  IssuedReviewHint,
  IssuedSoundHint,
  PublicPuzzle,
  SolvedGroup,
} from "@/lib/puzzle/types";
import { seededRandom, shuffled } from "@/lib/random";

export type GridStatus = "playing" | "won" | "lost";

export interface GridState {
  date: string;
  /** Unsolved tile ids in display order. */
  order: string[];
  selected: string[];
  /** Groups the player found, in the order they were found. */
  solved: SolvedGroup[];
  /** Groups shown to the player after the round was lost, easiest first. */
  revealed: SolvedGroup[];
  mistakes: number;
  /** Every submitted guess as sorted tile ids, in submission order. */
  guesses: string[][];
  /** Labels of flipped tiles, by tile id. */
  labels: Record<string, string>;
  /** Hints the player has taken, kept so they can look at them again. */
  soundHints: IssuedSoundHint[];
  reviewHints: IssuedReviewHint[];
  status: GridStatus;
}

export type GridAction =
  | { type: "toggle"; tileId: string }
  | { type: "deselect_all" }
  | { type: "shuffle"; seed: string }
  | { type: "guess_resolved"; tileIds: string[]; result: GuessResult }
  | { type: "label_revealed"; tileId: string; label: string }
  | ({ type: "hint_used" } & IssuedHint)
  | { type: "group_revealed"; group: SolvedGroup };

export function initialGridState(puzzle: PublicPuzzle): GridState {
  return {
    date: puzzle.date,
    order: puzzle.tiles.map((t) => t.id),
    selected: [],
    solved: [],
    revealed: [],
    mistakes: 0,
    guesses: [],
    labels: {},
    soundHints: [],
    reviewHints: [],
    status: "playing",
  };
}

const guessKey = (tileIds: readonly string[]) => [...tileIds].sort().join(",");

/** True if exactly this set of tiles was already submitted. */
export function isRepeatGuess(state: GridState, tileIds: readonly string[]): boolean {
  const key = guessKey(tileIds);
  return state.guesses.some((g) => guessKey(g) === key);
}

export function canSubmit(state: GridState): boolean {
  return state.status === "playing" && state.selected.length === RULES.grid.groupSize;
}

export function mistakesLeft(state: GridState): number {
  return RULES.grid.maxMistakes - state.mistakes;
}

export function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case "toggle": {
      if (state.status !== "playing" || !state.order.includes(action.tileId)) return state;
      if (state.selected.includes(action.tileId)) {
        return { ...state, selected: state.selected.filter((id) => id !== action.tileId) };
      }
      if (state.selected.length >= RULES.grid.groupSize) return state;
      return { ...state, selected: [...state.selected, action.tileId] };
    }

    case "deselect_all":
      return state.selected.length === 0 ? state : { ...state, selected: [] };

    case "shuffle":
      return { ...state, order: shuffled(state.order, seededRandom(action.seed)) };

    case "guess_resolved": {
      if (state.status !== "playing") return state;
      const guesses = [...state.guesses, [...action.tileIds].sort()];
      const { result } = action;

      if (result.kind === "correct") {
        const solved = [...state.solved, result.group];
        const inGroup = new Set(result.group.tileIds);
        return {
          ...state,
          guesses,
          solved,
          order: state.order.filter((id) => !inGroup.has(id)),
          selected: [],
          status: solved.length === RULES.grid.groupCount ? "won" : "playing",
        };
      }

      const mistakes = state.mistakes + 1;
      const lost = mistakes >= RULES.grid.maxMistakes;
      return {
        ...state,
        guesses,
        mistakes,
        selected: lost ? [] : state.selected,
        status: lost ? "lost" : "playing",
      };
    }

    case "hint_used": {
      const taken = takenHints(state, action.kind);
      if (state.status !== "playing" || taken.length >= dailyHintLimit(action.kind)) return state;
      if (taken.some((h) => h.token === action.hint.token)) return state;
      return action.kind === "sound"
        ? { ...state, soundHints: [...state.soundHints, action.hint] }
        : { ...state, reviewHints: [...state.reviewHints, action.hint] };
    }

    case "label_revealed":
      if (state.labels[action.tileId] === action.label) return state;
      return { ...state, labels: { ...state.labels, [action.tileId]: action.label } };

    case "group_revealed": {
      const { group } = action;
      const known = [...state.solved, ...state.revealed].some((g) => g.filmId === group.filmId);
      if (state.status !== "lost" || known) return state;
      const inGroup = new Set(group.tileIds);
      return {
        ...state,
        revealed: [...state.revealed, group],
        order: state.order.filter((id) => !inGroup.has(id)),
      };
    }
  }
}

const dailyHintLimit = (kind: HintKind) => (kind === "sound" ? RULES.grid.maxSoundHints : RULES.grid.maxReviewHints);
const takenHints = (state: GridState, kind: HintKind) => (kind === "sound" ? state.soundHints : state.reviewHints);

/**
 * Hints of a kind the player can still take: the daily limit, or fewer when
 * fewer of the puzzle's films have that kind of hint (`offered`).
 */
export function hintsLeft(state: GridState, kind: HintKind, offered: number): number {
  return Math.max(0, Math.min(dailyHintLimit(kind), offered) - takenHints(state, kind).length);
}

/** Tokens of the hints of a kind the player already has, so the server hands out a new one. */
export const seenHintTokens = (state: GridState, kind: HintKind) => takenHints(state, kind).map((h) => h.token);

/** The films the player has found so far, which hints must skip. */
export const solvedFilmIds = (state: GridState) => state.solved.map((g) => g.filmId);
