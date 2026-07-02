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
import ShareButtons from './share-buttons';

// Always fetch fresh — the owner can revoke sharing at any moment.
export const dynamic = 'force-dynamic';

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
              <p className="text-muted-foreground whitespace-pre-wrap">{dream.original_text}</p>
            </div>
          )}

          {dream.dream_summary && (
            <div className="mb-4">
              <h2 className="text-lg font-medium mb-2">Dream Summary</h2>
              <p className="text-muted-foreground">{dream.dream_summary}</p>
            </div>
          )}

          {dream.analysis_summary && (
            <div className="mb-4">
              <h2 className="text-lg font-medium mb-2">Analysis</h2>
              <p className="text-muted-foreground">{dream.analysis_summary}</p>
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
      </div>
    </div>
  );
}
