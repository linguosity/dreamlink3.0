import { z } from "zod";
import { ImageAesthetic } from "./imageAesthetic";

// Define the reading level enum
export const ReadingLevel = {
  RADIANT_CLARITY: "radiant_clarity", // Simple (3rd grade)
  CELESTIAL_INSIGHT: "celestial_insight", // Standard (8th grade)
  PROPHETIC_WISDOM: "prophetic_wisdom", // Advanced (12th grade)
  DIVINE_REVELATION: "divine_revelation", // Scholarly (biblical expert)
} as const;

export const readingLevelSchema = z.enum([
  ReadingLevel.RADIANT_CLARITY,
  ReadingLevel.CELESTIAL_INSIGHT,
  ReadingLevel.PROPHETIC_WISDOM,
  ReadingLevel.DIVINE_REVELATION,
]);

export type ReadingLevel = z.infer<typeof readingLevelSchema>;

// Analysis depth — gates analysis length / breadth by subscription plan.
// Reading level is independent (free for everyone) and controls language
// complexity rather than depth.
export const AnalysisDepth = {
  SHALLOW: "shallow", // free
  DEEP: "deep", // visionary plan
  PROFOUND: "profound", // prophet plan + admins
} as const;

export const analysisDepthSchema = z.enum([
  AnalysisDepth.SHALLOW,
  AnalysisDepth.DEEP,
  AnalysisDepth.PROFOUND,
]);

export type AnalysisDepth = z.infer<typeof analysisDepthSchema>;

export type SubscriptionPlan = "free" | "visionary" | "prophet";

// Plan ceiling for analysis depth. Admins bypass this (handled in the API).
// Exported so lib/tierConfig.ts can fold it into the single PLAN_CAPABILITIES
// source of truth without duplicating the values.
export const PLAN_DEPTH_CEILING: Record<SubscriptionPlan, AnalysisDepth> = {
  free: AnalysisDepth.SHALLOW,
  visionary: AnalysisDepth.DEEP,
  prophet: AnalysisDepth.PROFOUND,
};

const DEPTH_RANK: Record<AnalysisDepth, number> = {
  [AnalysisDepth.SHALLOW]: 0,
  [AnalysisDepth.DEEP]: 1,
  [AnalysisDepth.PROFOUND]: 2,
};

/**
 * Clamp a requested depth to the user's plan ceiling. Admin callers should
 * skip this entirely and pass the requested depth through unchanged.
 */
export function clampDepthToPlan(
  requested: AnalysisDepth,
  plan: SubscriptionPlan,
): AnalysisDepth {
  const ceiling = PLAN_DEPTH_CEILING[plan];
  return DEPTH_RANK[requested] <= DEPTH_RANK[ceiling] ? requested : ceiling;
}

export const profileSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  language: z.string().optional(),
  bible_version: z.string().optional(),
  reading_level: readingLevelSchema.default(ReadingLevel.CELESTIAL_INSIGHT).optional(),
  image_aesthetic: z.string().optional(),
  preferences: z.record(z.unknown()).optional(),
  analysis_depth: analysisDepthSchema.default(AnalysisDepth.SHALLOW).optional(),
  is_admin: z.boolean().optional(),
  test_mode_enabled: z.boolean().optional(),
  test_mode_depths: z.array(analysisDepthSchema).optional(),
  test_mode_reading_levels: z.array(readingLevelSchema).optional(),
  test_mode_aesthetics: z.array(z.nativeEnum(ImageAesthetic)).optional(),
  created_at: z.string().optional(),
});

export type Profile = z.infer<typeof profileSchema>;
