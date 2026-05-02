import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let adminInstance: ReturnType<typeof createClient<Database>> | null = null;

export function getAdminClient() {
  if (adminInstance) return adminInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error("Missing Supabase admin credentials");
  }

  adminInstance = createClient<Database>(url, key);
  return adminInstance;
}
