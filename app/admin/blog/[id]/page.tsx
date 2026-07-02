import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PostEditor } from "../_components/post-editor";
import type { BlogPost } from "@/lib/blog";

export const metadata = { title: "Edit article — DreamRiver Admin" };

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
