#!/usr/bin/env bash
# scripts/generate-demo-images.sh
#
# Generates the landing-page demo artwork: one image per aesthetic preset,
# using the SAME prompt construction as buildImagePrompt() in
# utils/imageGeneration.ts and the same BFL FLUX.2 [klein] 9B endpoint as
# production — so the marketing demo shows exactly what the product makes.
#
# Idempotent: presets whose image already exists are skipped (delete a .jpg
# to force regeneration). Also writes manifest.json for the landing carousel.
#
# Usage:   bash scripts/generate-demo-images.sh [preset_id]
# Needs:   BFL_API_KEY in repo-root .env; curl + jq
#
# NOTE: the PRESETS block below must stay in sync with
# schema/imageAesthetic.ts (no TS runner in this repo, so synced by hand).

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

OUT="public/landing/dream-demo"
mkdir -p "$OUT"

BFL_API_KEY="$(grep -E '^BFL_API_KEY=' .env | head -1 | cut -d= -f2- | sed -e "s/^['\"]//" -e "s/['\"]\$//")"
if [ -z "$BFL_API_KEY" ]; then
  echo "BFL_API_KEY not found in .env" >&2
  exit 1
fi

ENDPOINT="https://api.bfl.ai/v1/flux-2-klein-9b"
WIDTH=1024
HEIGHT=1024

# Sample dream from app/landing/page.tsx (#sample-interpretation).
# Subject mirrors buildImagePrompt(): "{title}. {summary}"
SUBJECT="Crossing a bridge of golden light. I was walking across a bridge over a river of golden light"

PRESETS='[
  {"id":"sacred_oil_painting","name":"Sacred Oil Painting","tier":"free","description":"Classical biblical illustration with luminous golden light","scene":"Warm golden lighting with soft shadows. Rich earthy palette of ochre, umber, and deep blue.","styleAnnotation":"Style: Classical oil painting, layered glazes, visible brushwork. Mood: Sacred, contemplative."},
  {"id":"stained_glass","name":"Stained Glass","tier":"free","description":"Medieval cathedral window with jewel-toned light","scene":"Bold jewel tones of sapphire, ruby, emerald, and amber separated by dark lead lines.","styleAnnotation":"Style: Medieval stained glass window with bold outlines and translucent color. Mood: Reverent, timeless."},
  {"id":"watercolor_dreamscape","name":"Watercolor Dreamscape","tier":"visionary","description":"Soft, flowing watercolors with ethereal morning light","scene":"Soft diffused morning light. Colors bleed gently into one another with visible paper texture.","styleAnnotation":"Style: Ethereal watercolor, wet-on-wet technique, edges dissolving into white. Mood: Peaceful, dreamlike."},
  {"id":"celestial_cosmos","name":"Celestial Cosmos","tier":"visionary","description":"Cosmic nebulae and starfields with spiritual radiance","scene":"Deep space backdrop with swirling nebulae in violet, teal, and rose gold. Distant starfields.","styleAnnotation":"Style: Cosmic spiritual art, deep-space palette with mystical radiance. Mood: Infinite, transcendent."},
  {"id":"renaissance_fresco","name":"Renaissance Fresco","tier":"visionary","description":"Sistine Chapel grandeur with warm divine radiance","scene":"Warm candlelight on aged plaster. Skin tones of ochre and rose. Fine cracks add patina.","styleAnnotation":"Style: High Renaissance fresco, masterful anatomy, dramatic foreshortening. Mood: Majestic, eternal."},
  {"id":"surreal_prophetic","name":"Surreal Prophetic","tier":"prophet","description":"Dalí-meets-Blake surrealism with dramatic chiaroscuro","scene":"Reality warped — objects defy gravity and scale. Dramatic chiaroscuro with deep shadows and blazing highlights.","styleAnnotation":"Style: Surrealist dreamscape with visionary intensity. Mood: Otherworldly, prophetic, unsettling beauty."},
  {"id":"anime_sacred","name":"Anime Sacred","tier":"prophet","description":"Anime fantasy with ethereal spiritual glow","scene":"Luminous ethereal glow with delicate particle effects and soft lens flares.","styleAnnotation":"Style: High-quality anime illustration with spiritual fantasy elements. Mood: Enchanting, hopeful."},
  {"id":"photorealistic_vision","name":"Photorealistic Vision","tier":"prophet","description":"Cinematic photography with golden hour backlight","scene":"Golden hour backlight with subtle lens flare. Shallow depth of field, creamy bokeh.","styleAnnotation":"Style: 35mm film photography, Kodak Portra 400, razor-sharp focus. Mood: Intimate, cinematic."}
]'

FILTER="${1:-}"
FAILED=0

for id in $(echo "$PRESETS" | jq -r '.[].id'); do
  if [ -n "$FILTER" ] && [ "$FILTER" != "$id" ]; then
    continue
  fi

  file="$OUT/$id.jpg"
  if [ -s "$file" ]; then
    echo "skip $id (exists)"
    continue
  fi

  p=$(echo "$PRESETS" | jq -c --arg id "$id" '.[] | select(.id == $id)')
  scene=$(jq -r .scene <<<"$p")
  style=$(jq -r .styleAnnotation <<<"$p")
  prompt="$SUBJECT. $scene $style"

  echo "→ $id"
  body=$(jq -n --arg prompt "$prompt" --argjson w "$WIDTH" --argjson h "$HEIGHT" \
    '{prompt: $prompt, width: $w, height: $h}')

  sub=$(curl -sf -X POST "$ENDPOINT" \
    -H "accept: application/json" \
    -H "x-key: $BFL_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$body") || { echo "  submit failed for $id" >&2; FAILED=1; continue; }

  poll_url=$(jq -r '.polling_url // empty' <<<"$sub")
  if [ -z "$poll_url" ]; then
    echo "  submit response missing polling_url: $sub" >&2
    FAILED=1
    continue
  fi

  for _ in $(seq 1 60); do
    sleep 2
    res=$(curl -sf "$poll_url" -H "accept: application/json" -H "x-key: $BFL_API_KEY") || continue
    status=$(jq -r .status <<<"$res")
    if [ "$status" = "Ready" ]; then
      sample=$(jq -r '.result.sample // empty' <<<"$res")
      # BFL signed URLs expire within minutes — download immediately.
      curl -sf -o "$file" "$sample" && echo "  saved $file"
      break
    elif [ "$status" != "Pending" ] && [ "$status" != "Queued" ] && [ "$status" != "Processing" ]; then
      echo "  $id ended with status: $status" >&2
      break
    fi
  done

  if [ ! -s "$file" ]; then
    echo "  WARNING: $id did not produce a file" >&2
    FAILED=1
  fi
done

# Manifest for the landing carousel: {id, name, tier, description, file}
echo "$PRESETS" | jq '[.[] | {id, name, tier, description, file: ("/landing/dream-demo/" + .id + ".jpg")}]' \
  > "$OUT/manifest.json"
echo "wrote $OUT/manifest.json"

exit $FAILED
