import { createBrowserClient } from "@supabase/ssr";

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export const createClient = () => {
  // Reuse existing client if available (singleton pattern)
  if (clientInstance) return clientInstance;
  
  // Create new client if it doesn't exist
  clientInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  
  return clientInstance;
};
