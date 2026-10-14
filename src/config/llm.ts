/**
 * The only LLM the app may call, its price, and the lifetime spend cap.
 * Changing any of these needs the owner's approval (see AGENTS.md).
 */
export const LLM = {
  model: "claude-haiku-5-5",
  /** Price in millionths of a US dollar per token, for prompts up to 100,000 tokens ($0.10 / $0.50 per million). */
  microUsdPerInputToken: 0.1,
  microUsdPerOutputToken: 0.5,
  /** USD 10, in millionths of a dollar. */
  spendCapMicroUsd: 10_000_000,
} as const;
