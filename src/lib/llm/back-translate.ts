import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { LLM } from "@/config/llm";
import { countryName, languageName } from "@/lib/warmup/names";
import { maxInputTokens } from "./cost";
import { withSpendGuard } from "./spend-guard";

const MAX_OUTPUT_TOKENS = 300;

const SYSTEM = `You translate film titles into English for a guessing game.
Players see your translation and must work out which film it is, so it has to be literal:
translate word for word, keep the original word order where English allows, and keep names as they are.
Never give the film's official English title, never name the film, and never add explanations.`;

const Candidates = z.object({ candidates: z.array(z.string()) });

let client: Anthropic | undefined;

/** Up to three literal back-translations of a foreign film title, most literal first. */
export async function suggestLiteralTranslations(input: {
  foreignTitle: string;
  language: string;
  country: string | null;
}): Promise<string[]> {
  const prompt = [
    `Foreign title: ${JSON.stringify(input.foreignTitle)}`,
    `Language: ${languageName(input.language)}`,
    input.country ? `Country of release: ${countryName(input.country)}` : null,
    "",
    "Give three translations, from the most literal (word for word, even if awkward) to a slightly smoother one that is still literal.",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return withSpendGuard(
    "warmup-back-translation",
    { inputTokens: maxInputTokens(SYSTEM + prompt), outputTokens: MAX_OUTPUT_TOKENS },
    async () => {
      client ??= new Anthropic();
      const response = await client.messages.parse({
        model: LLM.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        thinking: { type: "disabled" },
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: zodOutputFormat(Candidates) },
      });
      const candidates = (response.parsed_output?.candidates ?? [])
        .map((c) => c.trim())
        .filter((c, i, all) => c && all.indexOf(c) === i)
        .slice(0, 3);
      return {
        result: candidates,
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
      };
    },
  );
}
