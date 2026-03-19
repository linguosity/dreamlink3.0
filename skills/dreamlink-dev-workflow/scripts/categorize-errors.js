#!/usr/bin/env node

/**
 * Error Categorization Script for Dreamlink
 * Parses build output and categorizes errors as auto-fixable vs manual-review
 *
 * Usage:
 *   npm run typecheck 2>&1 | node scripts/categorize-errors.js
 *   node scripts/categorize-errors.js < build-errors.log
 *
 * Output: JSON array of categorized errors
 */

const fs = require('fs');
const readline = require('readline');

// Error pattern definitions
const AUTO_FIX_PATTERNS = {
  // TypeScript errors
  'TS2305': {
    name: 'unused-import',
    pattern: /is not exported from module/i,
    confidence: 0.95,
    fixTemplate: 'Remove or correct import statement'
  },
  'TS6133': {
    name: 'unused-variable',
    pattern: /is declared but never used/i,
    confidence: 0.90,
    fixTemplate: 'Remove variable declaration or prefix with underscore'
  },
  // ESLint rules
  'prettier/prettier': {
    name: 'formatting',
    pattern: /prettier/i,
    confidence: 0.99,
    fixTemplate: 'Run eslint --fix for formatting'
  },
  'indent': {
    name: 'lint-format',
    pattern: /Expected.*spaces/i,
    confidence: 0.99,
    fixTemplate: 'Run eslint --fix'
  },
  'max-len': {
    name: 'line-length',
    pattern: /Line.*exceeds/i,
    confidence: 0.95,
    fixTemplate: 'Run eslint --fix or split long line'
  },
  'no-var': {
    name: 'lint-no-var',
    pattern: /use 'const' instead of 'var'/i,
    confidence: 0.99,
    fixTemplate: 'Run eslint --fix'
  },
  'react/no-unescaped-entities': {
    name: 'unescaped-entity',
    pattern: /Unescaped entity/i,
    confidence: 0.95,
    fixTemplate: 'Escape entity or use component'
  },
  'semi': {
    name: 'semicolon',
    pattern: /Missing semicolon/i,
    confidence: 0.99,
    fixTemplate: 'Run eslint --fix'
  }
};

const MANUAL_REVIEW_PATTERNS = {
  // TypeScript errors
  'TS2345': {
    name: 'argument-type-mismatch',
    pattern: /Argument of type/i,
    confidence: 0.85,
    dreamlinkContext: 'Check method signature, common issue: .eq("id", userId) vs .eq("user_id", userId)'
  },
  'TS2339': {
    name: 'missing-property',
    pattern: /has no property/i,
    confidence: 0.90,
    dreamlinkContext: 'Check schema - property may not exist in DB. Common: profile.subscription_tier (use subscriptions table instead)'
  },
  'TS7006': {
    name: 'implicit-any',
    pattern: /implicitly has type 'any'/i,
    confidence: 0.95,
    dreamlinkContext: 'Add explicit type annotation'
  },
  'TS2322': {
    name: 'type-incompatible',
    pattern: /Type.*is not assignable to type/i,
    confidence: 0.85,
    dreamlinkContext: 'Check type definitions and intended values'
  },
  'TS2488': {
    name: 'type-has-no-properties',
    pattern: /Type.*has no properties/i,
    confidence: 0.80,
    dreamlinkContext: 'Missing await on async function like createServerClient()?'
  },
  // ESLint rules
  'no-console': {
    name: 'console-log',
    pattern: /console\.(log|warn|error|info)/i,
    confidence: 0.95,
    dreamlinkContext: 'Forbidden in production code (see CLAUDE.md). Use proper logging framework or remove for tests'
  },
  'no-floating-promises': {
    name: 'unhandled-promise',
    pattern: /Floating promise/i,
    confidence: 0.90,
    dreamlinkContext: 'Promise not awaited. Add await or .catch() handler'
  },
  '@typescript-eslint/no-floating-promises': {
    name: 'unhandled-promise',
    pattern: /Floating promise/i,
    confidence: 0.90,
    dreamlinkContext: 'Promise not awaited. Add await or .catch() handler'
  },
  'import/no-unresolved': {
    name: 'missing-import',
    pattern: /Cannot find module|Unable to resolve/i,
    confidence: 0.85,
    dreamlinkContext: 'Check import path or run npm install for missing package'
  },
  'react/no-children-prop': {
    name: 'react-children',
    pattern: /children should not be passed as prop/i,
    confidence: 0.90,
    dreamlinkContext: 'Refactor component API'
  }
};

const WARNING_PATTERNS = {
  'TS6196': {
    name: 'declared-not-read',
    pattern: /is declared but its value is never read/i,
    confidence: 0.85,
    dreamlinkContext: 'Variable may be unused or assigned for side effects'
  }
};

/**
 * Parse error line from build output
 * Supports formats:
 *   FILE(line,column): error TSxxxx: MESSAGE
 *   FILE:line:column: error RULE_NAME: MESSAGE
 *   FILE:line:column: warning RULE_NAME: MESSAGE
 */
