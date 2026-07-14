# Landing demo artwork

One image per aesthetic preset from `schema/imageAesthetic.ts`, generated
through the production pipeline (BFL FLUX.2 [klein] 9B, same prompt
construction as `buildImagePrompt()` in `utils/imageGeneration.ts`) for the
landing "A real interpretation" section.

Subject is the landing sample dream: "Crossing a bridge of golden light.
I was walking across a bridge over a river of golden light."

`manifest.json` drives the carousel: `{id, name, tier, description, file}`.
Tiers: free (2), visionary (3), prophet (3) — paid styles get a lock chip in
the UI that links to /pricing.

## Regenerate

```bash
bash scripts/generate-demo-images.sh                 # generates only missing images
bash scripts/generate-demo-images.sh stained_glass   # one preset (delete its .jpg first)
```

Requires `BFL_API_KEY` in repo-root `.env`, plus curl and jq. Idempotent —
existing .jpg files are skipped, so a full rerun of 8 images costs pennies
and only happens if you delete files.

If presets change in `schema/imageAesthetic.ts`, update the hand-synced
PRESETS block in `scripts/generate-demo-images.sh`, delete the affected
.jpg files, and rerun.
