'use client';

import { useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import ReportHeaderCard from './report-header-card';
import ReportSectionCard from './report-section-card';
import SectionEditModal from './section-edit-modal';
import { REPORT_COLORS } from '@/lib/styles/report-card-colors';
import { CHANGE_COLORS } from '@/lib/styles/report-card-colors';
import type {
  ExportReportData,
  ExportSection,
  ChangeProposal,
  ChangeState,
} from '@/lib/types/report-export';

// ─── Public API via ref ──────────────────────────────────────

export interface WYSIWYGPreviewHandle {
  /** Propose changes to one or more sections — triggers flagging */
  proposeChanges: (proposals: ChangeProposal[]) => void;
  /** Show/hide the processing overlay */
  setProcessing: (processing: boolean, message?: string) => void;
}

interface WYSIWYGReportPreviewProps {
  initialData: ExportReportData;
}

const WYSIWYGReportPreview = forwardRef<WYSIWYGPreviewHandle, WYSIWYGReportPreviewProps>(
  function WYSIWYGReportPreview({ initialData }, ref) {
    const [reportData, setReportData] = useState<ExportReportData>(initialData);
    const [activeSectionIdx, setActiveSectionIdx] = useState<number | null>(null);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
    const dragCounter = useRef(0);

    // ─── Change tracking state ──────────────────────────────

    const [changeMap, setChangeMap] = useState<Record<string, ChangeState>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('Analyzing…');

    const pendingEntries = Object.entries(changeMap).filter(
      ([, cs]) => cs.status === 'pending'
    );
    const pendingCount = pendingEntries.length;

    // ─── Expose proposeChanges via imperative handle ────────

    const proposeChanges = useCallback((proposals: ChangeProposal[]) => {
      setChangeMap((prev) => {
        const next = { ...prev };
        for (const p of proposals) {
          next[p.sectionId] = {
            status: 'pending',
            proposal: p,
          };
        }
        return next;
      });
    }, []);

    const handleSetProcessing = useCallback((processing: boolean, message?: string) => {
      setIsProcessing(processing);
      if (message) setProcessingMessage(message);
    }, []);

    useImperativeHandle(ref, () => ({
      proposeChanges,
      setProcessing: handleSetProcessing,
    }), [proposeChanges, handleSetProcessing]);

    // ─── Accept / Reject handlers ───────────────────────────

    const handleAcceptChange = useCallback(
      (sectionId: string) => {
        const cs = changeMap[sectionId];
        if (!cs || cs.status !== 'pending') return;

        const proposal = cs.proposal;

        // Apply proposed changes to reportData
        setReportData((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => {
            if (s.id !== sectionId) return s;
            return {
              ...s,
              title: proposal.proposedTitle ?? s.title,
              content: proposal.proposedContent ?? s.content,
              subsections: proposal.proposedSubsections ?? s.subsections,
            };
          }),
        }));

        // Mark as accepted (triggers green flash on card)
        setChangeMap((prev) => ({
          ...prev,
          [sectionId]: { ...prev[sectionId], status: 'accepted', reviewedAt: Date.now() },
        }));

        // Clear after animation
        setTimeout(() => {
          setChangeMap((prev) => {
            const next = { ...prev };
            delete next[sectionId];
            return next;
          });
        }, 800);
      },
      [changeMap]
    );

    const handleRejectChange = useCallback(
      (sectionId: string) => {
        // Mark as rejected (triggers red flash on card)
        setChangeMap((prev) => ({
          ...prev,
          [sectionId]: { ...prev[sectionId], status: 'rejected', reviewedAt: Date.now() },
        }));

        // Clear after animation
        setTimeout(() => {
          setChangeMap((prev) => {
            const next = { ...prev };
            delete next[sectionId];
            return next;
          });
        }, 800);
      },
      []
    );

    const handleAcceptAll = useCallback(() => {
      const pending = Object.entries(changeMap).filter(([, cs]) => cs.status === 'pending');
      pending.forEach(([sectionId], i) => {
        setTimeout(() => handleAcceptChange(sectionId), i * 120);
      });
    }, [changeMap, handleAcceptChange]);

    const handleRejectAll = useCallback(() => {
      const pending = Object.entries(changeMap).filter(([, cs]) => cs.status === 'pending');
      pending.forEach(([sectionId], i) => {
        setTimeout(() => handleRejectChange(sectionId), i * 120);
      });
    }, [changeMap, handleRejectChange]);

    // ─── Drag and drop handlers (native HTML5) ──────────────

    const handleDragStart = useCallback(
      (e: React.DragEvent, idx: number) => {
        setDragIdx(idx);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(idx));
      },
      []
    );

    const handleDragOver = useCallback(
      (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIdx(idx);
      },
      []
    );

    const handleDragEnd = useCallback(() => {
      setDragIdx(null);
      setDragOverIdx(null);
      dragCounter.current = 0;
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent, dropIdx: number) => {
        e.preventDefault();
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (isNaN(fromIdx) || fromIdx === dropIdx) {
          handleDragEnd();
          return;
        }

        setReportData((prev) => {
          const sections = [...prev.sections];
          const [moved] = sections.splice(fromIdx, 1);
          sections.splice(dropIdx, 0, moved);
          const reordered = sections.map((s, i) => ({ ...s, order: i }));
          return { ...prev, sections: reordered };
        });

        handleDragEnd();
      },
      [handleDragEnd]
    );

    // ─── Section editing via modal ──────────────────────────

    const handleSaveSection = useCallback(
      (updated: ExportSection) => {
        setReportData((prev) => ({
          ...prev,
          sections: prev.sections.map((s) =>
            s.id === updated.id ? updated : s
          ),
        }));
      },
      []
    );

    const orderedSections = [...reportData.sections].sort(
      (a, b) => a.order - b.order
    );

    const activeSection =
      activeSectionIdx !== null ? orderedSections[activeSectionIdx] : null;

    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 relative">
        {/* Processing overlay — visible during AI analysis */}
        {isProcessing && (
          <div className="sticky top-16 z-30 -mx-4 px-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-white/95 backdrop-blur-sm shadow-md"
              style={{ borderColor: REPORT_COLORS.accent }}
            >
              {/* Spinner */}
              <svg
                className="animate-spin shrink-0"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={REPORT_COLORS.accent}
                strokeWidth="2.5"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span className="text-sm font-medium" style={{ color: REPORT_COLORS.navy }}>
                {processingMessage}
              </span>
              {/* Progress shimmer bar */}
              <div className="flex-1 h-1 rounded-full overflow-hidden bg-gray-100">
                <div
                  className="h-full rounded-full animate-shimmer"
                  style={{
                    width: '40%',
                    background: `linear-gradient(90deg, ${REPORT_COLORS.accent}, ${CHANGE_COLORS.flagged}, ${REPORT_COLORS.accent})`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Header card */}
        <ReportHeaderCard
          title={reportData.title}
          subtitle={reportData.subtitle}
          organizationName={reportData.organizationName}
          confidentialityNotice={reportData.confidentialityNotice}
          evaluatorName={reportData.evaluatorName}
          evaluationDate={reportData.evaluationDate}
          reportDate={reportData.reportDate}
          dreamerName={reportData.student.name}
        />

        {/* Batch actions bar — slides in when there are pending changes */}
        <div
          className="overflow-hidden transition-all duration-300"
          style={{
            maxHeight: pendingCount > 0 ? 64 : 0,
            opacity: pendingCount > 0 ? 1 : 0,
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 rounded-lg border"
            style={{
              backgroundColor: '#FFFBEB',
              borderColor: '#FDE68A',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: CHANGE_COLORS.flagged }}
              />
              <span className="text-sm font-medium text-amber-900">
                {pendingCount} section{pendingCount !== 1 ? 's' : ''} updated
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRejectAll}
                className="text-xs font-medium px-3 py-1.5 rounded-md border transition-colors hover:bg-gray-50"
                style={{ borderColor: REPORT_COLORS.border, color: REPORT_COLORS.muted }}
              >
                Dismiss All
              </button>
              <button
                onClick={handleAcceptAll}
                className="text-xs font-medium px-3 py-1.5 rounded-md text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: CHANGE_COLORS.accepted }}
              >
                Accept All
              </button>
            </div>
          </div>
        </div>

        {/* Section card grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: REPORT_COLORS.muted }}
            >
              Report Sections
            </h2>
            <p className="text-xs" style={{ color: REPORT_COLORS.muted }}>
              Drag to reorder &middot; Click to edit
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {orderedSections.map((section, idx) => (
              <ReportSectionCard
                key={section.id}
                section={section}
                sectionIndex={idx}
                onClick={() => setActiveSectionIdx(idx)}
                isDragging={dragIdx === idx}
                changeStatus={changeMap[section.id]?.status}
                pendingLabel={changeMap[section.id]?.proposal?.reason}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, idx)}
              />
            ))}
          </div>

          {/* Drop indicator styling */}
          {dragOverIdx !== null && dragIdx !== null && dragOverIdx !== dragIdx && (
            <style>{`
              .grid > div:nth-child(${dragOverIdx + 1}) {
                outline: 2px dashed ${REPORT_COLORS.accent};
                outline-offset: 2px;
              }
            `}</style>
          )}
        </div>

        {/* Edit / Review modal */}
        <SectionEditModal
          open={activeSectionIdx !== null}
          onOpenChange={(open) => {
            if (!open) setActiveSectionIdx(null);
          }}
          section={activeSection}
          sectionIndex={activeSectionIdx ?? 0}
          onSave={handleSaveSection}
          changeState={activeSection ? changeMap[activeSection.id] : undefined}
          onAcceptChange={() => {
            if (activeSection) handleAcceptChange(activeSection.id);
          }}
          onRejectChange={() => {
            if (activeSection) handleRejectChange(activeSection.id);
          }}
        />
      </div>
    );
  }
);

export default WYSIWYGReportPreview;
