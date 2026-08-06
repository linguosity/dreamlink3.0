// components/brand/AiDisclosure.tsx
//
// The AI disclosure line — HANDOFF-v3.md §5 item 1.
//
// "Generated with AI and grounded in the verses below. A starting point for
// reflection — not doctrine."
//
// Three deliberate properties, all from the handoff:
//
//  1. ABOVE the interpretation, not under it. A label a reader meets after
//     they have already absorbed a reading as truth is not a disclosure.
//  2. Carries the mark. On a product whose readings are scripture-adjacent,
//     the label has to say *who* is speaking, and the mark is what says it.
//  3. Fixed wording, one implementation. Every interpretation surface
//     (journal dialog, public share page) imports this rather than
//     paraphrasing, so the disclosure can't drift out of sync between the
//     screen the owner sees and the screen they send to someone else.
//
// Styling follows the capture-flow prototype's `.aidisclose`: tinted
// surface, hairline border, muted body — quiet, but not hidden. It is a
// server component; the mark renders identically on both.

import { DrLogo } from "@/components/brand/DrLogo";

export function AiDisclosure({
  /** Number of verses shown below, when known. Renders "the 3 verses below"
   *  instead of "the verses below" — a specific count reads as a checkable
   *  claim rather than a hedge. */
  verseCount,
  className = "",
}: {
  verseCount?: number;
  className?: string;
}) {
  const verses =
    verseCount && verseCount > 0
      ? `the ${verseCount} verse${verseCount === 1 ? "" : "s"} below`
      : "the verses below";

  return (
    <div
      className={`flex items-start gap-2.5 rounded-[var(--radius-md)] border bg-accent px-3.5 py-3 text-[12.5px] leading-[1.5] text-muted-foreground ${className}`}
    >
      <DrLogo variant="mark" size={16} className="mt-px shrink-0" />
      <span>
        Generated with AI and grounded in {verses}. A starting point for
        reflection — not doctrine.
      </span>
    </div>
  );
}
