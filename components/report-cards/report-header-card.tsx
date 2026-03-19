'use client';

import { REPORT_COLORS } from '@/lib/styles/report-card-colors';

interface ReportHeaderCardProps {
  title: string;
  subtitle: string;
  organizationName: string;
  confidentialityNotice: string;
  evaluatorName: string;
  evaluationDate: string;
  reportDate: string;
  dreamerName: string;
}

export default function ReportHeaderCard({
  title,
  subtitle,
  organizationName,
  confidentialityNotice,
  evaluatorName,
  evaluationDate,
  reportDate,
  dreamerName,
}: ReportHeaderCardProps) {
  return (
    <div
      className="rounded-lg border shadow-sm overflow-hidden"
      style={{ borderColor: REPORT_COLORS.border }}
    >
      {/* Organization name + confidentiality */}
      <div
        className="px-4 py-2 text-center text-xs"
        style={{ backgroundColor: REPORT_COLORS.light, color: REPORT_COLORS.muted }}
      >
        <p className="font-semibold text-sm" style={{ color: REPORT_COLORS.navy }}>
          {organizationName}
        </p>
        <p className="mt-0.5 italic">{confidentialityNotice}</p>
      </div>

      {/* Title bar */}
      <div
        className="px-4 py-3 text-center"
        style={{ backgroundColor: REPORT_COLORS.navy, color: REPORT_COLORS.white }}
      >
        <h1 className="text-lg font-bold tracking-wide">{title}</h1>
        <p className="text-xs opacity-80 mt-0.5">{subtitle}</p>
      </div>

      {/* Info grid */}
      <div
        className="grid grid-cols-2 gap-x-6 gap-y-1 px-4 py-3 text-sm"
        style={{ backgroundColor: REPORT_COLORS.headerBg }}
      >
        <InfoRow label="Dreamer" value={dreamerName} />
        <InfoRow label="Interpreter" value={evaluatorName} />
        <InfoRow label="Dream Date" value={evaluationDate} />
        <InfoRow label="Report Date" value={reportDate} />
      </div>

      {/* Accent separator */}
      <div className="h-1" style={{ backgroundColor: REPORT_COLORS.accent }} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <span className="font-semibold" style={{ color: REPORT_COLORS.navy }}>
        {label}:
      </span>
      <span style={{ color: REPORT_COLORS.text }}>{value || '—'}</span>
    </div>
  );
}
