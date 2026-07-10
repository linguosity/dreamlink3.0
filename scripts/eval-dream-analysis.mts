// scripts/eval-dream-analysis.mts
//
// Tier-comparison eval for the dream-analysis pipeline. Calls
// runDreamAnalysis() directly (same code path as /api/dream-entries,
// including the live dream_prompts DB prompt) — no auth, no credits,
// no image generation, no DB writes. Text-only cost ≈ $0.002/analysis.
//
// Usage:
//   npx tsx scripts/eval-dream-analysis.mts                 # 3 dreams × 3 tiers
//   npx tsx scripts/eval-dream-analysis.mts --tiers deep    # subset
//   npx tsx scripts/eval-dream-analysis.mts --dreams 1 --out ../eval-report.md
//
// Scores each result against the mechanical rubric in
// DreamRiver_Analysis_Rubric.md (100 pts). Fails loudly on fallback results.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Load .env before importing app modules (they read env at import time).
for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { runDreamAnalysis, FALLBACK_ANALYSIS } = await import("@/lib/dreamAnalysis");
const { DEPTH_SPECS } = await import("@/lib/openai");

// ── Test dreams (varied length/emotional register) ─────────────────
const TEST_DREAMS = [
  {
    id: "flood-house",
    text: "I was standing in my childhood home when water started rising through the floorboards. My father was upstairs but I couldn't reach the staircase. The water was warm, not cold, and strangely I wasn't afraid. A white bird kept tapping at the window until I opened it, and the water drained out all at once.",
  },
  {
    id: "teeth-sermon",
    text: "I dreamed I was about to preach in front of my church but my teeth started falling out one by one into my hands. Everyone kept waiting politely. I tried to speak anyway and the words came out clear even without teeth.",
  },
  {
    id: "short-door",
    text: "A door in a field. I knocked three times. No one answered but I heard my grandmother's voice singing on the other side.",
  },
];

const GENERIC_TAGS = new Set([
  "faith", "spirituality", "spiritual", "dreams", "dream", "spiritual journey",
  "divine guidance", "god", "symbolism", "religion", "christianity", "hope",
  "guidance", "spiritual growth", "journey", "belief", "trust",
]);

const FORBIDDEN_OPENINGS = [
  "this dream is about", "your dream is about", "this dream", "your dream is",
  "the dream is about", "in this dream", "in your dream",
];

const BIBLE_BOOKS = /^((1|2|3) )?(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation) \d+:\d+(-\d+)?$/;

const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

interface Check { name: string; max: number; got: number; note?: string }

