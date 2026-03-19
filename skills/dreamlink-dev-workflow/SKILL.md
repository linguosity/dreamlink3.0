---
name: dreamlink-dev-workflow
description: Automates Dreamlink's development workflow with intelligent error fixing, schema validation, pre-commit checks, and deployment verification. Triggers on typecheck errors, lint errors, build failures, schema validation, code quality, pre-commit checks, and CI/CD workflows.
---

# Dreamlink Development Workflow Skill

## Purpose

This skill automates Dreamlink's complete development workflow with intelligent error categorization, automated fixing, schema validation, pre-commit enforcement, and deployment verification. It replaces and extends the manual `fix-errors.sh` workflow with:

- **Intelligent Error Fixing**: Automatically categorizes TypeScript, ESLint, and build errors into auto-fixable vs. manual-review categories
- **Schema Validation**: Validates that all Zod schemas match their corresponding Supabase migrations, catching schema drift before deployment
- **Pre-Commit Enforcement**: Enforces TypeScript checks, auto-fixes linting, detects debug endpoints, validates version updates, and flags code hygiene violations
- **Deployment Verification**: Checks Vercel deployment status post-push and verifies critical routes responding
- **Dreamlink-Specific Rules**: Enforces patterns from CLAUDE.md including client tier usage, reasoning model constraints, and code hygiene standards

This skill is essential for maintaining code quality, preventing schema misalignment issues, and catching production issues before deployment.

---

## Architecture & Sequential Workflow

### Phase 1: Error Detection & Categorization

```
Run typecheck, lint, and build sequentially
Capture all errors to build-errors.log
Parse and categorize each error
```

#### Stage 1a: TypeScript Type Checking
```
Command: npm run typecheck

Captures all TypeScript errors including:
- TS2305: Unused imports (auto-fixable)
- TS6133: Declared but not used (auto-fixable)
- TS2345: Argument type mismatch (manual-review)
- TS2339: Missing property on type (manual-review)
- TS7006: Implicit any (manual-review)
- TS2322: Type incompatible assignment (manual-review)
- TS2488: Type has no properties (logic error)

Error format captured:
FILE_PATH(line,column): error TSxxxx: ERROR_MESSAGE

Output: stdout + stderr to build-errors.log
```

#### Stage 1b: ESLint Linting
```
Command: npm run lint

Captures ESLint errors including:
- no-unused-vars: Unused variables (auto-fixable)
- no-console: Direct console.log (manual-review, Dreamlink-specific)
- no-explicit-any: Implicit any usage (manual-review)
- @typescript-eslint/no-floating-promises: Unhandled promises (manual-review)
- react/no-unescaped-entities: JSX content issues (auto-fixable)
- import/no-unresolved: Missing imports (manual-review)

Error format captured:
FILE_PATH:line:column: level RULE_NAME: MESSAGE

Output: stdout + stderr appended to build-errors.log
```

#### Stage 1c: Next.js Build
```
Command: npm run build

Captures build errors including:
- Syntax errors in TypeScript/JSX
- Circular dependency warnings
- Large bundle size warnings
- Image optimization errors
- Font loading errors
- Module resolution errors

Note: next.config.mjs has ignoreBuildErrors=true, so build may "succeed"
even with TypeScript errors. This skill runs typecheck separately.

Output: stdout + stderr appended to build-errors.log
```

### Phase 2: Error Parsing & Categorization

Parse build-errors.log using `scripts/categorize-errors.js`:

```javascript
const error = {
  file: string,              // Absolute path to file
  line: number,
  column: number,
  code: string,              // TS2305, TS6133, ESLint rule name
  message: string,
  severity: 'error' | 'warning',
  source: 'typecheck' | 'lint' | 'build'
}

const categorized = {
  category: 'auto-fix' | 'manual-review' | 'warning',
  fixType: string,           // 'unused-import', 'unused-variable', 'lint-format', etc.
  confidence: number,        // 0.0-1.0 for auto-fix reliability
  suggestedFix?: string,     // For auto-fixable items
  dreamlinkContext?: string  // Dreamlink-specific pattern context
}
```

