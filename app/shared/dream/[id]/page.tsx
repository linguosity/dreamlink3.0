// app/shared/dream/[id]/page.tsx
//
// Server-rendered share page (2026-06-09 audit, H-tier UX): this page is the
// one surface built to be shared, but it used to be a client component that
// fetched via useEffect — no SSR, no per-dream OpenGraph tags, so texted or
// posted links rendered with no preview. It now renders on the server with
// per-dream metadata; the [id] segment carries the opaque share_token.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSharedDream, type SharedDream } from '@/lib/sharedDream';
import { AiDisclosure } from '@/components/brand/AiDisclosure';
import ShareButtons from './share-buttons';

// Always fetch fresh — the owner can revoke sharing at any moment.
export const dynamic = 'force-dynamic';

// Kept in sync with DEEP_SECTIONS / PROFOUND_SECTIONS in lib/dreamAnalysis.ts
// and with SECTION_HEADINGS in components/DreamCard.tsx. The composer writes
// plain text, so matching the exact strings is the only way to tell a heading
// from prose.
const SHARED_SECTION_HEADINGS = new Set([
  'Dream Symbols',
  'How this might apply to your life right now',
  'Three Lenses on This Dream',
  'For your prayer or journal',
]);

async function loadDream(token: string): Promise<SharedDream | null> {
  try {
    return await getSharedDream(token);
  } catch {
    return null;
  }
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const dream = await loadDream(id);

  if (!dream) {
    return {
      title: 'Dream not available — DreamRiver',
      robots: { index: false },
    };
  }

  const title = dream.title || 'A dream on DreamRiver';
  const description = (
    dream.personalized_summary ||
    dream.dream_summary ||
    'A dream interpreted with biblical insight on DreamRiver.'
  ).substring(0, 200);

  return {
    title: `${title} — DreamRiver`,
    description,
    // Privacy: share links are capability URLs meant for the people they're
    // sent to — keep them out of search engines. Link previews (OG/Twitter)
    // still work; crawlers just won't index the page.
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'DreamRiver',
      ...(dream.image_url ? { images: [{ url: dream.image_url }] } : {}),
    },
    twitter: {
      card: dream.image_url ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(dream.image_url ? { images: [dream.image_url] } : {}),
    },
  };
}

export default async function SharedDreamPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const dream = await loadDream(id);

  if (!dream) {
    return (
      <div className="container py-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Dream not available</h1>
          <p className="text-muted-foreground">
            This dream isn&apos;t shared, or the link has been turned off by its owner.
          </p>
          <Link href="/">
            <Button className="mt-4">Go to DreamRiver</Button>
          </Link>
        </div>
      </div>
    );
  }

  const summary = dream.dream_summary || '';
  const shareableText = `${dream.title || 'A dream on DreamRiver'}: ${summary.substring(0, 100)}${summary.length > 100 ? '…' : ''}`;

  return (
    <div className="container py-10">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-2">{dream.title || 'Untitled dream'}</h1>

          {dream.scope === 'full' && dream.original_text && (
            <div className="mb-4">
              <h2 className="text-lg font-medium mb-2">The Dream</h2>
              <p className="text-muted-foreground whitespace-pre-wrap max-w-[65ch]">{dream.original_text}</p>
            </div>
          )}

          {dream.dream_summary && (
            <div className="mb-4">
              <h2 className="text-lg font-medium mb-2">Dream Summary</h2>
              <p className="text-muted-foreground max-w-[65ch]">{dream.dream_summary}</p>
            </div>
          )}

          {(dream.formatted_analysis || dream.analysis_summary) && (
            <div className="mb-4">
              <h2 className="text-lg font-medium mb-2">Analysis</h2>
              {/* AI disclosure, above the reading and carrying the mark
                  (HANDOFF-v3.md §5 item 1). This page is the only DreamRiver
                  surface a stranger ever sees, so it is the one that most
                  needs to say what produced the words. */}
              <AiDisclosure
                verseCount={dream.citations.length}
                className="mb-4 max-w-[65ch]"
              />
              {/* The composer joins prose and section headings with "\n\n".
                  Rendering that in a bare <p> let HTML collapse every blank
                  line, so a shared profound reading arrived as one wall of
                  text with its headings buried mid-sentence — on the one
                  surface built for people who don't have an account yet. */}
              <div className="space-y-3 text-muted-foreground max-w-[65ch]">
                {(dream.formatted_analysis || dream.analysis_summary)!
                  .split(/\n{2,}/)
                  .map((b: string) => b.trim())
                  .filter(Boolean)
                  .map((block: string, i: number) =>
                    SHARED_SECTION_HEADINGS.has(block) ? (
                      <h3 key={i} className="text-base font-semibold text-foreground pt-2">
                        {block}
                      </h3>
                    ) : (
                      <p key={i} className="whitespace-pre-wrap">
                        {block}
                      </p>
                    ),
                  )}
              </div>
            </div>
          )}

          {/* Themed verse citations (§5 item 2). The disclosure above says the
              reading is "grounded in the verses below" — before this, there
              were no verses below, only a references array the page never
              rendered. Each verse now shows the theme it was matched on, so a
              reader can check the link between dream and scripture rather
              than take it on trust. */}
          {dream.citations.length > 0 && (
            <div className="mb-4">
              <h2 className="text-lg font-medium mb-2">Verses matched</h2>
              <div className="max-w-[65ch]">
                {dream.citations.map((citation, i) => (
                  <div key={i} className="border-t py-3.5">
                    <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-medium text-primary">
                        {citation.reference}
                      </span>
                      {citation.theme && (
                        <span className="text-[13px] text-muted-foreground">
                          · matched on {citation.theme}
                        </span>
                      )}
                    </div>
                    {citation.text && (
                      <p className="font-serif text-[15.5px] leading-relaxed">
                        {citation.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <Link href="/">
              <Button variant="outline">Go to DreamRiver</Button>
            </Link>

            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-2">Share:</span>
              <ShareButtons title={shareableText} />
            </div>
          </div>
        </Card>

        {/* Share-loop CTA — this page is the only surface anonymous visitors
            ever see, so it carries one quiet conversion moment. The UTM
            params attribute resulting signups to shared dreams. */}
        <Card className="mt-6 p-6 text-center sm:p-8">
          <h2 className="text-xl font-bold mb-2 sm:text-2xl">What did you dream?</h2>
          <p className="text-muted-foreground mb-5">
            Keep a dream journal and receive biblically-grounded interpretation — 3 free.
          </p>
          <Button asChild size="lg" className="w-full rounded-full font-semibold sm:w-auto">
            <Link href="/sign-up?utm_source=share&utm_medium=dream&utm_campaign=shared_dream">
              Interpret your own dream
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
