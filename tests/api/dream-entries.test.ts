import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// Mock the Supabase client
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        // email_confirmed_at matters: the handler rejects unverified accounts
        // with 403 email_unverified before any OpenAI call, so a user without
        // it never reaches the path this suite is asserting on.
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            email_confirmed_at: '2026-01-01T00:00:00.000Z',
          },
        },
        error: null
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null
      })
    },
    from: vi.fn().mockImplementation((table) => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((callback) => {
        if (table === 'dream_entries') {
          return Promise.resolve(callback({
            data: [{ id: 'test-dream-id', user_id: 'test-user-id' }],
            error: null
          }));
        } else if (table === 'chatgpt_interactions') {
          return Promise.resolve(callback({
            data: null,
            error: null
          }));
        } else if (table === 'bible_citations') {
          return Promise.resolve(callback({
            data: null,
            error: null
          }));
        }
        return Promise.resolve(callback({ data: null, error: null }));
      })
    }))
  }))
}));

// Mock the OpenAI analysis function
vi.mock('../../app/api/openai-analysis/route', () => ({
  POST: vi.fn().mockImplementation(() => {
    return NextResponse.json({
      topicSentence: "Your dream reflects a spiritual journey.",
      supportingPoints: [
        "The river symbolizes life's journey (Psalm 23:4).",
        "The light represents divine revelation (John 8:12)."
      ],
      conclusionSentence: "Consider how God is guiding you.",
      analysis: "Full analysis text..."
    });
  })
}));

// The handler runs three gates before it does any work — email verification,
// monthly credits, and a per-user daily rate limit — each in its own module and
// each backed by real Supabase queries. Left unmocked they short-circuited the
// request (402 out_of_credits, since an unmocked admin client reports zero
// credits) long before the save-and-analyse path these tests are named for.
//
// Mocking the gates rather than setting is_admin keeps the test on the ordinary
// user path; an admin bypasses all three at once and would prove less.
vi.mock('@/utils/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    // Table-aware because one admin client serves several shapes in this
    // handler: the profile/subscription reads that build ProfileContext, and
    // the dream_entries insert that the response depends on. A single
    // catch-all builder handed the profile row back to the insert, so
    // dreamData.id was undefined and the handler answered "Failed to save any
    // dream entries".
    from: vi.fn((table: string) => {
      const rows: Record<string, any> = {
        profile: { is_admin: false, analysis_depth: null, reading_level: null },
        subscriptions: null,
        dream_entries: { id: 'test-dream-id', user_id: 'test-user-id' },
      };
      const result = { data: rows[table] ?? null, error: null };
      const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        insert: vi.fn(() => builder),
        update: vi.fn(() => builder),
        single: vi.fn().mockResolvedValue(result),
        maybeSingle: vi.fn().mockResolvedValue(result),
        then: (resolve: any) => resolve(result),
      };
      return builder;
    }),
  })),
}));

vi.mock('@/lib/monthlyCredits', () => ({
  checkMonthlyCredits: vi.fn().mockResolvedValue({
    allowed: true,
    used: 0,
    limit: 3,
    retryAfterSeconds: null,
  }),
  checkGlobalDailyDreamCap: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock('@/lib/rateLimit', () => ({
  checkDreamSubmissionRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    retryAfterSeconds: null,
  }),
}));

// The real one calls OpenAI and the image API. It resolves to
// { analysis, ok } and the caller destructures `analysis` straight off it, so
// resolving to undefined throws before the handler can answer.
vi.mock('@/lib/analysisPersistence', () => ({
  analyzeAndPersist: vi.fn().mockResolvedValue({
    ok: true,
    analysis: {
      topicSentence: 'Your dream reflects a spiritual journey.',
      supportingPoints: [
        "The river symbolizes life's journey (Psalm 23:4).",
        'The light represents divine revelation (John 8:12).',
      ],
      conclusionSentence: 'Consider how God is guiding you.',
    },
  }),
}));

// Sample dream text for testing
const sampleDreamText = "I dreamed I was walking by a river and saw a bright light.";

// This lived inside beforeEach, which did nothing useful: vi.mock is hoisted to
// the top of the module regardless, so registering it per-test only made it
// look conditional.
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data) => ({
      ...data,
      headers: new Map()
    }))
  }
}));

describe('Dream Entries API', () => {
  beforeEach(() => {
    // Was vi.resetAllMocks(), which strips implementations and not just call
    // history — so the createClient mock above collapsed to a bare vi.fn()
    // returning undefined, and every handler died on "Cannot read properties
    // of undefined (reading 'auth')" before reaching the code under test.
    vi.clearAllMocks();
  });

  describe('POST Endpoint', () => {
    it('should save a new dream entry and start analysis in the background', async () => {
      // Import the handler after mocks are set up
      const { POST } = await import('../../app/api/dream-entries/route');
      
      // Create test request
      const request = new Request('http://localhost:3000/api/dream-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dream_text: sampleDreamText })
      });

      // Call the handler
      const response = await POST(request);
      
      // The handler answers "Dream recorded and analyzed" (or a partial
      // variant when only some of the matrix succeeds) — never "Dream recorded
      // successfully", so this assertion could not have passed as written.
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining("Dream recorded"),
          id: 'test-dream-id',
          analysis: expect.objectContaining({
            topicSentence: expect.any(String),
          }),
        })
      );

      // The point of the test name: analysis is kicked off for the saved dream.
      const { analyzeAndPersist } = await import('@/lib/analysisPersistence');
      expect(analyzeAndPersist).toHaveBeenCalledWith(
        expect.objectContaining({ dreamId: 'test-dream-id' }),
      );
    });

    it('should reject unauthenticated requests', async () => {
      // Override the auth mock for this test
      const createClientMock = await import('@/utils/supabase/server');
      (createClientMock.createClient as any).mockImplementationOnce(() => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null
          }),
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null
          })
        }
      }));

      const { POST } = await import('../../app/api/dream-entries/route');
      
      const request = new Request('http://localhost:3000/api/dream-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dream_text: sampleDreamText })
      });

      await POST(request);
      
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining("Unauthorized")
        }),
        expect.objectContaining({ status: 401 })
      );
    });
  });

  // The "analyzeAndUpdateDream function" case that lived here has moved to
  // tests/lib/analysisPersistence.test.ts. It named a function this route no
  // longer has — persistence moved into lib/analysisPersistence so the submit
  // and "Read again" paths produce identically-shaped readings — and it could
  // only observe the write indirectly, through a POST and a hand-rolled
  // Supabase mock. Tested at its own level it can assert things this file
  // never could: that the stored analysis is ciphertext, and that citations
  // which fail KJV lookup are not written as rows.
});