#### Auto-Fix Categories
```
✓ TS2305 (unused imports):
  - Fix: Remove import statement
  - Confidence: 0.95
  - Tool: Simple text editing

✓ TS6133 (declared but not used):
  - Fix: Remove variable/function declaration
  - Confidence: 0.90
  - Tool: Text editing (be careful of side effects)

✓ ESLint: prettier/prettier, indent, max-len:
  - Fix: Run `eslint --fix`
  - Confidence: 0.99
  - Tool: ESLint auto-fix engine

✓ ESLint: react/no-unescaped-entities:
  - Fix: Escape or wrap entity
  - Confidence: 0.95
  - Tool: Text replacement regex

✓ TSLint/ESLint formatting issues:
  - Fix: Auto-format
  - Confidence: 0.99
  - Tool: Prettier/ESLint --fix
```

#### Manual-Review Categories
```
✗ TS2345 (argument type mismatch):
  - Issue: Function called with wrong type
  - Context needed: Intended argument type
  - Example: .eq('id', user.id) vs .eq('user_id', user.id) [Dreamlink pattern]

✗ TS2339 (missing property):
  - Issue: Accessing non-existent property
  - Context needed: Type definition, available properties
  - Example: profile.subscription_tier doesn't exist (Dreamlink pattern - use subscriptions table)

✗ TS7006 (implicit any):
  - Issue: Type cannot be inferred
  - Context needed: Intended type
  - Example: Function parameter without type annotation

✗ TS2322 (type incompatible):
  - Issue: Assignment type mismatch
  - Context needed: Type definitions, intended value
  - Example: Assigning string to number

✗ no-console (Dreamlink-specific):
  - Issue: Direct console.log in code (forbidden in production)
  - Context needed: Replace with proper logging
  - Example: Remove console.log(), use structured logging

✗ @typescript-eslint/no-floating-promises:
  - Issue: Promise not awaited or .catch() handled
  - Context needed: Intent of async operation
  - Example: Missing await on createClient(), missing .catch()

✗ ESLint import/no-unresolved:
  - Issue: Import path not found
  - Context needed: Correct path or package installation
  - Example: Missing @supabase/ssr import
```

### Phase 3: Auto-Fix Application

```
For each auto-fixable error:
  1. Apply fix based on category
  2. Write modified file to disk
  3. Log fix applied with file and line numbers
  4. Track success/failure

For ESLint auto-fixable rules:
  - Run: npm run lint -- --fix
  - Re-parse to verify fixes

For unused imports:
  - Parse file's import statements
  - Remove specific import (handle comma-separated imports)
  - Preserve file formatting (indentation, line endings)

For formatting issues:
  - Run Prettier if available
  - Or apply ESLint auto-fix
```

### Phase 4: Verification & Loop

```
After applying auto-fixes:
  1. Re-run typecheck, lint, build
  2. Parse new errors
  3. Categorize remaining errors
  4. If only manual-review items remain: Generate report, stop
  5. If new auto-fix items appeared: Apply them, go to step 1
  6. If error count hasn't decreased: Manual intervention needed
```

### Phase 5: Schema Validation Workflow

Run `scripts/validate-schema-sync.js` to check schema alignment:

