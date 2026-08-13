"use client";

// app/admin/blog/_components/import-posts.tsx
//
// "Import posts" affordance for the admin Journal list: pick multiple .md
// files with YAML-ish front-matter (see the format-help popover) and read
// them client-side. Nothing imports immediately — the files wait in a
// "publish plan" panel: import as drafts (default), publish everything now,
// or schedule one per day / one per week from a chosen start time. The
// per-file outcome preview and the server action share ONE pure helper
// (../_lib/import-plan) so they cannot drift, and the server recomputes all
// dates itself. A file whose front-matter has its own scheduled_for keeps
// that time in every mode and consumes no slot in the daily/weekly sequence.
// Existing slugs are never overwritten; per-file results are listed below
// with a link into each created post's editor.

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarClock,
  CheckCircle2,
  FileUp,
  Globe,
  HelpCircle,
  Loader2,
  MinusCircle,
  X,
  XCircle,
} from "lucide-react";
import { importPostsAction, type ImportFileResult } from "../actions";
import {
  planAssignments,
  planStartError,
  type ImportPlan,
  type ImportPlanMode,
} from "../_lib/import-plan";

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
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Mon, Aug 3, 9:00 AM" for the plan preview (year added when not this year). */
function formatPlanWhen(iso: string): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return d.toLocaleString(undefined, opts);
}

function ResultIcon({ status }: { status: ImportFileResult["status"] }) {
  switch (status) {
    case "created":
      return (
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      );
    case "published":
      return (
        <Globe className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      );
    case "scheduled":
      return (
        <CalendarClock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      );
    case "skipped":
      return <MinusCircle className="size-4 shrink-0 text-muted-foreground" />;
    case "error":
      return <XCircle className="size-4 shrink-0 text-destructive" />;
  }
}

const MD_NAME = /\.(md|markdown)$/i;

/**
 * PREVIEW ONLY: light sniff for a scheduled_for key in the front-matter
 * block (the text between the first two "---" lines), mirroring the shape
 * the server's parser accepts (key at line start, colon right after, some
 * value). The server's real parser stays authoritative.
 */
function detectOwnSchedule(content: string): boolean {
  const text = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return false;
  return /^scheduled_for:\s*\S/m.test(m[1]);
}

/** Tomorrow 09:00 local time, as a datetime-local input value. */
function defaultStartAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

interface StagedFile {
  name: string;
  content: string;
  /** Preview-only front-matter detection — see detectOwnSchedule. */
  hasOwnSchedule: boolean;
}

const PLAN_OPTIONS: { value: ImportPlanMode; label: string; hint: string }[] = [
  {
    value: "draft",
    label: "Import as drafts",
    hint: "nothing goes live until you publish each one",
  },
  {
    value: "publish",
    label: "Publish all immediately",
    hint: "live on the site the moment you confirm",
  },
  {
    value: "daily",
    label: "Schedule: one per day",
    hint: "one article each day, starting below",
  },
  {
    value: "weekly",
    label: "Schedule: one per week",
    hint: "one article every 7 days, starting below",
  },
];

