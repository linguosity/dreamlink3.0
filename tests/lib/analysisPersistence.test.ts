import { describe, it, expect, vi, beforeEach } from "vitest";

// This replaces the "analyzeAndUpdateDream function" case in
// tests/api/dream-entries.test.ts. That test named a function the route no
// longer has — the persistence step moved into lib/analysisPersistence so the
// submit route and the "Read again" route produce identically-shaped readings —
// and it drove the code through a POST request, so it could only observe the
// write via a hand-rolled Supabase mock. It also asserted on `raw_analysis`,
// a column that is now `raw_analysis_enc` and encrypted at rest.
//
// Testing analyzeAndPersist directly keeps the original intent (the analysis
// actually lands on the dream row) and gains the ability to assert what the
// route-level test never could: that the stored blob is ciphertext, and that
// unresolvable citations are dropped rather than persisted as bad verse text.

// vi.fn(impl) rather than .mockResolvedValue(): clearAllMocks (in beforeEach
// here and afterEach in tests/setup.ts) drops values set the second way, and a
// stub that starts returning undefined mid-suite sends the code under test
// down its error path with no visible cause.
const updateEq = vi.fn(async () => ({ data: null, error: null }));
const updateMock = vi.fn(() => ({ eq: updateEq }));
const insertMock = vi.fn(async () => ({ data: null, error: null }));
const deleteEq = vi.fn(async () => ({ data: null, error: null }));

// analyzeAndPersist takes the admin client as an argument rather than reaching
// for getAdminClient itself, so the stub is passed in below.
function makeAdminStub() {
  return {
    from: vi.fn(() => ({
      update: updateMock,
      insert: insertMock,
      delete: vi.fn(() => ({ eq: deleteEq })),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: null, error: null })),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    })),
  };
}

// The only network call in this module.
vi.mock("@/lib/dreamAnalysis", () => ({
  runDreamAnalysis: vi.fn(async () => ({
    analysis: {
      topicSentence: "Your dream reflects a season of transition.",
      supportingPoints: [
        "The river points to God's presence (Psalm 23:4).",
        "The bridge suggests faith carrying you forward (Isaiah 43:2).",
        // Deliberately unresolvable: no such book, so it must not be stored
        // as a citation row.
        "An invented reference (Nonexistent 4:5).",
      ],
      conclusionSentence: "Consider where you are being carried.",
      analysis: "Full analysis text.",
      // The module reads citations from this structured field, one per
      // supporting point — it does not scrape them out of the prose. Omitting
      // it leaves bible_refs empty and writes no citation rows at all.
      biblicalReferences: [
        { citation: "Psalm 23:4", theme: "presence in the valley" },
        { citation: "Isaiah 43:2", theme: "passing through the waters" },
        { citation: "Nonexistent 4:5", theme: "unresolvable on purpose" },
      ],
      dreamSummary: "A crossing over water.",
      dreamTitle: "The Bridge",
      tags: ["water", "transition"],
    },
    usage: { inputTokens: 1200, outputTokens: 340 },
  })),
}));

vi.mock("@/lib/openai", () => ({
  getModelForDepth: vi.fn(() => "gpt-test"),
}));

// Resolving citations pulls in data/kjv.json, so the first run in the file
// pays a one-off load that overruns the 5s default.
describe("analyzeAndPersist", { timeout: 30_000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // bypassCache defaults to true here because the module keeps an in-memory
  // analysis cache keyed on the dream. Without it the first test warmed the
  // cache and every later one hit it, which by design reports zero tokens (a
  // cache hit bills nothing) — so telemetry and citation assertions failed
  // against a path that was behaving correctly. The cache gets its own test
  // below rather than silently shaping all the others.
  async function run(overrides: Record<string, unknown> = {}) {
    const { analyzeAndPersist } = await import("@/lib/analysisPersistence");
    return analyzeAndPersist({
      adminSupabase: makeAdminStub() as never,
      dreamId: "test-dream-id",
      dreamText: "I was walking across a bridge over a river of golden light.",
      depth: "shallow" as never,
      readingLevel: "celestial_insight" as never,
      bypassCache: true,
      ...overrides,
    } as never);
  }

  it("writes the analysis onto the dream row", async () => {
    const result = await run();

    expect(result.analysis).toBeTruthy();
    expect(updateMock).toHaveBeenCalled();

    const payload = updateMock.mock.calls[0][0] as any;
    expect(payload.topic_sentence).toBe(
      "Your dream reflects a season of transition.",
    );
    expect(payload.conclusion_sentence).toBe(
      "Consider where you are being carried.",
    );
    expect(payload.model_used).toBe("gpt-test");
    expect(updateEq).toHaveBeenCalledWith("id", "test-dream-id");
  });

  it("stores the raw analysis encrypted rather than as plaintext", async () => {
    await run();

    const payload = updateMock.mock.calls[0][0] as any;
    expect(payload.raw_analysis_enc).toBeTruthy();
    expect(typeof payload.raw_analysis_enc).toBe("string");
    // The giveaway that this is ciphertext and not JSON: none of the plaintext
    // survives, and it does not parse.
    expect(payload.raw_analysis_enc).not.toContain("topicSentence");
    expect(payload.raw_analysis_enc).not.toContain("season of transition");
    expect(() => JSON.parse(payload.raw_analysis_enc)).toThrow();
  });

  it("records cost telemetry on the row", async () => {
    await run();

    const payload = updateMock.mock.calls[0][0] as any;
    expect(payload.input_tokens).toBe(1200);
    expect(payload.output_tokens).toBe(340);
  });

  it("keeps every reference in bible_refs, resolvable or not", async () => {
    await run();

    const payload = updateMock.mock.calls[0][0] as any;
    // The prose mentions all three, so all three stay in bible_refs — dropping
    // one here would leave the reading referring to something absent.
    expect(payload.bible_refs).toEqual(
      expect.arrayContaining(["Psalms 23:4", "Isaiah 43:2"]),
    );
    expect(payload.bible_refs).toHaveLength(3);
  });

  it("does not persist citation rows for references it cannot resolve", async () => {
    await run();

    const citationInserts = insertMock.mock.calls
      .flatMap(([arg]) => (Array.isArray(arg) ? arg : [arg]))
      .filter((row: any) => row && "bible_book" in row);

    expect(citationInserts.length).toBeGreaterThan(0);
    for (const row of citationInserts) {
      expect(row.bible_book).not.toBe("");
      expect(row.full_text).not.toBe("");
    }
    expect(
      citationInserts.some((row: any) => row.bible_book === "Nonexistent"),
    ).toBe(false);
  });

  it("serves a repeated dream from cache and bills it nothing", async () => {
    const { runDreamAnalysis } = await import("@/lib/dreamAnalysis");
    const dreamText = "A cache-specific dream about still water.";

    await run({ dreamText, bypassCache: false });
    const callsAfterFirst = (runDreamAnalysis as any).mock.calls.length;

    await run({ dreamText, bypassCache: false });

    // Second time round the model is not called again...
    expect((runDreamAnalysis as any).mock.calls.length).toBe(callsAfterFirst);

    // ...and the row records no token spend, because no billable call happened.
    const payload = updateMock.mock.calls.at(-1)![0] as any;
    expect(payload.input_tokens).toBe(0);
    expect(payload.output_tokens).toBe(0);
  });
});