```
Step 1: Discover Zod schemas
  - Find all *.ts files in schema/ directory
  - Parse each file to extract Zod schema definitions
  - Extract: Object shape, field names, types, constraints

Step 2: Discover Supabase migrations
  - Find all *.sql files in supabase/migrations/ directory
  - Parse CREATE TABLE and ALTER TABLE statements
  - Extract: Table names, column names, column types, constraints

Step 3: Compare schemas
  For each Zod schema found:
    - Match to corresponding SQL table (by naming convention: zod=snake_case → SQL=snake_case)
    - Compare field names: Which Zod fields missing in SQL? Which SQL columns missing in Zod?
    - Compare types: TypeScript z.string() → SQL text, z.number() → SQL integer, etc.
    - Compare constraints: nullable, optional, defaults

Step 4: Generate alignment report
  - Matching fields (✓)
  - Missing in Zod (⚠ field exists in DB but not validated in code)
  - Missing in SQL (✗ code expects field that doesn't exist in DB)
  - Type mismatches (✗ code expects string but DB has integer)

Known issues to flag:
  - bible_citations table has columns in DB not reflected in schema (e.g., source, supporting_text)
  - payments table exists in DB but has no corresponding Zod schema
  - profile table has columns added in migrations not in schema (e.g., image_aesthetic, preferences)
```

### Phase 6: Pre-Commit Checklist

Run comprehensive pre-commit checks before pushing:

```
Step 1: TypeScript Type Checking
  - Command: npm run typecheck (NO --noEmit bypass!)
  - Must pass with zero errors
  - Requirement: Strict mode enabled in tsconfig.json

Step 2: Linting with Auto-Fix
  - Command: npm run lint -- --fix
  - Auto-fixes applied
  - Any remaining errors must be reviewed manually

Step 3: Build Test
  - Command: npm run build
  - Full production build must succeed
  - Verify .next/ artifacts generated
  - Note: ignoreBuildErrors=true is dangerous; this check ensures real errors caught

Step 4: Debug Endpoint Detection
  - Search for debug/test/seed endpoints in production routes
  - Pattern: /api/debug/*, /api/seed/*, /api/test/*
  - Check: All have proper auth guards (requireAuth middleware)
  - Flag if accessible without authentication

Step 5: Console.log Detection (Dreamlink-specific)
  - Search for direct console.log() in app/ and utils/ (not tests/)
  - Allowed: test files only
  - Flag: Any console.log in production code
  - Fix: Replace with proper structured logging

Step 6: Version Update Verification
  - Check: public/version.json exists and is up-to-date
  - Check: Version matches git commit hash
  - Command: npm run version:update (runs scripts/update-version.js)

Step 7: Duplicate File Detection
  - Search for files with names like: "providers 2.tsx", "use-dream-search 2.ts"
  - Flag: Duplicate/conflicting files that will cause import confusion
  - Action: Consolidate or remove duplicates

Step 8: Supabase Client Tier Usage (Dreamlink-specific)
  - Scan for direct createClient() calls in:
    - Server actions (should use server client from utils/supabase/server.ts)
    - Route handlers (should use server or admin client)
    - Browser components (should use browser client from utils/supabase/client.ts)
  - Flag misuses:
    - Browser client used in server action
    - Server client created without await
    - Missing admin client for RLS bypass

Step 9: Reasoning Model Parameter Check (Dreamlink-specific)
  - Search for OpenAI API calls in code
  - Flag: max_tokens usage (should be max_completion_tokens for reasoning models)
  - Flag: temperature set on gpt-5-nano (reasoning models ignore this)
  - Check: max_completion_tokens is reasonable (1000-4000 typical)

Step 10: Edge Runtime Compatibility (Dreamlink-specific)
  - Identify routes with 'use edge runtime'
  - Verify: Only import modules compatible with Edge Runtime
  - Flag incompatible imports (e.g., fs, node-specific modules)
  - Known issues: OpenAI routes must use Edge Runtime
```

### Phase 7: Deployment Verification

Post-deployment checks via Vercel MCP and direct testing:

