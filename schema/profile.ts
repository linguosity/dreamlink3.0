import { z } from "zod";

export const profileSchema = z.object({
  id: z.string().uuid().optional(), // generated automatically; optional on input
  user_id: z.string().uuid(),
  language: z.string().optional(),
  bible_version: z.string().optional(),
  created_at: z.string().optional(), // ISO string returned by DB; optional on input
});

export type Profile = z.infer<typeof profileSchema>;