import "server-only";

import { eq, sql } from "drizzle-orm";

import { LLM } from "@/config/llm";
import { db } from "@/db/client";
import { llmUsage } from "@/db/schema";
import { costMicroUsd, fitsUnderCap, type TokenUsage } from "./cost";

export class SpendCapError extends Error {}

/** Lifetime LLM spend so far, in millionths of a dollar (reservations included). */
export async function spentMicroUsd(): Promise<number> {
  const [row] = await db()
    .select({ total: sql<number>`coalesce(sum(${llmUsage.costMicroUsd}), 0)::int` })
    .from(llmUsage);
  return row.total;
}

/**
 * Runs one LLM call under the spend cap. Its worst-case cost is reserved first,
 * under a lock, so concurrent calls can never overshoot together; afterwards the
 * reservation is replaced by the real cost. A failed call keeps its reservation,
 * since it may still have been billed.
 */
export async function withSpendGuard<T>(
  purpose: string,
  worstCase: TokenUsage,
  call: () => Promise<{ result: T; usage: TokenUsage }>,
): Promise<T> {
  const reserve = costMicroUsd(worstCase);
  const reservationId = await db().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('llm_spend'))`);
    const [{ total }] = await tx
      .select({ total: sql<number>`coalesce(sum(${llmUsage.costMicroUsd}), 0)::int` })
      .from(llmUsage);
    if (!fitsUnderCap(total, reserve)) {
      throw new SpendCapError("The USD 10 LLM budget is used up, so suggestions are off.");
    }
    const [row] = await tx
      .insert(llmUsage)
      .values({ purpose, model: LLM.model, status: "reserved", costMicroUsd: reserve })
      .returning({ id: llmUsage.id });
    return row.id;
  });

  try {
    const { result, usage } = await call();
    await db()
      .update(llmUsage)
      .set({
        status: "settled",
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costMicroUsd: costMicroUsd(usage),
      })
      .where(eq(llmUsage.id, reservationId));
    return result;
  } catch (error) {
    await db().update(llmUsage).set({ status: "failed" }).where(eq(llmUsage.id, reservationId));
    throw error;
  }
}