```
Step 1: Vercel Deployment Status
  - Query Vercel API for latest deployment
  - Check: status = "READY" (production deployment)
  - Check: No errors in deployment logs
  - Flag: Deployment pending, failed, or in error state

Step 2: Critical Route Verification
  - HTTP GET /
  - HTTP GET /api/health (if exists)
  - HTTP GET /api/dream-entries (with auth)
  - HTTP POST /api/dream-entries (with auth token)
  - Check: Response code 200-299 (success)
  - Flag: 5xx errors, timeouts, unexpected redirects

Step 3: Error Pattern Detection
  - Check Vercel logs for new error patterns
  - Compare to known error patterns from references/error-patterns.json
  - Alert if new high-frequency errors detected
  - Flag: Production errors that weren't in test builds

Step 4: Performance Baseline
  - Measure: API response times for critical routes
  - Compare to baseline from previous deployment
  - Flag: Significant slowdown (>2x baseline)
  - Check: Vercel function timeout not exceeded (60s limit)
```

---

## Code Hygiene Rules Specific to Dreamlink

### Client Tier Usage (Critical)
```typescript
// ✓ CORRECT: Server action uses server client
// app/actions.ts
const { data, error } = await createServerClient()
  .from('dream_entries')
  .select('*')
  .eq('user_id', userId);

// ✓ CORRECT: Browser component uses browser client
// components/DreamForm.tsx
'use client'
const supabase = createBrowserClient();
const { data } = await supabase
  .from('dream_entries')
  .select('*');

// ✓ CORRECT: Admin writes use admin client
// utils/supabase/admin.ts
const adminClient = createClient(url, serviceRoleKey);
await adminClient
  .from('dream_entries')
  .update({ analysis_summary: 'updated' })
  .eq('id', entryId);

// ✗ WRONG: Creating server client in browser component
'use client'
const client = createServerClient(...) // Server client can't be used in browser!

// ✗ WRONG: Browser client in server action
// app/actions.ts
const { data } = createBrowserClient().from('...').select(...) // Wrong context!
```

### OpenAI Model Constraints (Critical)
```typescript
// ✓ CORRECT: Reasoning model with max_completion_tokens
const response = await openai.chat.completions.create({
  model: 'gpt-5-nano-2025-08-07',
  max_completion_tokens: 4000,  // Reasoning models use this, not max_tokens
  temperature: undefined,        // Reasoning models ignore temperature
  response_format: { type: 'json_schema', ... }
});

// ✗ WRONG: Using max_tokens with reasoning model
const response = await openai.chat.completions.create({
  model: 'gpt-5-nano-2025-08-07',
  max_tokens: 2000,  // WRONG! Should be max_completion_tokens
  temperature: 0.7   // WRONG! Reasoning models don't support temperature
});

// ✓ CORRECT: Using max_tokens with fast model (not reasoning)
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  max_tokens: 2000,
  temperature: 0.7
});
```

### Edge Runtime Compatibility (Critical for OpenAI routes)
```typescript
// ✓ CORRECT: OpenAI route with Edge Runtime
// app/api/dream-entries/route.ts
export const runtime = 'edge';

import { OpenAI } from 'openai';  // ✓ Compatible

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✗ WRONG: Using node modules in edge route
export const runtime = 'edge';
import fs from 'fs';  // ✗ Not compatible with Edge Runtime!
import path from 'path';  // ✗ Not compatible!
```

### Debug Endpoints (Critical for production safety)
```typescript
// ✓ CORRECT: Debug endpoint with auth guard
// app/api/debug/schema-sync/route.ts
export async function GET(request: NextRequest) {
  // Check authentication first!
  const user = await getUser();
  if (!user || !isAdmin(user)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Debug logic only accessible to authenticated admins
  return Response.json({ schema: validateSchemas() });
}

// ✗ WRONG: Debug endpoint accessible to anyone
// app/api/debug/seed/route.ts
export async function POST(request: NextRequest) {
  // No auth check! Anyone can call this in production!
  await seedTestData();
  return Response.json({ success: true });
}
```

