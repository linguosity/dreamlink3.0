'use client';

import { useRef, useState, useEffect } from 'react';
import { REPORT_COLORS } from '@/lib/styles/report-card-colors';
import { CHANGE_COLORS } from '@/lib/styles/report-card-colors';
import { toRoman, stripHtml } from '@/lib/types/report-export';
import type { ExportSection, ChangeStatus } from '@/lib/types/report-export';

interface ReportSectionCardProps {
  section: ExportSection;
  sectionIndex: number;
  onClick: () => void;
  isDragging?: boolean;
  changeStatus?: ChangeStatus;
  pendingLabel?: string;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export default function ReportSectionCard({
  section,
  sectionIndex,
  onClick,
  isDragging = false,
  changeStatus,
  pendingLabel,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: ReportSectionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const preview = stripHtml(section.content).slice(0, 120);
  const subsectionCount = section.subsections.length;

  // Flash animation state for accept/reject feedback
  const [flashColor, setFlashColor] = useState<string | null>(null);

  useEffect(() => {
    if (changeStatus === 'accepted') {
      setFlashColor(CHANGE_COLORS.accepted);
      const t = setTimeout(() => setFlashColor(null), 600);
      return () => clearTimeout(t);
    }
    if (changeStatus === 'rejected') {
      setFlashColor(CHANGE_COLORS.rejected);
      const t = setTimeout(() => setFlashColor(null), 600);
      return () => clearTimeout(t);
    }
  }, [changeStatus]);

  const isPending = changeStatus === 'pending';

  // Determine header background color
  const headerBg = flashColor
    ? flashColor
    : isPending
      ? CHANGE_COLORS.flagged
      : REPORT_COLORS.navy;

  // Determine border color
  const borderColor = isPending
    ? CHANGE_COLORS.flagged
    : REPORT_COLORS.border;

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={
        isPending
          ? `${section.title} — has pending changes waiting for review`
          : section.title
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        relative cursor-pointer select-none
        rounded-lg border-2 overflow-hidden
        transition-all duration-200
        hover:shadow-md hover:scale-[1.02]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        ${isDragging ? 'opacity-50 scale-95 shadow-lg' : 'shadow-sm'}
        ${isPending ? 'focus-visible:ring-amber-warm' : 'focus-visible:ring-primary'}
      `}
      style={{
        borderColor,
        backgroundColor: REPORT_COLORS.white,
        aspectRatio: '1 / 1',
      }}
    >
      {/* Heading bar with roman numeral + shimmer overlay */}
      <div
        className="px-3 py-2 flex items-center gap-2 relative overflow-hidden transition-colors duration-300"
        style={{ backgroundColor: headerBg, color: REPORT_COLORS.white }}
      >
        <span className="text-xs font-mono opacity-70">
          {toRoman(sectionIndex + 1)}.
        </span>
        <span className="text-sm font-semibold truncate">
          {section.title}
        </span>

        {/* Shimmer overlay — only when pending */}
        {isPending && (
          <div
            className="absolute inset-0 pointer-events-none motion-safe:animate-shimmer"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
            }}
          />
        )}
      </div>

      {/* "UPDATED" badge — pending changes indicator */}
      {isPending && (
        <div className="absolute top-[2px] left-[2px] z-10 transition-all duration-200">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-br-md rounded-tl-md"
            style={{
              backgroundColor: CHANGE_COLORS.flaggedDark,
              color: REPORT_COLORS.white,
            }}
          >
            {pendingLabel || 'Updated'}
          </span>
        </div>
      )}

      {/* Preview content */}
      <div className="px-3 py-2 flex-1 relative overflow-hidden">
        <p
          className="text-xs leading-relaxed line-clamp-4"
          style={{ color: REPORT_COLORS.text }}
        >
          {preview || 'No content yet\u2026'}
        </p>

        {/* Fade gradient at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
          style={{
            background: `linear-gradient(transparent, ${REPORT_COLORS.white})`,
          }}
        />
      </div>

      {/* Subsection badge */}
      {subsectionCount > 0 && (
        <div className="absolute bottom-2 right-2">
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: isPending ? '#FEF3C7' : REPORT_COLORS.headerBg,
              color: isPending ? CHANGE_COLORS.flaggedDark : REPORT_COLORS.navy,
            }}
          >
            {subsectionCount} sub{subsectionCount === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {/* Drag handle indicator */}
      <div
        className="absolute top-2 right-2 opacity-40 hover:opacity-70 transition-opacity"
        title="Drag to reorder"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill={REPORT_COLORS.white}>
          <circle cx="3" cy="3" r="1.2" />
          <circle cx="9" cy="3" r="1.2" />
          <circle cx="3" cy="9" r="1.2" />
          <circle cx="9" cy="9" r="1.2" />
        </svg>
      </div>
    </div>
  );
}
