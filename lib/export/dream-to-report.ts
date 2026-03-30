// Transforms a DreamEntry (from Supabase) into ExportReportData for the card UI.

import type { DreamEntry } from '@/schema/dreamEntry';
import type { BibleCitation } from '@/schema/bibleCitations';
import type { ExportReportData, ExportSection } from '@/lib/types/report-export';

interface TransformOptions {
  dreamEntry: DreamEntry;
  bibleCitations?: BibleCitation[];
  userName?: string;
}

export function dreamToReportData({
  dreamEntry,
  bibleCitations = [],
  userName = 'Dreamer',
}: TransformOptions): ExportReportData {
  const sections: ExportSection[] = [];
  let order = 0;

  // Section 1 — Dream Narrative
  sections.push({
    id: 'dream-narrative',
    title: 'Dream Narrative',
    content: dreamEntry.original_text || '',
    subsections: [],
    order: order++,
  });

  // Section 2 — Spiritual Analysis
  const analysisContent = dreamEntry.formatted_analysis
    || dreamEntry.analysis_summary
    || '';
  if (analysisContent) {
    const subsections = [];

    if (dreamEntry.topic_sentence) {
      subsections.push({
        heading: 'Theme',
        content: dreamEntry.topic_sentence,
      });
    }

    if (dreamEntry.supporting_points && dreamEntry.supporting_points.length > 0) {
      dreamEntry.supporting_points.forEach((point, i) => {
        subsections.push({
          heading: `Insight ${i + 1}`,
          content: point,
        });
      });
    }

    if (dreamEntry.conclusion_sentence) {
      subsections.push({
        heading: 'Conclusion',
        content: dreamEntry.conclusion_sentence,
      });
    }

    sections.push({
      id: 'spiritual-analysis',
      title: 'Spiritual Analysis',
      content: analysisContent,
      subsections,
      order: order++,
    });
  }

  // Section 3 — Biblical References
  if (bibleCitations.length > 0 || (dreamEntry.bible_refs && dreamEntry.bible_refs.length > 0)) {
    const refSubsections = bibleCitations.map((cite) => ({
      heading: `${cite.bible_book} ${cite.chapter}:${cite.verse}${cite.end_verse ? `-${cite.end_verse}` : ''}`,
      content: cite.full_text || '',
    }));

    // Fall back to bible_refs array if no citation records
    if (refSubsections.length === 0 && dreamEntry.bible_refs) {
      dreamEntry.bible_refs.forEach((ref) => {
        refSubsections.push({
          heading: ref,
          content: '',
        });
      });
    }

    sections.push({
      id: 'biblical-references',
      title: 'Biblical References',
      content: '',
      subsections: refSubsections,
      order: order++,
    });
  }

  // Section 4 — Personal Reflection
  if (dreamEntry.personalized_summary) {
    sections.push({
      id: 'personal-reflection',
      title: 'Personal Reflection',
      content: dreamEntry.personalized_summary,
      subsections: [],
      order: order++,
    });
  }

  // Section 5 — Tags / Themes
  if (dreamEntry.tags && dreamEntry.tags.length > 0) {
    sections.push({
      id: 'themes-tags',
      title: 'Themes & Symbols',
      content: dreamEntry.tags.join(', '),
      subsections: [],
      order: order++,
    });
  }

  const createdAt = dreamEntry.created_at
    ? new Date(dreamEntry.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });

  return {
    title: dreamEntry.title || 'Dream Analysis Report',
    subtitle: 'Biblical Dream Interpretation',
    student: {
      name: userName,
      id: dreamEntry.user_id,
      dateOfBirth: '',
      grade: '',
    },
    evaluatorName: 'DreamRiver AI',
    evaluationDate: createdAt,
    reportDate: createdAt,
    sections,
    organizationName: 'DreamRiver',
    confidentialityNotice: 'This report is a personal spiritual reflection.',
  };
}
