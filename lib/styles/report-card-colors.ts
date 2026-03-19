// Shared color palette for report cards, PDF renderer, and DOCX renderer.
// Single source of truth so all output channels stay in sync.

export const REPORT_COLORS = {
  navy: '#1B365D',
  accent: '#2E75B6',
  headerBg: '#D6E4F0',
  light: '#F2F6FA',
  border: '#B8C9DB',
  text: '#222222',
  muted: '#555555',
  white: '#FFFFFF',
} as const;

// Colors for the change-flagging / review system.
export const CHANGE_COLORS = {
  flagged: '#F59E0B',       // Amber for pending changes
  flaggedDark: '#D97706',   // Darker amber for hover
  accepted: '#10B981',      // Green flash on accept
  rejected: '#EF4444',      // Red flash on reject
} as const;

// Same values without the '#' prefix — needed by docx.js which expects raw hex.
export const REPORT_COLORS_RAW = {
  navy: '1B365D',
  accent: '2E75B6',
  headerBg: 'D6E4F0',
  light: 'F2F6FA',
  border: 'B8C9DB',
  text: '222222',
  muted: '555555',
  white: 'FFFFFF',
} as const;
