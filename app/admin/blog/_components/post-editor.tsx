"use client";

import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LocalDateTime } from "@/components/LocalDateTime";
import {
  ArrowLeft,
  Bold,
  CalendarClock,
  Eye,
  Globe,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  PenLine,
  Quote,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  savePostAction,
  setPostStatusAction,
  schedulePostAction,
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

/** Date → value for <input type="datetime-local"> (local timezone). */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** Local-timezone label for toasts/confirms (client-only call sites). */
function formatLocal(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ---- Undo/redo history for the body textarea --------------------------------
// A debounced snapshot stack, NOT a keystroke log: typing pushes a snapshot
// after 800ms idle; toolbar actions commit any pending snapshot first, then
// push their own result immediately (so each insertion is one undo step).
// Native Cmd/Ctrl+Z is untouched — the browser handles typing-level undo,
// and these buttons cover what the browser can't (programmatic toolbar
// insertions clear the native stack).
const HISTORY_DEBOUNCE_MS = 800;
const HISTORY_CAP = 100;

interface HistoryEntry {
  value: string;
  start: number;
  end: number;
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
  const [status, setStatus] = useState<"draft" | "scheduled" | "published">(
    post?.status ?? "draft"
  );
  const [scheduledFor, setScheduledFor] = useState<string | null>(
    post?.scheduled_for ?? null
  );
  const [scheduleOpen, setScheduleOpen] = useState(false);
  // datetime-local draft value while the schedule popover is open.
  const [scheduleDraft, setScheduleDraft] = useState("");
  const [preview, setPreview] = useState(false);
  const [postId, setPostId] = useState(post?.id ?? null);
  // Slug as it exists in the DB (what /blog/<slug> will actually serve).
  const [savedSlug, setSavedSlug] = useState(post?.slug ?? null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // ---- Undo/redo history (see constants above) ------------------------------
  const historyRef = useRef<{
    stack: HistoryEntry[];
    index: number;
    timer: ReturnType<typeof setTimeout> | null;
  }>({
    stack: [{ value: post?.content_md ?? "", start: 0, end: 0 }],
    index: 0,
    timer: null,
  });
  // Bumped whenever the stack/index changes so the Undo/Redo buttons'
  // disabled state re-renders (the stack itself lives in a ref).
  const [, bumpHistory] = useReducer((c: number) => c + 1, 0);
  // Render-fresh mirror of `content` for snapshot capture when the textarea
  // is unmounted (preview mode) at debounce-fire time.
  const contentMirrorRef = useRef(content);
  contentMirrorRef.current = content;

  function currentSnapshot(): HistoryEntry {
    const el = bodyRef.current;
    if (el) {
      return { value: el.value, start: el.selectionStart, end: el.selectionEnd };
    }
    const v = contentMirrorRef.current;
    return { value: v, start: v.length, end: v.length };
  }

  /** Push a snapshot, truncating any redo branch and capping the stack. */
  function pushHistory(entry: HistoryEntry) {
    const h = historyRef.current;
    if (h.stack[h.index]?.value === entry.value) return; // nothing changed
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(entry);
    if (h.stack.length > HISTORY_CAP) h.stack.shift();
    h.index = h.stack.length - 1;
  }

  /** If a debounced snapshot is pending, take it now (pre-action state). */
  function commitPendingHistory() {
    const h = historyRef.current;
    if (h.timer !== null) {
      clearTimeout(h.timer);
      h.timer = null;
      pushHistory(currentSnapshot());
    }
  }

  /** Called on every textarea edit: (re)start the 800ms idle timer. */
  function scheduleHistorySnapshot() {
    const h = historyRef.current;
    if (h.timer !== null) clearTimeout(h.timer);
    h.timer = setTimeout(() => {
      h.timer = null;
      pushHistory(currentSnapshot());
      bumpHistory();
    }, HISTORY_DEBOUNCE_MS);
  }

  function applyHistoryEntry(entry: HistoryEntry) {
    // Programmatic setContent doesn't fire onChange, so this never
    // re-schedules a snapshot (which would wrongly clear the redo branch).
    setContent(entry.value);
    requestAnimationFrame(() => {
      const el = bodyRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(
        Math.min(entry.start, entry.value.length),
        Math.min(entry.end, entry.value.length)
      );
    });
  }

  function undo() {
    commitPendingHistory(); // typed-but-unsnapshotted text becomes the undo target
    const h = historyRef.current;
    if (h.index > 0) {
      h.index -= 1;
      applyHistoryEntry(h.stack[h.index]);
    }
    bumpHistory();
  }

  function redo() {
    // Typing after an undo invalidates redo; committing makes that explicit
    // (the push truncates the stack, so this becomes a no-op).
    commitPendingHistory();
    const h = historyRef.current;
    if (h.index < h.stack.length - 1) {
      h.index += 1;
      applyHistoryEntry(h.stack[h.index]);
    }
    bumpHistory();
  }

  const canUndo =
    historyRef.current.index > 0 || historyRef.current.timer !== null;
  const canRedo =
    historyRef.current.index < historyRef.current.stack.length - 1 &&
    historyRef.current.timer === null;

  useEffect(() => {
    const h = historyRef.current;
    return () => {
      if (h.timer !== null) clearTimeout(h.timer);
    };
  }, []);

  const effectiveSlug = slugTouched ? slug : slugPreview(title);
  const metaTitle = seoTitle || title;
  const metaDesc = seoDesc || excerpt;

  // ---- Unsaved-changes guard ----------------------------------------------
  // Snapshot of every field the save action persists (id excluded — it only
  // changes on first save). Compared against the last saved snapshot to warn
  // before the browser tab closes or Justin navigates back mid-edit.
  const fields = {
    title,
    slug: effectiveSlug,
    excerpt,
    content,
    cover,
    author,
    tags,
    seoTitle,
    seoDesc,
  };
  const snap = JSON.stringify(fields);
  const savedSnapRef = useRef(snap);
  const dirty = snap !== savedSnapRef.current;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const words = useMemo(
    () => content.split(/\s+/).filter(Boolean).length,
    [content]
  );

  /** Wrap the current selection in the body textarea with markdown markers. */
  function wrapSelection(before: string, after = before, placeholder = "text") {
    const el = bodyRef.current;
    if (!el) return;
    commitPendingHistory(); // typed text before the click is its own undo step
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    setContent(next);
    // The browser drops its native undo stack on programmatic edits — push a
    // snapshot immediately so the Undo button covers this insertion.
    pushHistory({
      value: next,
      start: s + before.length,
      end: s + before.length + selected.length,
    });
    bumpHistory();
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  }

  function linePrefix(prefix: string, placeholder = "text") {
    const el = bodyRef.current;
    if (!el) return;
    commitPendingHistory();
    const { selectionStart: s, value } = el;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const hasText = value.slice(lineStart, s).trim().length > 0;
    const insert = hasText ? `\n\n${prefix}` : prefix;
    const next = value.slice(0, s) + insert + (value.slice(s) || placeholder);
    setContent(next);
    const caret = s + insert.length;
    pushHistory({ value: next, start: caret, end: caret });
    bumpHistory();
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
    const input = collectInput();
    startTransition(async () => {
      const res = await savePostAction(input);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setPostId(res.id);
      setSlug(res.slug);
      setSlugTouched(true);
      setSavedSlug(res.slug);
      // The server may normalize the slug — record what was actually saved.
      savedSnapRef.current = JSON.stringify({ ...fields, slug: res.slug });
      if (then) await then(res.id);
      else toast.success("Saved");
      router.refresh();
    });
  }

  function publishToggle() {
    const next = status === "published" ? "draft" : "published";
    const ok = confirm(
      next === "published"
        ? status === "scheduled" && scheduledFor
          ? `Publish this article right now? It's currently scheduled for ${formatLocal(scheduledFor)} — publishing makes it live immediately instead.`
          : `Publish this article? It will be live for everyone at dreamriver.io/blog/${effectiveSlug}`
        : "Unpublish this article? Its public page will show a 404 until you publish it again."
    );
    if (!ok) return;
    save(async (id) => {
      const res = await setPostStatusAction(id, next);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setStatus(next);
      setScheduledFor(null); // both transitions cancel any pending schedule
      toast.success(
        next === "published"
          ? "Published! Live at dreamriver.io/blog/" + effectiveSlug
          : "Moved back to draft"
      );
    });
  }

  // ---- Scheduling (lazy publish — no cron; the post goes live on its own
  // the moment now() passes scheduled_for, via RLS + the public queries) ----

  function openScheduleChange(open: boolean) {
    if (open) {
      // Prefill: current schedule, or tomorrow 9:00 AM local.
      if (scheduledFor) {
        setScheduleDraft(toLocalInputValue(new Date(scheduledFor)));
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        setScheduleDraft(toLocalInputValue(d));
      }
    }
    setScheduleOpen(open);
  }

  function scheduleAt() {
    const when = new Date(scheduleDraft);
    if (Number.isNaN(when.getTime())) {
      toast.error("Pick a date and time first.");
      return;
    }
    if (when.getTime() <= Date.now()) {
      toast.error("That time is already past — use Publish to go live now.");
      return;
    }
    const iso = when.toISOString();
    setScheduleOpen(false);
    save(async (id) => {
      const res = await schedulePostAction(id, iso);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setStatus("scheduled");
      setScheduledFor(iso);
      toast.success(`Scheduled — goes live ${formatLocal(iso)}`);
    });
  }

  function unschedule() {
    if (!postId) return;
    setScheduleOpen(false);
    startTransition(async () => {
      const res = await setPostStatusAction(postId, "draft");
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setStatus("draft");
      setScheduledFor(null);
      toast.success("Schedule removed — back to draft");
      router.refresh();
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
          <Link
            href="/admin/blog"
            onClick={(e) => {
              if (
                dirty &&
                !confirm("You have unsaved changes. Leave without saving?")
              ) {
                e.preventDefault();
              }
            }}
          >
            <ArrowLeft className="size-4 mr-1" /> All articles
          </Link>
        </Button>
        <Badge
          variant={
            status === "published"
              ? "default"
              : status === "scheduled"
                ? "outline"
                : "secondary"
          }
          className={
            status === "scheduled"
              ? "border-amber-500/50 text-amber-700 dark:text-gold"
              : undefined
          }
        >
          {status === "scheduled" && scheduledFor ? (
            <>
              Scheduled for&nbsp;
              <LocalDateTime iso={scheduledFor} />
            </>
          ) : (
            status
          )}
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
          {postId && savedSlug ? (
            <Button variant="ghost" size="sm" asChild>
              <a
                href={`/blog/${savedSlug}`}
                target="_blank"
                rel="noreferrer"
                title="Opens the public page in a new tab. Save first to see your latest changes."
              >
                <Eye className="size-4 mr-1" />
                {status === "published" ? "View live" : "Preview page"}
              </a>
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => save()}
            disabled={isPending || !title.trim()}
          >
            {status === "draft" ? "Save draft" : "Save changes"}
          </Button>
          {status !== "published" ? (
            <Popover open={scheduleOpen} onOpenChange={openScheduleChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isPending || !title.trim()}
                >
                  <CalendarClock className="size-4 mr-1.5" />
                  {status === "scheduled" ? "Reschedule" : "Schedule"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      Schedule this article
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      It stays hidden until the time you pick, then goes live
                      on its own at dreamriver.io/blog/
                      {effectiveSlug || "…"} — no extra step needed. Times are
                      your local time.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="post-schedule-at" className="text-xs">
                      Go live at
                    </Label>
                    <Input
                      id="post-schedule-at"
                      type="datetime-local"
                      value={scheduleDraft}
                      onChange={(e) => setScheduleDraft(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {status === "scheduled" && postId ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={unschedule}
                        disabled={isPending}
                      >
                        Back to draft
                      </Button>
                    ) : (
                      <span />
                    )}
                    <Button
                      size="sm"
                      onClick={scheduleAt}
                      disabled={isPending}
                    >
                      {status === "scheduled" ? "Update schedule" : "Schedule"}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
          <Button
            onClick={publishToggle}
            disabled={isPending || !title.trim()}
          >
            <Globe className="size-4 mr-1.5" />
            {status === "published"
              ? "Unpublish"
              : status === "scheduled"
                ? "Publish now"
                : "Publish"}
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
                {!preview && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="Undo (also works after toolbar insertions)"
                      aria-label="Undo"
                      onClick={undo}
                      disabled={!canUndo}
                    >
                      <Undo2 className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="Redo"
                      aria-label="Redo"
                      onClick={redo}
                      disabled={!canRedo}
                    >
                      <Redo2 className="size-4" />
                    </Button>
                    <div
                      className="w-px h-4 bg-border mx-0.5"
                      aria-hidden="true"
                    />
                  </>
                )}
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
                onChange={(e) => {
                  setContent(e.target.value);
                  scheduleHistorySnapshot();
                }}
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
                {status !== "draft" ? (
                  <p className="text-[11px] text-amber-700 dark:text-gold mt-1">
                    {status === "scheduled"
                      ? "Changing the slug changes the address it will go live at."
                      : "Changing the slug of a published post breaks its old link."}
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