export function ImportPosts() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<ImportFileResult[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // dragenter/dragleave fire for every child node — count depth instead of
  // toggling a boolean so the highlight doesn't flicker.
  const dragDepth = useRef(0);
  // Files read client-side, waiting in the plan panel (null = panel closed).
  const [staged, setStaged] = useState<StagedFile[] | null>(null);
  // Oversized files caught client-side; shown in the panel and merged into
  // the results after confirm (they never reach the server).
  const [localFailures, setLocalFailures] = useState<ImportFileResult[]>([]);
  const [mode, setMode] = useState<ImportPlanMode>("draft");
  // datetime-local value (local time); converted to ISO for the plan.
  const [startAtLocal, setStartAtLocal] = useState<string>("");

  const needsStart = mode === "daily" || mode === "weekly";
  const startAtMs = startAtLocal ? new Date(startAtLocal).getTime() : NaN;
  const startAtIso = Number.isFinite(startAtMs)
    ? new Date(startAtMs).toISOString()
    : undefined;
  const previewPlan: ImportPlan = { mode, startAt: startAtIso };
  const startError = planStartError(previewPlan);
  // Same shared helper the server uses — the preview cannot drift from it.
  const previewAssignments =
    staged && !startError
      ? planAssignments(
          staged.map((f) => ({ hasOwnSchedule: f.hasOwnSchedule })),
          previewPlan
        )
      : null;

  function outcomeText(f: StagedFile, i: number): string {
    const a = previewAssignments?.[i];
    if (!a) {
      return f.hasOwnSchedule
        ? "Keeps its own scheduled_for from the file"
        : "Pick a valid start time above";
    }
    switch (a.kind) {
      case "own-schedule":
        return "Keeps its own scheduled_for from the file";
      case "draft":
        return "Draft";
      case "publish":
        return "Publishes immediately";
      case "scheduled":
        return `Goes live ${formatPlanWhen(a.scheduledFor)}`;
    }
  }

  async function onFilesChosen(list: FileList | File[] | null) {
    if (!list || list.length === 0) return;
    const all = Array.from(list);
    // Drag & drop can hand us anything — keep Markdown, reject the rest loudly.
    const rejected = all.filter((f) => !MD_NAME.test(f.name));
    const files = all.filter((f) => MD_NAME.test(f.name));
    if (rejected.length > 0) {
      toast.error(
        `Only Markdown (.md) files can be imported — skipped ${rejected
          .map((f) => f.name)
          .join(", ")}. Click the ? for the exact format.`
      );
    }
    if (files.length === 0) return;
    // Read everything client-side; oversized files fail locally without
    // blocking the rest of the batch. Nothing imports yet — the files wait
    // in the plan panel below until the import is confirmed.
    const failures: ImportFileResult[] = [];
    const read: StagedFile[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        failures.push({
          file: file.name,
          slug: null,
          status: "error",
          message: "File is larger than 512 KB — is this really an article?",
          id: null,
          scheduled_for: null,
        });
        continue;
      }
      const content = await file.text();
      read.push({
        name: file.name,
        content,
        hasOwnSchedule: detectOwnSchedule(content),
      });
    }
    if (inputRef.current) inputRef.current.value = ""; // allow re-picking same files

    // Merge into a batch already waiting in the panel; re-dropping a file
    // name replaces its previous copy instead of duplicating it.
    const incoming = new Set(files.map((f) => f.name));
    const wasOpen = staged !== null && staged.length > 0;
    const mergedStaged = [
      ...(staged ?? []).filter((f) => !incoming.has(f.name)),
      ...read,
    ];
    const mergedFailures = [
      ...localFailures.filter((r) => !incoming.has(r.file)),
      ...failures,
    ];

    if (mergedStaged.length === 0) {
      // Nothing importable — surface the local failures immediately.
      setStaged(null);
      setLocalFailures([]);
      if (mergedFailures.length > 0) {
        setResults(mergedFailures);
        toast.info("Nothing imported — see the results below.");
      }
      return;
    }
    if (!wasOpen) {
      // Fresh batch: reset the plan to its defaults.
      setMode("draft");
      setStartAtLocal(defaultStartAt());
      setResults(null);
    }
    setStaged(mergedStaged);
    setLocalFailures(mergedFailures);
  }

  function cancelImport() {
    setStaged(null);
    setLocalFailures([]);
  }

  function confirmImport() {
    if (!staged || staged.length === 0 || isPending) return;
    const plan: ImportPlan = needsStart ? { mode, startAt: startAtIso } : { mode };
    if (planStartError(plan)) return; // confirm is disabled in this state
    const payload = staged.map(({ name, content }) => ({ name, content }));
    const failures = localFailures;
    startTransition(async () => {
      const res = await importPostsAction(payload, plan);
      if ("error" in res) {
        // Keep the panel open so the plan (e.g. a start time that slipped
        // into the past) can be fixed and confirmed again.
        toast.error(res.error);
        return;
      }
      const all = [...res.results, ...failures];
      setStaged(null);
      setLocalFailures([]);
      setResults(all);
      const imported = all.filter(
        (r) =>
          r.status === "created" ||
          r.status === "scheduled" ||
          r.status === "published"
      ).length;
      const published = all.filter((r) => r.status === "published").length;
      if (imported > 0) {
        toast.success(
          published > 0
            ? `Imported ${imported} article${imported === 1 ? "" : "s"} — ${published} now live.`
            : `Imported ${imported} article${imported === 1 ? "" : "s"}`
        );
      } else {
        toast.info("Nothing imported — see the results below.");
      }
      router.refresh();
    });
  }

  return (
    <div className="mb-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Import posts — drop Markdown files here or press Enter to browse"
        title="Markdown (.md) files with a front-matter header — click the ? for the exact format"
        onClick={() => !isPending && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isPending) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setIsDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setIsDragging(false);
          if (!isPending) onFilesChosen(Array.from(e.dataTransfer.files));
        }}
        className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-lg border border-dashed px-4 py-3 text-sm cursor-pointer transition-colors focus-ring
          ${
            isDragging
              ? "border-primary bg-primary/5 text-foreground"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          } ${isPending ? "opacity-60 pointer-events-none" : ""}`}
      >
        {isPending ? (
          <Loader2 className="size-4 shrink-0 animate-spin" />
        ) : (
          <FileUp className="size-4 shrink-0" />
        )}
        <span>
          {isPending ? (
            "Importing…"
          ) : (
            <>
              Drag &amp; drop{" "}
              <span className="font-medium text-foreground">
                Markdown (.md)
              </span>{" "}
              files here, or click to browse
            </>
          )}
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              title="Import file format"
              aria-label="Import file format help"
              onClick={(e) => e.stopPropagation()}
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
                without it, it follows the import plan you pick after choosing
                files.
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
        <input
          ref={inputRef}
          type="file"
          accept=".md,.markdown,text/markdown"
          multiple
          className="hidden"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onFilesChosen(e.target.files)}
        />
      </div>

      {staged && staged.length > 0 ? (
        <Card className="mt-3">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">
                {staged.length} article{staged.length === 1 ? "" : "s"} ready.
                How should they go live?
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={cancelImport}
                disabled={isPending}
                title="Cancel import"
                aria-label="Cancel import and clear chosen files"
              >
                <X className="size-4" />
              </Button>
            </div>
            <fieldset className="mt-3" disabled={isPending}>
              <legend className="sr-only">
                How should these articles go live?
              </legend>
              <div className="flex flex-col gap-1.5">
                {PLAN_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className="flex cursor-pointer items-baseline gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="import-plan-mode"
                      value={o.value}
                      checked={mode === o.value}
                      onChange={() => setMode(o.value)}
                      className="translate-y-0.5 accent-primary"
                    />
                    <span>
                      <span className="font-medium">{o.label}</span>{" "}
                      <span className="text-xs text-muted-foreground">
                        — {o.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {needsStart ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 pl-6">
                  <Label
                    htmlFor="import-plan-start"
                    className="text-xs font-normal text-muted-foreground"
                  >
                    First article goes live
                  </Label>
                  <Input
                    id="import-plan-start"
                    type="datetime-local"
                    value={startAtLocal}
                    onChange={(e) => setStartAtLocal(e.target.value)}
                    className="h-8 w-auto text-sm"
                  />
                  {startError ? (
                    <p className="text-xs text-destructive">{startError}</p>
                  ) : null}
                </div>
              ) : null}
            </fieldset>
            <p className="mt-2 text-xs text-muted-foreground">
              Files that set their own{" "}
              <span className="font-mono">scheduled_for</span> keep that time
              and don&apos;t take a slot in the sequence — the rest go in the
              order listed below.
            </p>
            <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
              {staged.map((f, i) => (
                <li
                  key={f.name}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm"
                >
                  <span className="font-mono text-xs">{f.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {outcomeText(f, i)}
                  </span>
                </li>
              ))}
              {localFailures.map((r, i) => (
                <li
                  key={`${r.file}-${i}`}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm"
                >
                  <XCircle className="size-4 shrink-0 text-destructive" />
                  <span className="font-mono text-xs">{r.file}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.message}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "publish" ? "destructive" : "default"}
                onClick={confirmImport}
                disabled={isPending || !!startError}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  `Import ${staged.length} article${staged.length === 1 ? "" : "s"}`
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={cancelImport}
                disabled={isPending}
              >
                Cancel
              </Button>
              {mode === "publish" ? (
                <p className="basis-full text-xs font-medium text-destructive sm:basis-auto">
                  Publish {staged.length} article
                  {staged.length === 1 ? "" : "s"} now — they go live on
                  dreamriver.io the moment you confirm.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

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
                      ? `${r.message} Goes live ${formatWhen(r.scheduled_for)}.`
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
