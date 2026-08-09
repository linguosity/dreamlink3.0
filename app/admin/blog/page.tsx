import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PenLine, Plus } from "lucide-react";
import { LocalDateTime } from "@/components/LocalDateTime";
import { ImportPosts } from "./_components/import-posts";
import { GenerateCovers } from "./_components/generate-covers";
import type { BlogPost } from "@/lib/blog";

export const metadata = { title: "Blog — DreamRiver Admin" };

export default async function AdminBlogPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, excerpt, status, author_name, published_at, scheduled_for, updated_at, cover_image_url"
    )
    .order("updated_at", { ascending: false });

  const posts = (data ?? []) as Pick<
    BlogPost,
    | "id"
    | "slug"
    | "title"
    | "excerpt"
    | "status"
    | "author_name"
    | "published_at"
    | "scheduled_for"
    | "cover_image_url"
    | "updated_at"
  >[];

  return (
    <main className="p-6 md:p-8 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Journal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Write and publish articles for dreamriver.io/blog
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/blog/new">
            <Plus className="size-4 mr-1.5" />
            New article
          </Link>
        </Button>
      </div>

      {/* Batch import (.md files with front-matter) + per-file results. */}
      <ImportPosts />

      {/* Covers are generated after import rather than during it — see the
          note in generate-covers.tsx. */}
      <GenerateCovers
        missingCount={posts.filter((p) => !p.cover_image_url).length}
      />

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <PenLine className="size-8 mx-auto mb-3 opacity-50" />
            <p className="font-medium text-foreground">No articles yet</p>
            <p className="text-sm mt-1">
              Click “New article” to write your first post. Drafts stay private
              until you publish.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/admin/blog/${post.id}`}
              className="group rounded-lg border border-border bg-card/40 hover:bg-card px-4 py-3 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium group-hover:underline underline-offset-4">
                  {post.title}
                </span>
                <Badge
                  variant={
                    post.status === "published"
                      ? "default"
                      : post.status === "scheduled"
                        ? "outline"
                        : "secondary"
                  }
                  className={
                    post.status === "scheduled"
                      ? "border-amber-500/50 text-amber-700 dark:text-amber-400"
                      : undefined
                  }
                >
                  {post.status}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {post.status === "scheduled" && post.scheduled_for ? (
                    <>
                      Goes live <LocalDateTime iso={post.scheduled_for} />
                    </>
                  ) : post.status === "published" && post.published_at ? (
                    `Published ${new Date(post.published_at).toLocaleDateString()}`
                  ) : (
                    `Edited ${new Date(post.updated_at).toLocaleDateString()}`
                  )}
                </span>
              </div>
              {post.excerpt ? (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {post.excerpt}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
