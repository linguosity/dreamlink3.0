# FLUX.2 [klein] Prompting Guide

> Master narrative prompting for FLUX.2 [klein] — scene-first prose, lighting mastery, and multi-reference composition.
> Source: https://docs.bfl.ml

**FLUX.2 [klein]** works best when you describe scenes like a novelist, not a search engine. Write flowing prose with lighting details, and the model delivers.

> **No prompt upsampling**: [klein] does not auto-enhance your prompts. What you write is what you get — so be descriptive.

---

## Write Like a Novelist

Describe your scene as flowing prose — subject first, then setting, details, and lighting.

**Do this:**
> *"A woman with short, blonde hair is posing against a light, neutral background. She is wearing colorful earrings and a necklace, resting her chin on her hand."*

**Not this:**
> *"woman, blonde, short hair, neutral background, earrings, colorful, necklace, hand on chin, portrait, soft lighting"*

---

## Basic Prompt Structure

Use this framework for reliable results:

> **Subject → Setting → Details → Lighting → Atmosphere**

| Element | Purpose | Example |
|---|---|---|
| **Subject** | What the image is about | "A weathered fisherman in his late sixties" |
| **Setting** | Where the scene takes place | "stands at the bow of a small wooden boat" |
| **Details** | Specific visual elements | "wearing a salt-stained wool sweater, hands gripping frayed rope" |
| **Lighting** | How light shapes the scene | "golden hour sunlight filters through morning mist" |
| **Atmosphere** | Mood and emotional tone | "creating a sense of quiet determination and solitude" |

---

## Lighting: The Most Important Element

Lighting has the single greatest impact on [klein] output quality. Describe it like a photographer would.

> Instead of "good lighting," write "soft, diffused light from a large window camera-left, creating gentle shadows that define the subject's features."

**What to describe:**
- **Source**: natural, artificial, ambient
- **Quality**: soft, harsh, diffused, direct
- **Direction**: side, back, overhead, fill
- **Temperature**: warm, cool, golden, blue
- **Interaction**: catches, filters, reflects on surfaces

**Example lighting phrases:**
- "soft, diffused natural light filtering through sheer curtains"
- "dramatic side lighting creating deep shadows and highlights"
- "golden hour backlighting with lens flare"
- "overcast light creating even, shadow-free illumination"

---

## Word Order Matters

[klein] pays more attention to what comes first. Front-load your most important elements.

**Priority**: Main subject → Key action → Style → Context → Secondary details

**Strong word order:**
> *"An elderly woman with silver hair carefully arranges wildflowers in a ceramic vase. Soft afternoon light streams through lace curtains, casting delicate shadows across her focused expression."*
> Subject and action lead.

**Weak word order:**
> *"In a warm, nostalgic room with antique furniture, soft afternoon light streams through lace curtains. An elderly woman with silver hair is there arranging wildflowers."*
> Subject buried in description.

---

## Prompt Length

| Length | Words | Best For |
|---|---|---|
| **Short** | 10–30 | Quick concepts, style exploration |
| **Medium** | 30–80 | Most production work ✓ |
| **Long** | 80–300+ | Complex editorial, detailed product shots |

> Longer prompts work well **when every detail serves the image**. Avoid filler — each sentence should add visual information.

---

## Style and Mood Annotations

Adding explicit style and mood descriptors at the end of your prompt enhances consistency:

```
[Scene description]. Style: Country chic meets luxury lifestyle editorial.
Mood: Serene, romantic, grounded.
```

```
[Scene description]. Shot on 35mm film (Kodak Portra 400) with shallow
depth of field — subject razor-sharp, background softly blurred.
```

---

## Dreamlink Prompt Template

For biblical dream imagery, follow this structure:

```
[Dream subject/figure] [action or state] in [setting with spiritual significance].
[Specific visual details — textures, colors, symbols].
[Lighting description — source, quality, direction, temperature, interaction].
[Atmospheric closer with emotional/spiritual tone].
Style: [painterly / illustrated / cinematic]. Mood: [sacred / mystical / awe-inspiring / peaceful].
```

**Example for Dreamlink:**
> *"An ancient stone temple rises from a parting sea under a vast night sky, its entrance aglow with warm golden light that spills across the dark waters. Moonlight casts long silver reflections on the waves while divine rays pierce through low clouds from above, illuminating carved biblical inscriptions on the temple walls. The scene radiates divine presence and quiet wonder. Style: Painterly biblical illustration with luminous depth. Mood: Sacred, awe-inspiring, ethereal."*

---

## Best Practices Summary

1. **Write in Prose, Not Keywords** — flowing paragraphs, not comma-separated tags
2. **Lead with Your Subject** — the first words signal priority to the model
3. **Describe Light Explicitly** — source, quality, direction, temperature, surface interaction
4. **Use Sensory Details** — textures, reflections, atmospheric elements
5. **Add Style/Mood Tags** — end prompts with explicit aesthetic annotations for consistency
6. **30–80 words is the sweet spot** for most production images

---

## Model Variants

| Variant | Speed | License | Best For |
|---|---|---|---|
| **[klein] 4B** | Sub-second | Apache 2.0 | High-volume workflows |
| **[klein] 9B** | Sub-second | FLUX Non-Commercial | Production work, best prompt understanding ✓ |
| **Base 4B/9B** | Standard | Same as above | Fine-tuning, research |

Dreamlink uses **[klein] 9B** via `POST https://api.bfl.ai/v1/flux-2-klein-9b`.
