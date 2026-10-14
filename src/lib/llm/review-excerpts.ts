import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { LLM } from "@/config/llm";
import { blankNames, type NamesToBlank } from "@/lib/hints/blank-names";
import { maxInputTokens } from "./cost";
import { withSpendGuard } from "./spend-guard";

const MAX_OUTPUT_TOKENS = 600;
const MAX_REVIEWS = 6;
const MAX_REVIEW_CHARS = 1500;

const SYSTEM = `You choose short excerpts from film reviews to use as hints in a film guessing game.
A good excerpt evokes the film (its mood, story, craft or a famous moment) without naming it or anyone in it.
Quote the reviewer's own words: you may cut words and mark the cut with "...", but never rewrite.
Keep each excerpt to one or two sentences and under 200 characters.
Replace any name of the film, its cast, characters or director with [film], [actor], [character] or [director].
Skip excerpts that give the title away by describing it word for word.`;

const Excerpts = z.object({ excerpts: z.array(z.object({ text: z.string(), author: z.string() })) });

let client: Anthropic | undefined;

/** Up to three review excerpts the admin can choose from, with names blanked twice over. */
export async function suggestReviewExcerpts(input: {
  filmTitle: string;
  names: NamesToBlank;
  reviews: { author: string; content: string }[];
}): Promise<{ excerpt: string; author: string }[]> {
  const reviews = input.reviews
    .slice(0, MAX_REVIEWS)
    .map((r) => `<review author=${JSON.stringify(r.author)}>\n${r.content.slice(0, MAX_REVIEW_CHARS)}\n</review>`)
    .join("\n\n");
  const names = [...input.names.titles, ...input.names.actors, ...input.names.characters, ...input.names.directors];
  const prompt = [
    `The film is ${JSON.stringify(input.filmTitle)}.`,
    `Names to replace: ${names.join(", ")}.`,
    "",
    reviews,
    "",
    "Pick the three best excerpts, each from any of the reviews above, and say whose review it came from.",
  ].join("\n");

  return withSpendGuard(
    "review-hint-excerpts",
    { inputTokens: maxInputTokens(SYSTEM + prompt), outputTokens: MAX_OUTPUT_TOKENS },
    async () => {
      client ??= new Anthropic();
      const response = await client.messages.parse({
        model: LLM.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        thinking: { type: "disabled" },
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: zodOutputFormat(Excerpts) },
      });
      const excerpts = (response.parsed_output?.excerpts ?? [])
        .map((e) => ({ excerpt: blankNames(e.text.trim(), input.names), author: e.author.trim() }))
        .filter((e) => e.excerpt && e.author)
        .slice(0, 3);
      return {
        result: excerpts,
        usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
      };
    },
  );
}
