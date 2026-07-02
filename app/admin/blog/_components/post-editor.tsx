"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Bold,
  Eye,
  Globe,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  PenLine,
  Quote,
  Trash2,
} from "lucide-react";
import {
  savePostAction,
  setPostStatusAction,
  deletePostAction,
  type BlogPostInput,
} from "../actions";
import type { BlogPost } from "@/lib/blog";

function slugPreview(s: string) {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function PostEditor({ post }: { post: BlogPost | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content_md ?? "");
  const [cover, setCover] = useState(post?.cover_image_url ?? "");
  const [author, setAuthor] = useState(post?.author_name ?? "Justin Brewer");
  const [tags, setTags] = useState((post?.tags ?? []).join(", "));
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? "");
  const [seoDesc, setSeoDesc] = useState(post?.seo_description ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    post?.status ?? "draft"
  );
  const [preview, setPreview] = useState(false);
  const [postId, setPostId] = useState(post?.id ?? null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const effectiveSlug = slugTouched ? slug : slugPreview(title);
  const metaTitle = seoTitle || title;
  const metaDesc = seoDesc || excerpt;

  const words = useMemo(
    () => content.split(/\s+/).filter(Boolean).length,
    [content]
  );

  /** Wrap the current selection in the body textarea with markdown markers. */
  function wrapSelection(before: string, after = before, placeholder = "text") {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  }

  function linePrefix(prefix: string, placeholder = "text") {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: s, value } = el;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const hasText = value.slice(lineStart, s).trim().length > 0;
    const insert = hasText ? `\n\n${prefix}` : prefix;
    const next = value.slice(0, s) + insert + (value.slice(s) || placeholder);
    setContent(next);
    requestAnimationFrame(() => el.focus());
  }

  function collectInput(): BlogPostInput {
    return {
      id: postId ?? undefined,
      title,
      slug: effectiveSlug,
      excerpt,
      content_md: content,
      cover_image_url: cover,
      author_name: author,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      seo_title: seoTitle,
      seo_description: seoDesc,
    };
  }

  function save(then?: (id: string) => Promise<void>) {
    startTransition(async () => {
      const res = await savePostAction(collectInput());
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setPostId(res.id);
      setSlug(res.slug);
      setSlugTouched(true);
      if (then) await then(res.id);
      else toast.success("Saved");
      router.refresh();
    });
  }

  function publishToggle() {
    const next = status === "published" ? "draft" : "published";
    save(async (id) => {
      const res = await setPostStatusAction(id, next);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setStatus(next);
      toast.success(
        next === "published"
          ? "Published! Live at dreamriver.io/blog/" + effectiveSlug
          : "Moved back to draft"
      );
    });
  }

  function remove() {
    if (!postId) return;
    if (!confirm("Delete this article? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deletePostAction(postId);
      if ("error" in res) toast.error(res.error);
      else {
        toast.success("Deleted");
        router.push("/admin/blog");
      }
    });
  }

  const toolbar: Array<{
    icon: React.ReactNode;
    label: string;
    run: () => void;
  }> = [
    { icon: <Bold className="size-4" />, label: "Bold", run: () => wrapSelection("**") },
    { icon: <Italic className="size-4" />, label: "Italic", run: () => wrapSelection("*") },
    { icon: <Heading2 className="size-4" />, label: "Section heading", run: () => linePrefix("## ", "Heading") },
    { icon: <Heading3 className="size-4" />, label: "Sub-heading", run: () => linePrefix("### ", "Heading") },
    { icon: <Quote className="size-4" />, label: "Quote / verse", run: () => linePrefix("> ", "Quote") },
    { icon: <List className="size-4" />, label: "Bullet list", run: () => linePrefix("- ", "Item") },
    { icon: <Link2 className="size-4" />, label: "Link", run: () => wrapSelection("[", "](https://)", "link text") },
  ];

  return (
    <main className="p-6 md:p-8 max-w-5xl">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/blog">
            <ArrowLeft className="size-4 mr-1" /> All articles
          </Link>
        </Button>
        <Badge variant={status === "published" ? "default" : "secondary"}>
          {status}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          {postId ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={remove}
              disabled={isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => save()}
            disabled={isPending || !title.trim()}
          >
            Save draft
          </Button>
          <Button
            onClick={publishToggle}
            disabled={isPending || !title.trim()}
          >
            <Globe className="size-4 mr-1.5" />
            {status === "published" ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* ---- Main column ---- */}
        <div className="flex flex-col gap-4 min-w-0">
          <div>
            <Label htmlFor="post-title">Title</Label>
            <Input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. What Does It Mean to Dream About Water?"
              className="mt-1.5 text-lg font-medium"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Web address: dreamriver.io/blog/
              <span className="text-foreground">{effectiveSlug || "…"}</span>
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="post-body">Article</Label>
              <div className="flex items-center gap-1">
                {!preview &&
                  toolbar.map((t) => (
                    <Button
                      key={t.label}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title={t.label}
                      onClick={t.run}
                    >
                      {t.icon}
                    </Button>
                  ))}
                <Button
                  type="button"
                  variant={preview ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 ml-1"
                  onClick={() => setPreview((p) => !p)}
                >
                  {preview ? (
                    <PenLine className="size-4 mr-1" />
                  ) : (
                    <Eye className="size-4 mr-1" />
                  )}
                  {preview ? "Write" : "Preview"}
                </Button>
              </div>
            </div>

            {preview ? (
              <div className="prose-blog rounded-md border border-border bg-card/40 px-4 py-3 min-h-[420px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content || "*Nothing written yet.*"}
                </ReactMarkdown>
              </div>
            ) : (
              <Textarea
                id="post-body"
                ref={bodyRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  "Write naturally — like you're explaining it to a friend.\n\nUse the toolbar above for headings, quotes, and links. Blank line = new paragraph."
                }
                className="min-h-[420px] font-mono text-sm leading-relaxed"
              />
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              {words} words · about {Math.max(1, Math.round(words / 200))} min
              read
            </p>
          </div>

          <div>
            <Label htmlFor="post-excerpt">Teaser (1–2 sentences)</Label>
            <Textarea
              id="post-excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Shown on the blog page and in Google results. Make someone want to click."
              className="mt-1.5 min-h-[64px]"
            />
          </div>
        </div>

        {/* ---- Side column ---- */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <Label htmlFor="post-author" className="text-xs">
                  Author
                </Label>
                <Input
                  id="post-author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="post-tags" className="text-xs">
                  Topics (comma separated)
                </Label>
                <Input
                  id="post-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="dreams, symbols, water"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="post-cover" className="text-xs">
                  Cover image URL (optional)
                </Label>
                <Input
                  id="post-cover"
                  value={cover}
                  onChange={(e) => setCover(e.target.value)}
                  placeholder="https://…"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="post-slug" className="text-xs">
                  URL slug
                </Label>
                <Input
                  id="post-slug"
                  value={effectiveSlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugPreview(e.target.value));
                  }}
                  className="mt-1 font-mono text-xs"
                />
                {status === "published" ? (
                  <p className="text-[11px] text-amber-600 dark:text-gold mt-1">
                    Changing the slug of a published post breaks its old link.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Google preview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="rounded-md border border-border p-3">
                <p className="text-sm text-primary line-clamp-1">
                  {metaTitle || "Article title"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  dreamriver.io/blog/{effectiveSlug || "…"}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {metaDesc || "Teaser text appears here."}
                </p>
              </div>
              <div>
                <Label htmlFor="post-seo-title" className="text-xs">
                  Search title (optional, {(seoTitle || title).length}/60)
                </Label>
                <Input
                  id="post-seo-title"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={title || "Defaults to the article title"}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="post-seo-desc" className="text-xs">
                  Search description (optional,{" "}
                  {(seoDesc || excerpt).length}/160)
                </Label>
                <Textarea
                  id="post-seo-desc"
                  value={seoDesc}
                  onChange={(e) => setSeoDesc(e.target.value)}
                  placeholder={excerpt || "Defaults to the teaser"}
                  className="mt-1 min-h-[56px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Writing for search</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• Pick one question per article (e.g. “what does dreaming about water mean biblically”) and answer it in the first paragraph.</p>
              <p>• Use 2–4 section headings that repeat natural phrasings of the question.</p>
              <p>• 800–1,500 words is the sweet spot. Longer is fine if it stays useful.</p>
              <p>• End with an invitation to try DreamRiver.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
