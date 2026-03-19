// Types for the report card / export system.
// Transforms a DreamEntry's AI analysis into structured report sections.

export interface StudentInfo {
  name: string;
  id: string;
  dateOfBirth: string;
  grade: string;
}

export interface ExportSubsection {
  heading: string;
  content: string;      // may contain HTML
}

export interface ExportSection {
  id: string;           // stable key for DnD + React keys
  title: string;
  content: string;      // main body (may contain HTML)
  subsections: ExportSubsection[];
  order: number;
}

export interface ExportReportData {
  title: string;
  subtitle: string;
  student: StudentInfo;
  evaluatorName: string;
  evaluationDate: string;
  reportDate: string;
  sections: ExportSection[];
  organizationName: string;
  confidentialityNotice: string;
}

// ─── Change tracking types ──────────────────────────────────

export interface ChangeProposal {
  sectionId: string;
  proposedTitle?: string;
  proposedContent?: string;
  proposedSubsections?: ExportSubsection[];
  reason?: string;       // e.g. "AI re-analysis", "data import"
  timestamp: number;
}

export type ChangeStatus = 'pending' | 'accepted' | 'rejected';

export interface ChangeState {
  status: ChangeStatus;
  proposal: ChangeProposal;
  reviewedAt?: number;
}

// ─── Helpers ────────────────────────────────────────────────

// Roman numeral helper
export function toRoman(num: number): string {
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let result = '';
  let remaining = num;
  for (const [value, symbol] of map) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result;
}

// Strip HTML tags to get plain text preview
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
