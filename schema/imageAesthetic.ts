import { z } from "zod";

/**
 * Dream image aesthetic presets for FLUX.2 [klein] 9B.
 *
 * Each preset defines the Setting, Details, Lighting, Atmosphere, and
 * Style/Mood annotations that wrap around the dream-derived Subject.
 * The Subject (dream title / topic sentence) is always injected at runtime.
 *
 * Prompt structure follows BFL's guide:
 *   Subject → Setting → Details → Lighting → Atmosphere → Style + Mood
 */

export enum ImageAesthetic {
  SACRED_OIL_PAINTING = "sacred_oil_painting",
  STAINED_GLASS = "stained_glass",
  WATERCOLOR_DREAMSCAPE = "watercolor_dreamscape",
  CELESTIAL_COSMOS = "celestial_cosmos",
  RENAISSANCE_FRESCO = "renaissance_fresco",
  SURREAL_PROPHETIC = "surreal_prophetic",
  ANIME_SACRED = "anime_sacred",
  PHOTOREALISTIC_VISION = "photorealistic_vision",
}

export type AestheticTier = "free" | "visionary" | "prophet";

export interface AestheticPreset {
  id: ImageAesthetic;
  name: string;
  description: string;
  tier: AestheticTier;
  /** Setting, details, lighting prose that follows the subject */
  scene: string;
  /** Style + Mood annotation appended at the end */
  styleAnnotation: string;
}

export const AESTHETIC_PRESETS: Record<ImageAesthetic, AestheticPreset> = {
  [ImageAesthetic.SACRED_OIL_PAINTING]: {
    id: ImageAesthetic.SACRED_OIL_PAINTING,
    name: "Sacred Oil Painting",
    description: "Classical biblical illustration with luminous golden light",
    tier: "free",
    scene:
      "Warm golden lighting with soft shadows. Rich earthy palette of ochre, umber, and deep blue.",
    styleAnnotation:
      "Style: Classical oil painting, layered glazes, visible brushwork. Mood: Sacred, contemplative.",
  },

  [ImageAesthetic.STAINED_GLASS]: {
    id: ImageAesthetic.STAINED_GLASS,
    name: "Stained Glass",
    description: "Medieval cathedral window with jewel-toned light",
    tier: "free",
    scene:
      "Bold jewel tones of sapphire, ruby, emerald, and amber separated by dark lead lines.",
    styleAnnotation:
      "Style: Medieval stained glass window with bold outlines and translucent color. Mood: Reverent, timeless.",
  },

  [ImageAesthetic.WATERCOLOR_DREAMSCAPE]: {
    id: ImageAesthetic.WATERCOLOR_DREAMSCAPE,
    name: "Watercolor Dreamscape",
    description: "Soft, flowing watercolors with ethereal morning light",
    tier: "visionary",
    scene:
      "Soft diffused morning light. Colors bleed gently into one another with visible paper texture.",
    styleAnnotation:
      "Style: Ethereal watercolor, wet-on-wet technique, edges dissolving into white. Mood: Peaceful, dreamlike.",
  },

  [ImageAesthetic.CELESTIAL_COSMOS]: {
    id: ImageAesthetic.CELESTIAL_COSMOS,
    name: "Celestial Cosmos",
    description: "Cosmic nebulae and starfields with spiritual radiance",
    tier: "visionary",
    scene:
      "Deep space backdrop with swirling nebulae in violet, teal, and rose gold. Distant starfields.",
    styleAnnotation:
      "Style: Cosmic spiritual art, deep-space palette with mystical radiance. Mood: Infinite, transcendent.",
  },

  [ImageAesthetic.RENAISSANCE_FRESCO]: {
    id: ImageAesthetic.RENAISSANCE_FRESCO,
    name: "Renaissance Fresco",
    description: "Sistine Chapel grandeur with warm divine radiance",
    tier: "visionary",
    scene:
      "Warm candlelight on aged plaster. Skin tones of ochre and rose. Fine cracks add patina.",
    styleAnnotation:
      "Style: High Renaissance fresco, masterful anatomy, dramatic foreshortening. Mood: Majestic, eternal.",
  },

  [ImageAesthetic.SURREAL_PROPHETIC]: {
    id: ImageAesthetic.SURREAL_PROPHETIC,
    name: "Surreal Prophetic",
    description: "Dalí-meets-Blake surrealism with dramatic chiaroscuro",
    tier: "prophet",
    scene:
      "Reality warped — objects defy gravity and scale. Dramatic chiaroscuro with deep shadows and blazing highlights.",
    styleAnnotation:
      "Style: Surrealist dreamscape with visionary intensity. Mood: Otherworldly, prophetic, unsettling beauty.",
  },

  [ImageAesthetic.ANIME_SACRED]: {
    id: ImageAesthetic.ANIME_SACRED,
    name: "Anime Sacred",
    description: "Anime fantasy with ethereal spiritual glow",
    tier: "prophet",
    scene:
      "Luminous ethereal glow with delicate particle effects and soft lens flares.",
    styleAnnotation:
      "Style: High-quality anime illustration with spiritual fantasy elements. Mood: Enchanting, hopeful.",
  },

  [ImageAesthetic.PHOTOREALISTIC_VISION]: {
    id: ImageAesthetic.PHOTOREALISTIC_VISION,
    name: "Photorealistic Vision",
    description: "Cinematic photography with golden hour backlight",
    tier: "prophet",
    scene:
      "Golden hour backlight with subtle lens flare. Shallow depth of field, creamy bokeh.",
    styleAnnotation:
      "Style: 35mm film photography, Kodak Portra 400, razor-sharp focus. Mood: Intimate, cinematic.",
  },
};

/** Get presets available for a given subscription tier */
export function getAvailableAesthetics(userTier: AestheticTier): AestheticPreset[] {
  const tierHierarchy: AestheticTier[] = ["free", "visionary", "prophet"];
  const userTierIndex = tierHierarchy.indexOf(userTier);

  return Object.values(AESTHETIC_PRESETS).filter((preset) => {
    const presetTierIndex = tierHierarchy.indexOf(preset.tier);
    return presetTierIndex <= userTierIndex;
  });
}

/** Map subscription plan names to aesthetic tiers */
export function planToAestheticTier(plan?: string): AestheticTier {
  switch (plan?.toLowerCase()) {
    case "prophet":
      return "prophet";
    case "visionary":
      return "visionary";
    default:
      return "free";
  }
}

export const imageAestheticSchema = z.nativeEnum(ImageAesthetic);
