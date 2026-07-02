# Model Audit — Current vs Market (June 9, 2026)

Workload: per dream entry, 1-4 structured-output analysis calls (150-1100 words) + 1 illustration. Current stack: **gpt-4.1-mini** (Responses API + zodTextFormat) and **FLUX.2 klein 9B** (BFL async).

## Verdict in one paragraph

gpt-4.1-mini still works and is still served via the API, but it was retired from ChatGPT in Feb 2026, is absent from every 2026 writing leaderboard, and Azure has begun retiring the 4.1 family — treat it as legacy with a 6-12 month migration runway. The upgrade path that costs nothing in engineering is **gpt-5.4-mini** (same API, same zodTextFormat code, ~2.8× the cost but still under a penny per analysis). The best writing-quality-per-dollar in the market is **Gemini 3 Flash**, but it requires an SDK change. On images, **FLUX.2 klein 9B at $0.015 is already near the price floor for its quality class — keep it.**

## Text models (per 1M tokens, June 2026)

| Model | Input | Output | Cost/analysis* | Notes |
|---|---|---|---|---|
| gpt-4.1-mini (current) | $0.40 | $1.60 | $0.0034 | Legacy; retired from ChatGPT; no API retirement date yet |
| **gpt-5.4-mini** (recommended) | $0.75 | $4.50 | $0.0095 | Drop-in via `OPENAI_MODEL` env var; best JSON-schema conformance; clear quality upgrade |
| gpt-5.4-nano | $0.20 | $1.25 | $0.0026 | Cheaper than current; quality likely ≈ or > 4.1-mini; worth A/B testing |
| Gemini 3 Flash | $0.50 | $3.00 | $0.0063 | Best writing-per-dollar on 2026 leaderboards (LMArena CW 1461); requires SDK change |
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.0106 | Best small-model literary/devotional voice; ideal cross-provider fallback |
| DeepSeek V4-Flash | $0.14 | $0.28 | $0.0006 | Extreme budget; JSON *mode* only (no schema enforcement) — would need retry logic |

*600 input + 2,000 output tokens.

**Quality notes:** Anthropic models dominate prose/voice benchmarks (relevant for spiritual interpretive tone); Gemini 3 Flash leads quality-per-dollar; OpenAI structured outputs remain the most mature, which matters because the whole pipeline leans on zodTextFormat.

## Image models (per image)

| Model | Price | Async? |
|---|---|---|
| **FLUX.2 klein 9B (current)** | $0.015 | Native polling (already integrated) |
| FLUX.2 klein 4B | $0.014 | Same API — negligible savings, lower quality |
| gpt-image-1-mini | ~$0.005 (low quality) | Sync; consolidates onto OpenAI (single point of failure) |
| Gemini 2.5 Flash Image | $0.039 ($0.0195 batch) | Sync, fast |
| Imagen 4 Fast | $0.02 | Sync |

**Keep FLUX.** The only reason to move is consolidation, and that increases provider concentration risk.

## Cost per dream entry (text + 1 image)

Current stack ≈ **$0.018** · gpt-5.4-mini + FLUX ≈ **$0.025** · Gemini 3 Flash + FLUX ≈ **$0.021**. Worst case (4 matrix calls) stays under $0.04/entry on all three. At these margins the model decision should be made on quality, not cost.

## Outage resilience (implemented today)

`lib/openai.ts` + `lib/dreamAnalysis.ts` now run an ordered fallback chain: `OPENAI_MODEL` → `OPENAI_FALLBACK_MODELS` (comma-separated env, default `gpt-4.1`), triggered only on retryable errors (429/5xx/timeouts), with a 45s per-attempt timeout so a hanging model can't eat the Vercel budget. Schema errors don't fall through (they'd fail identically and double spend).

That covers model-level failures. For a **whole-provider OpenAI outage** (294 incidents tracked since Jan 2025; multi-hour outages at both OpenAI and Anthropic in April 2026), set `OPENAI_BASE_URL` to a router like OpenRouter (passthrough token pricing, ~5.5% effective fee, normalized json_schema support, automatic provider failover) — the SDK reads that env var natively, zero code change. Recommended post-launch, not before.

### Recommended env config

```
OPENAI_MODEL=gpt-5.4-mini            # after a quality A/B vs current
OPENAI_FALLBACK_MODELS=gpt-4.1-mini,gpt-4.1
```

Run ~20 dreams through both models at each tier via the admin matrix/test mode (already built for exactly this) before flipping the primary.

## Unverified items (flagged by research)

Gemini's official pricing page was unreachable (numbers triangulated from Google's blog + 3 trackers); "Gemini 3.5 Flash" mentions are unconfirmed; DeepSeek's promo pricing page appears stale. Re-verify before any non-OpenAI migration.
