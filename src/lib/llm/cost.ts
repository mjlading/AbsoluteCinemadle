import { LLM } from "@/config/llm";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** What a call costs, in whole millionths of a dollar, rounded up so the ledger never under-counts. */
export function costMicroUsd({ inputTokens, outputTokens }: TokenUsage): number {
  return Math.ceil(inputTokens * LLM.microUsdPerInputToken + outputTokens * LLM.microUsdPerOutputToken);
}

/**
 * A safe upper bound on the input tokens of a prompt: no tokenizer produces
 * more tokens than characters, plus room for message framing.
 */
export function maxInputTokens(promptText: string): number {
  return promptText.length + 100;
}

/** Whether a call that may cost `reserve` fits under the cap after `spent`. */
export function fitsUnderCap(spentMicroUsd: number, reserveMicroUsd: number): boolean {
  return spentMicroUsd + reserveMicroUsd <= LLM.spendCapMicroUsd;
}

export const formatUsd = (microUsd: number) => `$${(microUsd / 1_000_000).toFixed(microUsd < 10_000 ? 4 : 2)}`;
