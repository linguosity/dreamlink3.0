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
      "unfolds across an ancient, sacred landscape steeped in divine light. " +
      "Worn stone and hand-woven cloth catch the glow of a single luminous column of light " +
      "descending from parted clouds above, casting long warm golden rays across the scene " +
      "while deep indigo shadows gather at the edges. " +
      "The air shimmers with faint celestial mist, and subtle biblical symbols — scrolls, " +
      "olive branches, gentle waters — emerge from the surrounding stillness.",
    styleAnnotation:
      "Style: Painterly biblical illustration with luminous depth, reminiscent of classical " +
      "religious oil painting. Mood: Sacred, awe-inspiring, deeply spiritual, transcendent.",
  },

  [ImageAesthetic.STAINED_GLASS]: {
    id: ImageAesthetic.STAINED_GLASS,
    name: "Stained Glass",
    description: "Medieval cathedral window with jewel-toned light",
    tier: "free",
    scene:
      "is depicted within the bordered panels of a grand cathedral stained glass window. " +
      "Rich jewel tones of sapphire blue, ruby red, emerald green, and amber gold fill each segment, " +
      "separated by dark lead lines that trace flowing organic shapes. " +
      "Colored light filters through the translucent glass, casting prismatic patterns " +
      "onto an unseen stone floor below.",
    styleAnnotation:
      "Style: Medieval Gothic stained glass window art with bold outlines and luminous " +
      "translucent color. Mood: Reverent, timeless, holy, contemplative.",
  },

  [ImageAesthetic.WATERCOLOR_DREAMSCAPE]: {
    id: ImageAesthetic.WATERCOLOR_DREAMSCAPE,
    name: "Watercolor Dreamscape",
    description: "Soft, flowing watercolors with ethereal morning light",
    tier: "visionary",
    scene:
      "materializes through soft washes of translucent color that bleed gently into one another. " +
      "Delicate brushstrokes suggest rolling hills, flowing water, and distant horizons " +
      "bathed in soft diffused morning light filtering through a thin veil of mist. " +
      "Edges dissolve into the white of the paper, and pigment pools in organic shapes " +
      "that feel both intentional and beautifully accidental.",
    styleAnnotation:
      "Style: Ethereal watercolor illustration with visible paper texture, wet-on-wet technique, " +
      "and controlled color bleeding. Mood: Peaceful, dreamlike, gentle, meditative.",
  },

  [ImageAesthetic.CELESTIAL_COSMOS]: {
    id: ImageAesthetic.CELESTIAL_COSMOS,
    name: "Celestial Cosmos",
    description: "Cosmic nebulae and starfields with spiritual radiance",
    tier: "visionary",
    scene:
      "expands across the infinite canvas of deep space, surrounded by swirling nebulae " +
      "in shades of violet, teal, and rose gold. Distant stars punctuate the darkness " +
      "like scattered diamonds, while a luminous celestial body — part moon, part divine eye — " +
      "radiates soft white light from the upper portion of the scene. " +
      "Cosmic dust trails weave through the composition like spiritual rivers.",
    styleAnnotation:
      "Style: Cosmic spiritual art blending NASA deep-space photography with mystical " +
      "symbolism. Mood: Infinite, transcendent, wonder-filled, divinely vast.",
  },

  [ImageAesthetic.RENAISSANCE_FRESCO]: {
    id: ImageAesthetic.RENAISSANCE_FRESCO,
    name: "Renaissance Fresco",
    description: "Sistine Chapel grandeur with warm divine radiance",
    tier: "visionary",
    scene:
      "is rendered upon an aged plaster ceiling with the monumental grandeur of a Renaissance fresco. " +
      "Muscular figures in flowing robes reach toward divine light streaming from the upper heavens. " +
      "Warm candlelight and divine radiance illuminate skin tones of ochre and rose, " +
      "while architectural elements of marble columns and gilded arches frame the composition. " +
      "Fine cracks in the plaster add centuries of authentic patina.",
    styleAnnotation:
      "Style: High Renaissance fresco in the tradition of Michelangelo and Raphael, with " +
      "masterful anatomy and dramatic foreshortening. Mood: Majestic, heroic, divinely inspired, eternal.",
  },

  [ImageAesthetic.SURREAL_PROPHETIC]: {
    id: ImageAesthetic.SURREAL_PROPHETIC,
    name: "Surreal Prophetic",
    description: "Dalí-meets-Blake surrealism with dramatic chiaroscuro",
    tier: "prophet",
    scene:
      "warps reality across a vast desert of melting stone and impossible architecture. " +
      "Objects defy gravity and scale — enormous eyes peer through cracked earth, " +
      "staircases spiral into clouds, and rivers flow upward toward a burning horizon. " +
      "Dramatic chiaroscuro side-lighting carves deep shadows against blazing highlights, " +
      "creating an atmosphere of prophetic intensity and divine mystery.",
    styleAnnotation:
      "Style: Surrealist prophetic art combining Salvador Dalí's dreamscapes with " +
      "William Blake's visionary engravings. Mood: Otherworldly, intense, prophetic, unsettling beauty.",
  },

  [ImageAesthetic.ANIME_SACRED]: {
    id: ImageAesthetic.ANIME_SACRED,
    name: "Anime Sacred",
    description: "Anime fantasy with ethereal spiritual glow",
    tier: "prophet",
    scene:
      "unfolds in a luminous anime fantasy world where ancient temples float among cherry blossoms " +
      "and crystalline waterfalls cascade into glowing pools below. " +
      "Neon-tinged ethereal light emanates from sacred symbols carved into floating stone pillars, " +
      "while delicate particle effects and lens flares dance through the atmosphere. " +
      "Characters have large expressive eyes reflecting inner spiritual light.",
    styleAnnotation:
      "Style: High-quality anime illustration blending Studio Ghibli environments with " +
      "spiritual fantasy elements. Mood: Enchanting, hopeful, spiritually luminous, wonder.",
  },

  [ImageAesthetic.PHOTOREALISTIC_VISION]: {
    id: ImageAesthetic.PHOTOREALISTIC_VISION,
    name: "Photorealistic Vision",
    description: "Cinematic photography with golden hour backlight",
    tier: "prophet",
    scene:
      "is captured in a photorealistic moment of extraordinary beauty and spiritual significance. " +
      "Golden hour backlight with subtle lens flare illuminates the scene from behind, " +
      "creating a warm halo effect around the central subject while foreground elements " +
      "fall into rich, creamy bokeh. Every texture — fabric weave, skin pores, water droplets — " +
      "is rendered with crystalline sharpness at the focal plane.",
    styleAnnotation:
      "Style: Shot on 35mm film (Kodak Portra 400) with shallow depth of field — subject " +
      "razor-sharp, background softly blurred. Mood: Intimate, sacred, cinematic, breathtaking.",
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