function parseErrorLine(line) {
  if (!line.trim()) return null;

  // TypeScript format: FILE(line,column): error TSxxxx: MESSAGE
  const tsMatch = line.match(/^([^(]+)\((\d+),(\d+)\):\s*(error|warning)\s*(TS\d+):\s*(.+)$/);
  if (tsMatch) {
    return {
      file: tsMatch[1].trim(),
      line: parseInt(tsMatch[2], 10),
      column: parseInt(tsMatch[3], 10),
      severity: tsMatch[4],
      code: tsMatch[5],
      message: tsMatch[6],
      source: 'typecheck'
    };
  }

  // ESLint/Build format: FILE:line:column: error RULE: MESSAGE
  const eslintMatch = line.match(/^([^:]+):(\d+):(\d+):\s*(error|warning)\s+([^\s]+)\s+(.+)$/);
  if (eslintMatch) {
    return {
      file: eslintMatch[1].trim(),
      line: parseInt(eslintMatch[2], 10),
      column: parseInt(eslintMatch[3], 10),
      severity: eslintMatch[4],
      code: eslintMatch[5],
      message: eslintMatch[6],
      source: line.includes('node_modules') ? 'dependency' : 'lint'
    };
  }

  // Alternative format with fewer colons
  const altMatch = line.match(/^([^:]+):(\d+):(\d+):\s*(.+)$/);
  if (altMatch) {
    const parts = altMatch[4].split(/\s+(error|warning)\s+/);
    if (parts.length >= 2) {
      return {
        file: altMatch[1].trim(),
        line: parseInt(altMatch[2], 10),
        column: parseInt(altMatch[3], 10),
        severity: parts[1],
        code: 'UNKNOWN',
        message: parts[2] || altMatch[4],
        source: 'build'
      };
    }
  }

  return null;
}

/**
 * Categorize a single error based on code and message
 */
function categorizeError(error) {
  // Skip dependency errors
  if (error.source === 'dependency') {
    return {
      ...error,
      category: 'external',
      skipReason: 'Dependency error (update package)'
    };
  }

  // Check auto-fix patterns
  if (AUTO_FIX_PATTERNS[error.code]) {
    const pattern = AUTO_FIX_PATTERNS[error.code];
    if (pattern.pattern.test(error.message)) {
      return {
        ...error,
        category: 'auto-fix',
        fixType: pattern.name,
        confidence: pattern.confidence,
        suggestedFix: pattern.fixTemplate
      };
    }
  }

  // Check if error message matches any auto-fix pattern
  for (const [code, pattern] of Object.entries(AUTO_FIX_PATTERNS)) {
    if (error.code !== code && pattern.pattern.test(error.message)) {
      return {
        ...error,
        category: 'auto-fix',
        fixType: pattern.name,
        confidence: pattern.confidence,
        suggestedFix: pattern.fixTemplate
      };
    }
  }

  // Check manual-review patterns
  if (MANUAL_REVIEW_PATTERNS[error.code]) {
    const pattern = MANUAL_REVIEW_PATTERNS[error.code];
    if (pattern.pattern.test(error.message)) {
      return {
        ...error,
        category: 'manual-review',
        fixType: pattern.name,
        confidence: pattern.confidence,
        dreamlinkContext: pattern.dreamlinkContext
      };
    }
  }

  // Check if error message matches any manual-review pattern
  for (const [code, pattern] of Object.entries(MANUAL_REVIEW_PATTERNS)) {
    if (error.code !== code && pattern.pattern.test(error.message)) {
      return {
        ...error,
        category: 'manual-review',
        fixType: pattern.name,
        confidence: pattern.confidence,
        dreamlinkContext: pattern.dreamlinkContext
      };
    }
  }

  // Check warning patterns
  if (WARNING_PATTERNS[error.code]) {
    const pattern = WARNING_PATTERNS[error.code];
    if (pattern.pattern.test(error.message)) {
      return {
        ...error,
        category: 'warning',
        fixType: pattern.name,
        confidence: pattern.confidence,
        dreamlinkContext: pattern.dreamlinkContext
      };
    }
  }

  // Default categorization based on severity
  if (error.severity === 'warning') {
    return {
      ...error,
      category: 'warning',
      fixType: 'unknown-warning'
    };
  }

  return {
    ...error,
    category: 'manual-review',
    fixType: 'unknown-error',
    confidence: 0.5
  };
}

/**
 * Main function: read stdin and output categorized errors
 */
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  const errors = [];
  const lines = [];

  // Collect all input lines
  for await (const line of rl) {
    lines.push(line);
  }

  // Parse and categorize errors
  for (const line of lines) {
    const error = parseErrorLine(line);
    if (error) {
      const categorized = categorizeError(error);
      errors.push(categorized);
    }
  }

  // Group by category
  const summary = {
    total: errors.length,
    autoFix: errors.filter(e => e.category === 'auto-fix').length,
    manualReview: errors.filter(e => e.category === 'manual-review').length,
    warnings: errors.filter(e => e.category === 'warning').length,
    external: errors.filter(e => e.category === 'external').length
  };

  // Output results
  console.log(JSON.stringify({
    summary,
    errors: errors.sort((a, b) => {
      // Sort by severity: errors before warnings, then by file
      const severityOrder = { error: 0, warning: 1 };
      const aScore = severityOrder[a.severity] || 2;
      const bScore = severityOrder[b.severity] || 2;
      if (aScore !== bScore) return aScore - bScore;
      return a.file.localeCompare(b.file);
    })
  }, null, 2));
}

main().catch(err => {
  console.error('Error categorizing errors:', err);
  process.exit(1);
});