### Console Logging (Code Quality)
```typescript
// ✓ CORRECT: No direct console.log in production code
// app/actions.ts
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info only in development');
}

// Use structured logging for production
import { logger } from '@/utils/logger';
logger.info('Dream analysis completed', { entryId, analysisTime });

// ✓ CORRECT: Console.log allowed in test files
// tests/dream-analysis.test.ts
test('validates dream input', () => {
  console.log('Running validation test'); // OK in tests
});

// ✗ WRONG: Direct console.log in production code
// app/api/dream-entries/route.ts
console.log('Received dream:', dream_text); // FORBIDDEN!
```

### Supabase RLS Policies and Testing
```typescript
// ✓ CORRECT: Using server client for RLS-protected operations
import { createServerClient } from '@supabase/ssr';

const { data } = await createServerClient()
  .from('dream_entries')
  .select('*');  // RLS automatically applied

// ✓ CORRECT: Using admin client to bypass RLS in seed/tests
const adminClient = createClient(url, serviceRoleKey);
await adminClient
  .from('dream_entries')
  .insert({ user_id: testUserId, ... });

// ✗ WRONG: Forgetting RLS policies in tests
// Tests will fail with "no rows returned" if RLS denies access
```

### next-themes Hydration (React/SSR)
```typescript
// ✓ CORRECT: Wrapped in Suspense to handle hydration
// app/layout.tsx
import { ThemeProvider } from 'next-themes';
import { ReactNode, Suspense } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <Suspense fallback={<LoadingSpinner />}>
          <ThemeProvider attribute="class" defaultTheme="dark">
            {children}
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  );
}

// ✗ WRONG: Direct ThemeProvider without Suspense
// Can cause hydration mismatch errors
<ThemeProvider attribute="class" defaultTheme="dark">
  {children}
</ThemeProvider>
```

### Framer Motion SSR (React/SSR)
```typescript
// ✓ CORRECT: AnimatePresence in client component
// components/AnimatedDream.tsx
'use client'
import { AnimatePresence, motion } from 'framer-motion';

export function AnimatedDream({ dream }: Props) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }}>
        {dream.title}
      </motion.div>
    </AnimatePresence>
  );
}

// ✗ WRONG: Using Framer Motion in server component
// Server components can't have interactivity
export function DreamLayout({ children }: Props) {
  return (
    <motion.div>  // ✗ Server component can't use Framer Motion!
      {children}
    </motion.div>
  );
}
```

---

## Error Pattern Reference

The `references/error-patterns.json` contains Dreamlink-specific error patterns and auto-fix templates:

```json
{
  "error_patterns": [
    {
      "error_code": "TS2305",
      "pattern": "unused import",
      "description": "Import statement for unused symbol",
      "category": "auto-fix",
      "auto_fix_available": true,
      "fix_template": "Remove import statement: import { SYMBOL } from 'MODULE'",
      "dreamlink_context": "Common in iterative development; imports added during refactoring"
    },
    {
      "error_code": "TS2339",
      "pattern": "profile\\.subscription_tier",
      "description": "Missing property subscription_tier on profile type",
      "category": "manual-review",
      "auto_fix_available": false,
      "fix_template": "Replace profile.subscription_tier with query to subscriptions table: await supabase.from('subscriptions').select('*').eq('user_id', user.id)",
      "dreamlink_context": "Profile table doesn't have subscription_tier; it's stored in subscriptions table. See CLAUDE.md known issues #4"
    }
  ]
}
```

---

## Scripts Reference

### categorize-errors.js

Reads build-errors.log and outputs categorized errors as JSON:

```bash
npm run typecheck 2>&1 | node scripts/categorize-errors.js
# or from file:
node scripts/categorize-errors.js < build-errors.log

# Output: JSON array of categorized errors
[
  {
    "file": "/path/to/file.ts",
    "line": 42,
    "column": 5,
    "code": "TS2305",
    "message": "'Profile' is not exported from module",
    "severity": "error",
    "source": "typecheck",
    "category": "manual-review",
    "fixType": "missing-import",
    "confidence": 0.8,
    "dreamlinkContext": "Check if Profile type defined in schema/ or utils/supabase/types.ts"
  }
]
```

