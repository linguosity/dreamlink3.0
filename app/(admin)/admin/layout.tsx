// app/(admin)/admin/layout.tsx
//
// The admin auth gate, and only the gate. The chrome lives one level up in
// app/(admin)/layout.tsx so that this file — which has to await Supabase
// twice — sits *below* app/(admin)/loading.tsx and can suspend without
// freezing the page the user is navigating away from.
//
// proxy.ts already redirects non-admins away from /admin before a request
// reaches here; this is the backstop for anything that bypasses it.

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profile")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  return <>{children}</>;
}
