import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PostEditor } from "../_components/post-editor";
import type { BlogPost } from "@/lib/blog";

export const metadata = { title: "Edit article — DreamRiver Admin" };

// The editor's "Generate cover" control calls generateCoverAction, and a
// Server Action inherits the maxDuration of the page that invokes it. See the
// note in app/admin/blog/page.tsx — one BFL image is budgeted at 50s, which
// does not fit the platform default.
export const maxDuration = 60;

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();

  return <PostEditor post={data as BlogPost} />;
}
