import { z } from "zod";

export const dreamEntrySchema = z.object({
  id: z.string().uuid().optional(), // generated automatically; optional on input
  user_id: z.string().uuid(),
  original_text: z.string(),
  title: z.string().optional(),
  dream_summary: z.string().optional(),
  analysis_summary: z.string().optional(),
  topic_sentence: z.string().optional(),
  supporting_points: z.array(z.string()).optional(),
  conclusion_sentence: z.string().optional(),
  formatted_analysis: z.string().optional(),
  gematria_interpretation: z.string().optional(),
  color_symbolism: z.string().optional(),
  image_url: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  bible_refs: z.array(z.string()).optional(),
  created_at: z.string().optional(), // returned as ISO string from DB; optional on input
});

export type DreamEntry = z.infer<typeof dreamEntrySchema>;