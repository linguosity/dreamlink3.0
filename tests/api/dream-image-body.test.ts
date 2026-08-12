import { describe, it, expect } from "vitest";
import { bodySchema } from "@/app/api/dream-image/route";

// Regression pin for a silent production failure: /api/dream-image answered
// 400 "Invalid request body" on every ordinary dream submission, so no image
// was ever generated and image_url stayed null forever.
//
// Cause: the schema used `z.string().optional()`, which accepts
// `string | undefined` and REJECTS `null`. Both callers forward values that
// are genuinely nullable — CompactDreamInput sends
// `comparisonGroupId: result.comparisonGroupId ?? null` on every non-matrix
// dream, and DreamCard's retry reads title/summary/topicSentence straight off
// a row whose columns are nullable.
//
// Nothing surfaced it because `fetch` resolves on a 400; only the network-error
// `.catch` was wired up.
describe("dream-image request body", () => {
  it("accepts the payload CompactDreamInput actually sends", () => {
    const parsed = bodySchema.safeParse({
      dreamId: "4d3942cf-d2d2-42b3-8e8a-ac320025cc80",
      title: "Pear, Bear, and Quicksand",
      summary: "An analysis.",
      topicSentence: "A topic sentence.",
      aesthetic: "sacred_oil_painting",
      // The literal null that produced the 400.
      comparisonGroupId: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts nulls from nullable dream_entries columns (retry path)", () => {
    const parsed = bodySchema.safeParse({
      dreamId: "4d3942cf-d2d2-42b3-8e8a-ac320025cc80",
      title: null,
      summary: null,
      topicSentence: null,
    });
    expect(parsed.success).toBe(true);
    // Normalised so prompt building never sees null.
    if (parsed.success) {
      expect(parsed.data.title).toBe("");
      expect(parsed.data.summary).toBe("");
      expect(parsed.data.topicSentence).toBe("");
      expect(parsed.data.comparisonGroupId).toBeUndefined();
    }
  });

  it("still rejects a non-uuid dreamId", () => {
    expect(bodySchema.safeParse({ dreamId: "not-a-uuid" }).success).toBe(false);
  });

  it("still rejects an over-long summary", () => {
    const parsed = bodySchema.safeParse({
      dreamId: "4d3942cf-d2d2-42b3-8e8a-ac320025cc80",
      summary: "x".repeat(4001),
    });
    expect(parsed.success).toBe(false);
  });
});
