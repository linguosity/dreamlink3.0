"use client";

// app/admin/blog/_components/import-posts.tsx
//
// "Import posts" affordance for the admin Journal list: pick multiple .md
// files with YAML-ish front-matter (see the format-help popover), read them
// client-side, and hand the text to importPostsAction. Files import as
// drafts — or as scheduled posts when front-matter includes scheduled_for
// (lazy publish: they go live on their own when the time passes; no cron).
// Existing slugs are never overwritten; per-file results are listed below
// with a link into each created post's editor.

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarClock,
  CheckCircle2,
  FileUp,
  HelpCircle,
  Loader2,
  MinusCircle,
  X,
  XCircle,
} from "lucide-react";
import { importPostsAction, type ImportFileResult } from "../actions";

// A markdown article should be tiny; anything bigger is probably the wrong file.
const MAX_FILE_BYTES = 512 * 1024;

const EXAMPLE = `---
title: What Does It Mean to Dream About Water?
slug: dream-about-water
excerpt: Water shows up in dreams more than any other symbol. Here is what scripture says.
seo_title: Dreaming About Water — Biblical Meaning
seo_description: What the Bible says about water in dreams, and how to interpret yours.
tags: [dreams, symbols, water]
scheduled_for: 2026-08-01 09:00
---

Your article starts here, written in plain Markdown.

## Use headings like this

Blank line = new paragraph.`;

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ResultIcon({ status }: { status: ImportFileResult["status"] }) {
  switch (status) {
    case "created":
      return (
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      );
    case "scheduled":
      return (
        <CalendarClock className="size-4 shrink-0 text-amber-600 dark:text-gold" />
      );
    case "skipped":
      return <MinusCircle className="size-4 shrink-0 text-muted-foreground" />;
    case "error":
      return <XCircle className="size-4 shrink-0 text-destructive" />;
  }
}

export function ImportPosts() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<ImportFileResult[] | null>(null);

  async function onFilesChosen(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    // Read everything client-side first; oversized files fail locally
    // without blocking the rest of the batch.
    const localFailures: ImportFileResult[] = [];
    const payload: { name: string; content: string }[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        localFailures.push({
          file: file.name,
          slug: null,
          status: "error",
          message: "File is larger than 512 KB — is this really an article?",
          id: null,
          scheduled_for: null,
        });
        continue;
      }
      payload.push({ name: file.name, content: await file.text() });
    }
    if (inputRef.current) inputRef.current.value = ""; // allow re-picking same files

    startTransition(async () => {
      let serverResults: ImportFileResult[] = [];
      if (payload.length > 0) {
        const res = await importPostsAction(payload);
        if ("error" in res) {
          toast.error(res.error);
          setResults(localFailures.length > 0 ? localFailures : null);
          return;
        }
        serverResults = res.results;
      }
      const all = [...serverResults, ...localFailures];
      setResults(all);
      const imported = all.filter(
        (r) => r.status === "created" || r.status === "scheduled"
      ).length;
      if (imported > 0) {
        toast.success(
          `Imported ${imported} article${imported === 1 ? "" : "s"}`
        );
      } else {
        toast.info("Nothing imported — see the results below.");
      }
      router.refresh();
    });
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Import file format"
              aria-label="Import file format help"
            >
              <HelpCircle className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[26rem] max-w-[90vw] max-h-[70vh] overflow-y-auto">
            <p className="text-sm font-medium">Import file format</p>
            <p className="text-xs text-muted-foreground mt-1.5">
              Each <span className="font-mono">.md</span> file starts with a
              front-matter block between two <span className="font-mono">---</span>{" "}
              lines; everything after it is the article body in Markdown.
            </p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
              <li>
                <span className="font-mono text-foreground">title</span> —
                required. The article headline.
              </li>
              <li>
                <span className="font-mono text-foreground">slug</span> —
                required. The web address: dreamriver.io/blog/&lt;slug&gt;.
              </li>
              <li>
                <span className="font-mono text-foreground">excerpt</span> —
                teaser shown on the blog page and in Google results.
              </li>
              <li>
                <span className="font-mono text-foreground">seo_title</span> —
                Google preview title (defaults to the title).
              </li>
              <li>
                <span className="font-mono text-foreground">seo_description</span>{" "}
                — search description (defaults to the teaser).
              </li>
              <li>
                <span className="font-mono text-foreground">tags</span> —{" "}
                <span className="font-mono">[dreams, water]</span> or a comma
                list.
              </li>
              <li>
                <span className="font-mono text-foreground">scheduled_for</span>{" "}
                — optional go-live time:{" "}
                <span className="font-mono">&quot;2026-08-01 09:00&quot;</span>{" "}
                (UTC) or full ISO like{" "}
                <span className="font-mono">2026-08-01T09:00:00Z</span>. With
                it the post imports as Scheduled and goes live on its own;
                without it, as a Draft.
              </li>
            </ul>
            <pre className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-[11px] leading-relaxed overflow-x-auto whitespace-pre">
              {EXAMPLE}
            </pre>
            <p className="text-xs text-muted-foreground mt-2">
              Articles are never overwritten: if a slug already exists, that
              file is skipped and reported.
            </p>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="size-4 mr-1.5 animate-spin" />
          ) : (
            <FileUp className="size-4 mr-1.5" />
          )}
          {isPending ? "Importing…" : "Import posts"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".md,.markdown,text/markdown"
          multiple
          className="hidden"
          onChange={(e) => onFilesChosen(e.target.files)}
        />
      </div>

      {results ? (
        <Card className="mt-3">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Import results</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setResults(null)}
                title="Dismiss results"
                aria-label="Dismiss import results"
              >
                <X className="size-4" />
              </Button>
            </div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {results.map((r, i) => (
                <li
                  key={`${r.file}-${i}`}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm"
                >
                  <ResultIcon status={r.status} />
                  <span className="font-mono text-xs">{r.file}</span>
                  <span className="text-muted-foreground text-xs">
                    {r.status === "scheduled" &&
                    r.scheduled_for &&
                    new Date(r.scheduled_for).getTime() > Date.now()
                      ? `Scheduled — goes live ${formatWhen(r.scheduled_for)}.`
                      : r.message}
                  </span>
                  {r.id && r.status !== "skipped" ? (
                    <Link
                      href={`/admin/blog/${r.id}`}
                      className="text-xs text-primary underline underline-offset-4 hover:no-underline"
                    >
                      Open in editor
                    </Link>
                  ) : null}
                  {r.id && r.status === "skipped" ? (
                    <Link
                      href={`/admin/blog/${r.id}`}
                      className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      Open existing post
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