function scoreResult(tier: keyof typeof DEPTH_SPECS, a: typeof FALLBACK_ANALYSIS): { total: number; max: number; checks: Check[]; words: number } {
  const spec = DEPTH_SPECS[tier];
  const checks: Check[] = [];
  const add = (name: string, max: number, ok: boolean | number, note?: string) =>
    checks.push({ name, max, got: typeof ok === "number" ? ok : ok ? max : 0, note });

  // Fallback detection — everything else is meaningless if this fires.
  if (a.dreamTitle === FALLBACK_ANALYSIS.dreamTitle && a.analysis === FALLBACK_ANALYSIS.analysis) {
    return { total: 0, max: 100, checks: [{ name: "FALLBACK RETURNED (API error — not a model quality issue)", max: 100, got: 0 }], words: 0 };
  }

  // Structure (20)
  add("points count == " + spec.points, 7, a.supportingPoints.length === spec.points, `got ${a.supportingPoints.length}`);
  add("references count == points", 7, a.biblicalReferences.length === spec.points, `got ${a.biblicalReferences.length}`);
  add("tags count == " + spec.tags, 6, a.tags.length === spec.tags, `got ${a.tags.length}`);

  // Word control (25)
  const words = countWords(a.analysis);
  const inRange = words >= spec.minWords && words <= spec.maxWords;
  const near = words >= spec.minWords * 0.9 && words <= spec.maxWords * 1.1;
  add(`analysis words in ${spec.minWords}-${spec.maxWords}`, 15, inRange ? 15 : near ? 8 : 0, `got ${words}`);
  const ptOk = a.supportingPoints.filter((p) => {
    const w = countWords(p);
    return w >= spec.pointMinWords * 0.8 && w <= spec.pointMaxWords * 1.3;
  }).length;
  add("per-point word range", 10, Math.round((ptOk / spec.points) * 10), `${ptOk}/${spec.points} in range`);

  // Tag quality (15)
  const specific = a.tags.filter((t) => !GENERIC_TAGS.has(t.toLowerCase().trim()));
  add("tags not generic", 8, Math.round((specific.length / a.tags.length) * 8), a.tags.join(", "));
  const wellFormed = a.tags.filter((t) => /^[a-z][a-z' -]*$/.test(t) && t.split(/\s+/).length <= 2);
  add("tags lowercase, ≤2 words", 4, Math.round((wellFormed.length / a.tags.length) * 4));
  add("tags distinct", 3, new Set(a.tags.map((t) => t.toLowerCase())).size === a.tags.length);

  // Title (10)
  const titleWords = a.dreamTitle.trim().split(/\s+/).length;
  add("title 3-6 words", 6, titleWords >= 3 && titleWords <= 6, `"${a.dreamTitle}" (${titleWords})`);
  add("title not generic opener", 4, !/^(this|your|the) dream/i.test(a.dreamTitle));

  // Citations (15)
  const validCites = a.biblicalReferences.filter((r) => BIBLE_BOOKS.test(r.citation.trim()));
  add("citations canonical format", 8, Math.round((validCites.length / Math.max(a.biblicalReferences.length, 1)) * 8),
    a.biblicalReferences.map((r) => r.citation).join("; "));
  const embedded = a.supportingPoints.filter((p) => /\([1-3]?\s?[A-Z][a-z]+.*\d+:\d+(-\d+)?\)/.test(p)).length;
  add("each point embeds a citation", 7, Math.round((embedded / spec.points) * 7), `${embedded}/${spec.points}`);

  // Opening discipline (5)
  const opening = a.topicSentence.toLowerCase();
  add("no forbidden opening", 5, !FORBIDDEN_OPENINGS.some((f) => opening.startsWith(f)), a.topicSentence.slice(0, 60));

  // Personalized summary (5)
  const sentences = a.personalizedSummary.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  add("summary is 1 sentence, addresses dreamer", 5,
    sentences === 1 && /\byou\b|\byour\b/i.test(a.personalizedSummary), `${sentences} sentence(s)`);

  // Prose integrity (5)
  add("analysis contains topic sentence", 3, a.analysis.includes(a.topicSentence.slice(0, 40)));
  add("no markdown artifacts/JSON leakage", 2, !/[{}\[\]"]{2,}/.test(a.analysis));

  const total = checks.reduce((s, c) => s + c.got, 0);
  return { total, max: 100, checks, words };
}

// ── Runner ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const tiers = (flag("tiers")?.split(",") ?? ["shallow", "deep", "profound"]) as (keyof typeof DEPTH_SPECS)[];
const dreamCount = Number(flag("dreams") ?? TEST_DREAMS.length);
const only = flag("only");
const outPath = flag("out") ?? join(root, "..", "DreamRiver_Analysis_Eval_Report.md");
const dreams = only ? TEST_DREAMS.filter((d) => d.id === only) : TEST_DREAMS.slice(0, dreamCount);

console.log(`Evaluating ${dreams.length} dream(s) × ${tiers.length} tier(s)…`);

const rows: { tier: string; dream: string; score: number; words: number; checks: Check[]; usage: string }[] = [];

for (const dream of dreams) {
  // Tiers in parallel per dream (safe per runDreamAnalysis docs).
  const results = await Promise.all(
    tiers.map((tier) => runDreamAnalysis({ dream: dream.text, analysisDepth: tier })),
  );
  results.forEach((r, i) => {
    const s = scoreResult(tiers[i], r.analysis);
    rows.push({
      tier: tiers[i], dream: dream.id, score: s.total, words: s.words, checks: s.checks,
      usage: r.usage.inputTokens != null ? `${r.usage.inputTokens}in/${r.usage.outputTokens}out` : "FALLBACK",
    });
    console.log(`  ${dream.id} × ${tiers[i]}: ${s.total}/100 (${s.words} words)`);
  });
}

// ── Report ──────────────────────────────────────────────────────────
let md = `# Dream Analysis Eval Report\n\n**Date:** ${new Date().toISOString().slice(0, 16)}Z · **Model:** ${process.env.OPENAI_MODEL ?? "(env default)"} · rubric: DreamRiver_Analysis_Rubric.md\n\n`;
md += `| Dream | Tier | Score | Analysis words | Tokens |\n|---|---|---|---|---|\n`;
for (const r of rows) md += `| ${r.dream} | ${r.tier} | **${r.score}/100** | ${r.words} | ${r.usage} |\n`;

for (const tier of tiers) {
  const t = rows.filter((r) => r.tier === tier);
  const avg = Math.round(t.reduce((s, r) => s + r.score, 0) / t.length);
  md += `\n**${tier} avg: ${avg}/100**\n`;
}

md += `\n## Failed / partial checks\n\n`;
let anyFail = false;
for (const r of rows) {
  const fails = r.checks.filter((c) => c.got < c.max);
  if (!fails.length) continue;
  anyFail = true;
  md += `**${r.dream} × ${r.tier}** (${r.score}/100)\n\n`;
  for (const f of fails) md += `- ${f.name}: ${f.got}/${f.max}${f.note ? ` — ${f.note}` : ""}\n`;
  md += `\n`;
}
if (!anyFail) md += `None — all checks passed.\n`;

writeFileSync(outPath, md);
console.log(`\nReport → ${outPath}`);
