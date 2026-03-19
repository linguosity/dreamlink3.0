// app/dream/[id]/report/page.tsx
//
// Server component that fetches a dream entry by ID, transforms it into
// report data, and renders the WYSIWYG card preview.

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { dreamToReportData } from '@/lib/export/dream-to-report';
import ReportPageClient from '@/components/report-cards/report-page-client';
import Link from 'next/link';

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return redirect('/sign-in');
  }

  // Fetch dream entry
  const { data: dreamEntry, error: dreamError } = await supabase
    .from('dream_entries')
    .select('*')
    .eq('id', id)
    .single();

  if (dreamError || !dreamEntry) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-bold mb-2">Dream Not Found</h1>
        <p className="text-muted-foreground mb-4">
          This dream entry doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link href="/" className="text-primary hover:underline">
          Back to dreams
        </Link>
      </div>
    );
  }

  // Fetch bible citations for this dream
  const { data: bibleCitations } = await supabase
    .from('bible_citations')
    .select('*')
    .eq('dream_entry_id', id)
    .order('citation_order', { ascending: true });

  // Get user profile for name
  const { data: profile } = await supabase
    .from('profile')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const userName = user.user_metadata?.full_name
    || user.user_metadata?.name
    || user.email?.split('@')[0]
    || 'Dreamer';

  // Transform dream data into report format
  const reportData = dreamToReportData({
    dreamEntry,
    bibleCitations: bibleCitations || [],
    userName,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav bar */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; Back to Dreams
            </Link>
            <span className="text-muted-foreground/40">|</span>
            <h1 className="text-sm font-semibold truncate max-w-[300px]">
              {dreamEntry.title || 'Dream Report'}
            </h1>
          </div>
        </div>
      </div>

      {/* Report preview with change-tracking support */}
      <ReportPageClient reportData={reportData} />
    </div>
  );
}