### validate-schema-sync.js

Compares Zod schemas to Supabase migrations:

```bash
node scripts/validate-schema-sync.js

# Output: Alignment report
Schema Validation Report
========================

✓ dreamEntry matches dream_entries table (12/12 fields)
  ✓ id: uuid
  ✓ user_id: uuid
  ✓ original_text: text
  ✓ created_at: timestamp

⚠ bibleCitation partially matches bible_citations table (8/10 fields)
  ✓ id: uuid
  ✓ dream_entry_id: uuid
  ✗ MISSING in Zod: source (text column in DB)
  ✗ MISSING in Zod: supporting_text (text column in DB)

✗ payments table exists in DB but NO Zod schema found
  Required fields: id, user_id, stripe_payment_id, amount, currency, status, created_at

⚠ profile: DB column 'image_aesthetic' not in Zod schema (added in migration 20260308000004)

Summary: 2 critical issues, 2 warnings
```

---

## Usage Examples

### Fixing Errors Interactively

```bash
# Run error detection and auto-fix loop
npm run fix

# The skill will:
# 1. Run typecheck, lint, build
# 2. Categorize errors
# 3. Auto-fix auto-fixable items
# 4. Display manual-review items
# 5. Propose fixes for manual items
# 6. Re-run checks
# 7. Loop until clean or only manual items remain
```

### Schema Validation Pre-Deployment

```bash
# Validate schemas before pushing
node skills/dreamlink-dev-workflow/scripts/validate-schema-sync.js

# Review any warnings/errors
# If warnings, check if migrations created new fields not yet in Zod schemas
# If errors, fix either Zod schemas or migrations before deploying
```

### Pre-Commit Hook Integration

```bash
# Add to .git/hooks/pre-commit (bash script)
#!/bin/bash
set -e

# Run pre-commit checks
npm run typecheck || exit 1
npm run lint -- --fix || exit 1
npm run build || exit 1

# Validate schemas
node skills/dreamlink-dev-workflow/scripts/validate-schema-sync.js || exit 1

# Check for debug endpoints
grep -r "app/api/debug" app/ && echo "Remove debug endpoints before commit" && exit 1 || true

# Check for console.log in production code
grep -r "console\.log" app/ utils/ --include="*.ts" --include="*.tsx" \
  | grep -v "test\|spec" && echo "Remove console.log statements" && exit 1 || true
```

---

## Composition & Dependencies

### External MCPs Used

**Supabase MCP**: For schema inspection and validation
- Query: List all tables and columns
- Query: Export migrations
- Verify RLS policies

**Vercel MCP**: For deployment verification
- Query: Latest deployment status
- Query: Deployment logs
- Verify route accessibility

---

## Known Limitations & Future Work

### Current Limitations
- Auto-fix for TypeScript errors limited to unused imports/variables
- ESLint auto-fix only for formatting rules
- Schema validation is one-way (Zod → SQL); doesn't generate missing schemas
- Deployment verification requires public API access (not available in private Vercel deployments)

### Future Enhancements
- [ ] Integration with Claude Code to auto-propose fixes in chat
- [ ] Database migration generator from Zod schemas
- [ ] Git pre-commit hook auto-installation
- [ ] Performance baseline tracking and regression detection
- [ ] Automated rollback recommendations post-deployment
- [ ] Integration with Sentry for production error monitoring
- [ ] A/B testing framework for schema changes

---

## References

- **Dreamlink Tech Stack**: See CLAUDE.md
- **Architecture Overview**: See docs/full-stack-overview.md
- **Development Logs**: See docs/devlog-*.md
- **Supabase RLS**: See CLAUDE.md authentication implementation
- **Error Patterns**: See references/error-patterns.json in this skill
- **OpenAI Models**: https://platform.openai.com/docs/guides/structured-outputs
