// utils/pricing.ts
//
// Single source of truth for API pricing used by the admin cost footer on
// DreamCard. Update these constants when OpenAI or BFL change their rates.
// All values are USD.
//
// gpt-5.6-luna (public OpenAI pricing, after the 2026-07-30 price cut):
//   input  $0.20 per 1M tokens  →  $0.0000002 per token
//   output $1.20 per 1M tokens  →  $0.0000012 per token
// (was gpt-4.1-mini at $0.40 / $1.60 — that family's final API cutoff is
//  2026-10-14; see MODEL_COST_REVIEW_2026-07-31.md)
//
// ⚠️ These constants assume OPENAI_MODEL is the Luna-class default. If you
// point OPENAI_MODEL_PROFOUND at Terra ($2.00 / $12.00) for an A/B, the
// admin cost footer will UNDER-report those rows by ~10×. Per-row accuracy
// needs a `model_used` column — see the same memo, action A5.
//
// FLUX.2 [klein] 9B via BFL — now a published rate, not an estimate:
//   "FLUX.2 [klein] 9B — from $0.015" · https://docs.bfl.ml/quick_start/pricing
//   Flat for the first megapixel, so 1024×1024 (1.05 MP) bills the same as
//   the old 512×512 (0.26 MP) did.

export const OPENAI_INPUT_USD_PER_1K = 0.0002; // $0.20 / 1M tokens
export const OPENAI_OUTPUT_USD_PER_1K = 0.0012; // $1.20 / 1M tokens

/** USD attributed to one successful FLUX.2 [klein] 9B ≤1 MP generation. */
export const FLUX_IMAGE_COST_USD = 0.015;

export interface DreamCostBreakdown {
  inputTokens: number | null;
  outputTokens: number | null;
  imageGenerated: boolean;
  imageCostUsd: number | null;
  /** Pre-computed totals so the UI doesn't have to redo the math. */
  openAiCostUsd: number;
  totalCostUsd: number;
}

/**
 * Compute the OpenAI USD cost for a single call given token counts.
 * Returns 0 when tokens are missing rather than throwing — older rows
 * predate token logging and shouldn't crash the admin footer.
 */
export function openAiCostUsd(
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined,
): number {
  const inCost = ((inputTokens ?? 0) / 1000) * OPENAI_INPUT_USD_PER_1K;
  const outCost = ((outputTokens ?? 0) / 1000) * OPENAI_OUTPUT_USD_PER_1K;
  return inCost + outCost;
}

/** Bundle the per-row numbers into a single object for the UI. */
export function buildDreamCost(row: {
  input_tokens?: number | null;
  output_tokens?: number | null;
  image_generated?: boolean | null;
  image_cost_usd?: number | null;
}): DreamCostBreakdown {
  const openAi = openAiCostUsd(row.input_tokens, row.output_tokens);
  const image =
    row.image_cost_usd != null
      ? Number(row.image_cost_usd)
      : row.image_generated
        ? FLUX_IMAGE_COST_USD
        : 0;
  return {
    inputTokens: row.input_tokens ?? null,
    outputTokens: row.output_tokens ?? null,
    imageGenerated: Boolean(row.image_generated),
    imageCostUsd: row.image_cost_usd ?? (row.image_generated ? FLUX_IMAGE_COST_USD : null),
    openAiCostUsd: openAi,
    totalCostUsd: openAi + image,
  };
}

/** Format a USD figure for the badge. Goes down to a tenth of a cent. */
export function formatUsd(amount: number): string {
  if (amount >= 0.01) return `$${amount.toFixed(3)}`;
  if (amount > 0) return `$${amount.toFixed(4)}`;
  return "$0.0000";
}
