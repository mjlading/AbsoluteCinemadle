import { RULES } from "@/config/rules";
import { POINTS } from "@/config/scoring";
import type { GuessPick, PublicSoundNode, PublicSoundbytesBoard, SoundbytesAnswer } from "./types";

/*
 * A Soundbytes game as the player's browser keeps it. The server only checks
 * guesses and hands out the answer once it is earned; points are tracked
 * here, so a determined player can only cheat their own score.
 */

export interface GuessRecord {
  kind: GuessPick["kind"];
  tmdbId: number;
  /** The film's title or the person's name, as picked. */
  name: string;
  correct: boolean;
}

export interface SoundbytesState {
  /** False until the player first taps the free node; nothing counts before that. */
  started: boolean;
  /** Nodes the player owns, in the order bought; the free one is always first. */
  bought: string[];
  /** Nodes whose disguise has been removed. */
  revealed: string[];
  guesses: GuessRecord[];
  status: "playing" | "won" | "lost";
  /** Set once the game is over: earned by a right guess, or revealed on a loss. */
  answer: SoundbytesAnswer | null;
}

export type SoundbytesAction =
  | { type: "start" }
  | { type: "buy"; nodeId: string }
  | { type: "reveal"; nodeId: string }
  | { type: "guess"; pick: GuessPick; correct: boolean; answer?: SoundbytesAnswer }
  | { type: "give_up" }
  | { type: "show_answer"; answer: SoundbytesAnswer };

/** Where a node is: not bought, bought with its disguise on, or bought and revealed. */
export type NodeStage = "locked" | "disguised" | "revealed";

export function initialSoundbytesState(board: PublicSoundbytesBoard): SoundbytesState {
  return {
    started: false,
    bought: board.nodes.filter((n) => n.free).map((n) => n.id),
    revealed: [],
    guesses: [],
    status: "playing",
    answer: null,
  };
}

export const pickName = (pick: GuessPick) => (pick.kind === "film" ? pick.title : pick.name);

export const guessesLeft = (state: SoundbytesState) => RULES.soundbytes.maxGuesses - state.guesses.length;

export const correctActors = (state: SoundbytesState) => state.guesses.filter((g) => g.kind === "person" && g.correct);

export function nodeStage(state: SoundbytesState, nodeId: string): NodeStage {
  if (state.revealed.includes(nodeId)) return "revealed";
  return state.bought.includes(nodeId) ? "disguised" : "locked";
}

/** Points left: the start, less every buy and removal, plus actor bonuses; zero for a loss. */
export function soundbytesScore(board: PublicSoundbytesBoard, state: SoundbytesState): number {
  if (state.status === "lost") return 0;
  const cost = (ids: string[], price: (n: PublicSoundNode) => number) =>
    ids.reduce((sum, id) => {
      const n = board.nodes.find((node) => node.id === id);
      return sum + (n ? price(n) : 0);
    }, 0);
  return (
    POINTS.soundbytes.start -
    cost(state.bought, (n) => n.buyCost) -
    cost(state.revealed, (n) => n.revealCost) +
    correctActors(state).length * POINTS.soundbytes.perCorrectActor
  );
}

/** What a hold on this node would cost right now, or null if a hold does nothing. */
export function holdCost(board: PublicSoundbytesBoard, state: SoundbytesState, nodeId: string): number | null {
  const n = board.nodes.find((node) => node.id === nodeId);
  if (!n || !state.started || state.status !== "playing") return null;
  const stage = nodeStage(state, nodeId);
  if (stage === "locked") return n.buyCost;
  if (stage === "disguised") return n.revealCost;
  return null;
}

export const canAfford = (board: PublicSoundbytesBoard, state: SoundbytesState, nodeId: string) => {
  const cost = holdCost(board, state, nodeId);
  return cost !== null && soundbytesScore(board, state) >= cost;
};

/** A pick already guessed is turned away for free. */
export const alreadyGuessed = (state: SoundbytesState, pick: GuessPick) =>
  state.guesses.some((g) => g.kind === pick.kind && g.tmdbId === pick.tmdbId);

export function soundbytesReducer(board: PublicSoundbytesBoard) {
  return (state: SoundbytesState, action: SoundbytesAction): SoundbytesState => {
    switch (action.type) {
      case "start":
        return { ...state, started: true };
      case "buy":
        return nodeStage(state, action.nodeId) === "locked" && canAfford(board, state, action.nodeId)
          ? { ...state, bought: [...state.bought, action.nodeId] }
          : state;
      case "reveal":
        return nodeStage(state, action.nodeId) === "disguised" && canAfford(board, state, action.nodeId)
          ? { ...state, revealed: [...state.revealed, action.nodeId] }
          : state;
      case "guess": {
        if (!state.started || state.status !== "playing" || alreadyGuessed(state, action.pick)) return state;
        const record: GuessRecord = {
          kind: action.pick.kind,
          tmdbId: action.pick.tmdbId,
          name: pickName(action.pick),
          correct: action.correct,
        };
        const next = { ...state, guesses: [...state.guesses, record] };
        if (action.correct && action.pick.kind === "film") {
          return { ...next, status: "won", answer: action.answer ?? null };
        }
        return guessesLeft(next) <= 0 ? { ...next, status: "lost" } : next;
      }
      case "give_up":
        return state.status === "playing" ? { ...state, status: "lost" } : state;
      case "show_answer":
        return { ...state, answer: action.answer };
    }
  };
}
