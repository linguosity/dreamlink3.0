"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { HINT_IDS, type HintId } from "@/lib/hints/types";

export async function dismissHintAction(id: HintId) {
  if (!HINT_IDS.includes(id)) return { error: "invalid-hint" } as const;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" } as const;

  // Append-if-missing: pull the row, splice in the id, write it back.
  // Profile rows are tiny so a read-modify-write is fine here.
  const { data: row } = await supabase
    .from("profile")
    .select("dismissed_hints")
    .eq("user_id", user.id)
    .single();

  const current = (row?.dismissed_hints as string[] | null) ?? [];
  if (current.includes(id)) return { ok: true } as const;

  const { error } = await supabase
    .from("profile")
    .update({ dismissed_hints: [...current, id] })
    .eq("user_id", user.id);

  if (error) return { error: error.message } as const;
  return { ok: true } as const;
}

/**
 * Resets the current user's dismissed hints to an empty set so every coach
 * mark is eligible again on next page load. Self-only — no admin required —
 * because a user resetting their own hints is harmless.
 */
export async function resetMyHintsAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" } as const;

  const { error } = await supabase
    .from("profile")
    .update({ dismissed_hints: [] })
    .eq("user_id", user.id);

  if (error) return { error: error.message } as const;

  // Force the layout to re-fetch the freshly empty array on the next render.
  revalidatePath("/", "layout");
  return { ok: true } as const;
}
