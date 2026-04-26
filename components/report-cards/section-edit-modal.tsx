'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { REPORT_COLORS } from '@/lib/styles/report-card-colors';
import { CHANGE_COLORS } from '@/lib/styles/report-card-colors';
import { toRoman } from '@/lib/types/report-export';
import type { ExportSection, ChangeState } from '@/lib/types/report-export';

interface SectionEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: ExportSection | null;
  sectionIndex: number;
  onSave: (updated: ExportSection) => void;
  // Change review props
  changeState?: ChangeState;
  onAcceptChange?: () => void;
  onRejectChange?: () => void;
}

export default function SectionEditModal({
  open,
  onOpenChange,
  section,
  sectionIndex,
  onSave,
  changeState,
  onAcceptChange,
  onRejectChange,
}: SectionEditModalProps) {
  const [isLocked, setIsLocked] = useState(true);
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [editedSubsections, setEditedSubsections] = useState<
    { heading: string; content: string }[]
  >([]);

  const isReviewMode = changeState?.status === 'pending';
  const proposal = changeState?.proposal;

  // Sync local state when modal opens with a new section
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen && section) {
        setEditedContent(section.content);
        setEditedTitle(section.title);
        setEditedSubsections(
          section.subsections.map((s) => ({ ...s }))
        );
        setIsLocked(true);
      }
      if (!nextOpen && section) {
        // Auto-save on close if unlocked and NOT in review mode
        if (!isLocked && !isReviewMode) {
          onSave({
            ...section,
            title: editedTitle,
            content: editedContent,
            subsections: editedSubsections,
          });
        }
        setIsLocked(true);
      }
      onOpenChange(nextOpen);
    },
    [section, isLocked, isReviewMode, editedTitle, editedContent, editedSubsections, onSave, onOpenChange]
  );

  if (!section) return null;

  const toggleLock = () => {
    if (isReviewMode) return; // Disable lock toggle during review
    if (!isLocked) {
      // Locking = save changes
      onSave({
        ...section,
        title: editedTitle,
        content: editedContent,
        subsections: editedSubsections,
      });
    }
    setIsLocked((prev) => !prev);
  };

  const updateSubsectionHeading = (idx: number, heading: string) => {
    setEditedSubsections((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, heading } : s))
    );
  };

  const updateSubsectionContent = (idx: number, content: string) => {
    setEditedSubsections((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, content } : s))
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-3xl !w-[90vw] max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header with roman numeral bar */}
        <DialogHeader className="shrink-0">
          <div
            className="flex items-center justify-between rounded-t-md px-4 py-2 -mx-6 -mt-6 mb-3 transition-colors duration-300"
            style={{
              backgroundColor: isReviewMode ? CHANGE_COLORS.flagged : REPORT_COLORS.navy,
            }}
          >
            <div className="flex items-center gap-2 text-white">
              <span className="text-sm font-mono opacity-70">
                {toRoman(sectionIndex + 1)}.
              </span>
              {isLocked || isReviewMode ? (
                <DialogTitle className="text-white text-base font-semibold">
                  {editedTitle}
                </DialogTitle>
              ) : (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="bg-transparent border-b border-white/40 text-white text-base font-semibold outline-none px-1 py-0.5 w-full"
                />
              )}
            </div>

            {/* Lock / Unlock toggle — disabled during review */}
            <button
              onClick={toggleLock}
              disabled={isReviewMode}
              className={`
                flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors
                ${isReviewMode ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              style={{
                backgroundColor: isReviewMode
                  ? 'rgba(255,255,255,0.1)'
                  : isLocked
                    ? 'rgba(255,255,255,0.15)'
                    : REPORT_COLORS.accent,
                color: REPORT_COLORS.white,
              }}
            >
              {isLocked ? (
                <>
                  <LockIcon /> {isReviewMode ? 'Review' : 'Locked'}
                </>
              ) : (
                <>
                  <UnlockIcon /> Editing
                </>
              )}
            </button>
          </div>
          <DialogDescription className="sr-only">
            {isReviewMode ? 'Review proposed changes to this section' : 'Edit section content'}
          </DialogDescription>
        </DialogHeader>

        {/* Review banner — only when pending changes */}
        {isReviewMode && proposal && (
          <div
            className="shrink-0 -mx-6 px-4 py-3 flex items-center justify-between gap-3 border-b"
            style={{
              backgroundColor: '#FFFBEB', // amber-50
              borderColor: '#FDE68A',      // amber-200
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircleIcon />
              <div className="text-sm min-w-0">
                <span className="font-semibold text-amber-900">
                  Proposed changes
                </span>
                {proposal.reason && (
                  <span className="text-amber-700 ml-1">
                    &mdash; {proposal.reason}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onRejectChange}
                className="text-xs font-medium px-3 py-1.5 rounded-md border transition-colors hover:bg-red-50"
                style={{
                  borderColor: CHANGE_COLORS.rejected,
                  color: CHANGE_COLORS.rejected,
                }}
              >
                Reject
              </button>
              <button
                onClick={onAcceptChange}
                className="text-xs font-medium px-3 py-1.5 rounded-md text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: CHANGE_COLORS.accepted }}
              >
                Accept
              </button>
            </div>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* ─── Review mode: stacked diff view ─── */}
          {isReviewMode && proposal ? (
            <div className="space-y-4">
              {/* Title diff */}
              {proposal.proposedTitle && proposal.proposedTitle !== section.title && (
                <DiffBlock
                  label="Title"
                  current={section.title}
                  proposed={proposal.proposedTitle}
                />
              )}

              {/* Content diff */}
              {proposal.proposedContent !== undefined && (
                <DiffBlock
                  label="Content"
                  current={section.content}
                  proposed={proposal.proposedContent}
                />
              )}

              {/* Subsection diffs */}
              {proposal.proposedSubsections && proposal.proposedSubsections.length > 0 && (
                <div className="space-y-3">
                  <label
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: REPORT_COLORS.muted }}
                  >
                    Subsection Changes
                  </label>
                  {proposal.proposedSubsections.map((proposed, idx) => {
                    const original = section.subsections[idx];
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <div key={idx} className="space-y-2">
                        <span
                          className="text-xs font-bold"
                          style={{ color: REPORT_COLORS.navy }}
                        >
                          {letter}.
                        </span>
                        {original ? (
                          <>
                            {proposed.heading !== original.heading && (
                              <DiffBlock
                                label={`${letter}. Heading`}
                                current={original.heading}
                                proposed={proposed.heading}
                              />
                            )}
                            {proposed.content !== original.content && (
                              <DiffBlock
                                label={`${letter}. Content`}
                                current={original.content}
                                proposed={proposed.content}
                              />
                            )}
                          </>
                        ) : (
                          <DiffBlock
                            label={`${letter}. (New)`}
                            current=""
                            proposed={`${proposed.heading}: ${proposed.content}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ─── Normal edit/view mode ─── */}

              {/* Main content */}
              {(editedContent || !isLocked) && (
                <div>
                  <label
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: REPORT_COLORS.muted }}
                  >
                    Content
                  </label>
                  {isLocked ? (
                    <div
                      className="mt-1 text-sm leading-relaxed rounded-md p-3"
                      style={{
                        backgroundColor: REPORT_COLORS.light,
                        color: REPORT_COLORS.text,
                        minHeight: 60,
                      }}
                    >
                      {editedContent || (
                        <span className="italic opacity-50">No content</span>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="mt-1 w-full text-sm leading-relaxed rounded-md p-3 border resize-y outline-none focus:ring-2"
                      style={{
                        borderColor: REPORT_COLORS.border,
                        minHeight: 100,
                      }}
                      placeholder="Enter section content\u2026"
                    />
                  )}
                </div>
              )}

              {/* Subsections */}
              {editedSubsections.length > 0 && (
                <div className="space-y-3">
                  <label
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: REPORT_COLORS.muted }}
                  >
                    Subsections
                  </label>
                  {editedSubsections.map((sub, idx) => (
                    <SubsectionBlock
                      key={idx}
                      index={idx}
                      heading={sub.heading}
                      content={sub.content}
                      isLocked={isLocked}
                      onHeadingChange={(val) => updateSubsectionHeading(idx, val)}
                      onContentChange={(val) => updateSubsectionContent(idx, val)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Diff block: shows current vs proposed content ────────────

function DiffBlock({
  label,
  current,
  proposed,
}: {
  label: string;
  current: string;
  proposed: string;
}) {
  return (
    <div className="rounded-md border overflow-hidden" style={{ borderColor: REPORT_COLORS.border }}>
      <div
        className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
        style={{ backgroundColor: REPORT_COLORS.light, color: REPORT_COLORS.muted }}
      >
        {label}
      </div>
      {/* Current */}
      <div className="px-3 py-2 border-b" style={{ borderColor: REPORT_COLORS.border }}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
          <span className="text-[10px] font-medium uppercase text-gray-500">Current</span>
        </div>
        <p className="text-sm leading-relaxed text-gray-600">
          {current || <span className="italic opacity-50">Empty</span>}
        </p>
      </div>
      {/* Proposed */}
      <div
        className="px-3 py-2"
        style={{ borderLeft: `3px solid ${CHANGE_COLORS.flagged}` }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: CHANGE_COLORS.flagged }}
          />
          <span
            className="text-[10px] font-medium uppercase"
            style={{ color: CHANGE_COLORS.flaggedDark }}
          >
            Proposed
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: REPORT_COLORS.text }}>
          {proposed || <span className="italic opacity-50">Empty</span>}
        </p>
      </div>
    </div>
  );
}

// ─── Subsection block (normal edit mode) ──────────────────────

function SubsectionBlock({
  index,
  heading,
  content,
  isLocked,
  onHeadingChange,
  onContentChange,
}: {
  index: number;
  heading: string;
  content: string;
  isLocked: boolean;
  onHeadingChange: (val: string) => void;
  onContentChange: (val: string) => void;
}) {
  const letter = String.fromCharCode(65 + index);

  return (
    <div
      className="rounded-md border overflow-hidden"
      style={{ borderColor: REPORT_COLORS.border }}
    >
      <div
        className="px-3 py-1.5 flex items-center gap-2"
        style={{ backgroundColor: REPORT_COLORS.headerBg }}
      >
        <span className="text-xs font-bold" style={{ color: REPORT_COLORS.navy }}>
          {letter}.
        </span>
        {isLocked ? (
          <span
            className="text-sm font-semibold italic"
            style={{ color: REPORT_COLORS.navy }}
          >
            {heading}
          </span>
        ) : (
          <input
            type="text"
            value={heading}
            onChange={(e) => onHeadingChange(e.target.value)}
            className="text-sm font-semibold italic bg-transparent border-b border-transparent focus:border-primary outline-none flex-1 px-1"
            style={{ color: REPORT_COLORS.navy }}
          />
        )}
      </div>

      <div className="px-3 py-2">
        {isLocked ? (
          <p className="text-sm leading-relaxed" style={{ color: REPORT_COLORS.text }}>
            {content || <span className="italic opacity-50">No content</span>}
          </p>
        ) : (
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full text-sm leading-relaxed border rounded-md p-2 resize-y outline-none focus:ring-2"
            style={{ borderColor: REPORT_COLORS.border, minHeight: 60 }}
            placeholder="Enter subsection content\u2026"
          />
        )}
      </div>
    </div>
  );
}

// ─── Inline SVG icons ─────────────────────────────────────────

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
