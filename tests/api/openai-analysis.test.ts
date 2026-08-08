import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// This file used to mock global.fetch with canned OpenAI payloads and assert
// the handler surfaced them. The route has not spoken HTTP to OpenAI for some
// time — it delegates to runDreamAnalysis(), which uses the SDK — so the fetch
// mocks were inert. The two "passing" cases were satisfied by
// FALLBACK_ANALYSIS, which happens to carry the same four properties they
// checked for, and the third asserted a 500 on API failure that this route
// deliberately never returns: a failed analysis degrades to the fallback
// rather than erroring, because a usable reading beats an error page.
//
// Rewritten to mock the seam the route actually has and to assert what the
// route is actually responsible for: auth, input validation, clamping depth to
// plan, and the response envelope.

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, init })),
  },
}));

const analysisFixture = {
  topicSentence: 'Your dream reflects a spiritual journey of renewal.',
  supportingPoints: [
    'The water symbolizes cleansing (John 7:38).',
    'The path represents guidance (Psalm 23:4).',
    'The light signifies truth (John 8:12).',
  ],
  conclusionSentence: 'Consider how renewal is being offered to you.',
  analysis: 'Full analysis prose.',
};

const runDreamAnalysis = vi.fn(async () => ({
  analysis: analysisFixture,
  usage: { inputTokens: 900, outputTokens: 260 },
}));

vi.mock('@/lib/dreamAnalysis', () => ({
  runDreamAnalysis: (...args: unknown[]) => runDreamAnalysis(...(args as [])),
}));

// The handler authenticates first; without this createClient() reaches Next's
// real cookies() and throws "`cookies` was called outside a request scope".
const getUser = vi.fn(async () => ({
  data: { user: { id: 'test-user-id', email: 'test@example.com' } },
  error: null,
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: (...a: unknown[]) => getUser(...(a as [])) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { is_admin: false }, error: null })),
    })),
  })),
}));

vi.mock('@/utils/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      single: vi.fn(async () => ({ data: null, error: null })),
    })),
  })),
}));

const checkDreamSubmissionRateLimit = vi.fn(async () => ({
  allowed: true,
  limit: 20,
  retryAfterSeconds: null,
}));

vi.mock('@/lib/rateLimit', () => ({
  checkDreamSubmissionRateLimit: (...a: unknown[]) =>
    checkDreamSubmissionRateLimit(...(a as [])),
}));

const sampleDream =
  'I was walking beside a clear river on a sunlit path, and the light guided my way.';

function post(body: unknown) {
  return new Request('http://localhost:3000/api/openai-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function callRoute(body: unknown) {
  const { POST } = await import('../../app/api/openai-analysis/route');
  return POST(post(body));
}

function lastJsonCall() {
  const calls = (NextResponse.json as any).mock.calls;
  return calls[calls.length - 1];
}

describe('OpenAI Analysis API', () => {
  beforeEach(() => {
    // Note: clearAllMocks, not resetAllMocks. reset strips implementations as
    // well as call history, which left createClient returning undefined and
    // every case after the first failing on "Cannot read properties of
    // undefined (reading 'auth')".
    vi.clearAllMocks();
  });

  it('returns the analysis at the top level with usage alongside it', async () => {
    await callRoute({ dream: sampleDream });

    const [payload] = lastJsonCall();
    expect(payload).toMatchObject(analysisFixture);
    // Older consumers read analysis fields off the root, so they must stay
    // there; token counts ride along under a separate key.
    expect(payload._usage).toEqual({ inputTokens: 900, outputTokens: 260 });
  });

  it('passes the dream through to the analyzer', async () => {
    await callRoute({ dream: sampleDream, topic: 'guidance' });

    expect(runDreamAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ dream: sampleDream, topic: 'guidance' }),
    );
  });

  it('rejects an unauthenticated request before doing any work', async () => {
    getUser.mockResolvedValueOnce({ data: { user: null }, error: null } as never);

    await callRoute({ dream: sampleDream });

    const [payload, init] = lastJsonCall();
    expect(payload).toHaveProperty('error', 'Unauthorized');
    expect(init).toMatchObject({ status: 401 });
    expect(runDreamAnalysis).not.toHaveBeenCalled();
  });

  it('rejects a request with no dream text', async () => {
    await callRoute({ topic: 'guidance' });

    const [payload, init] = lastJsonCall();
    expect(payload).toHaveProperty('error', 'Dream content is required');
    expect(init).toMatchObject({ status: 400 });
    expect(runDreamAnalysis).not.toHaveBeenCalled();
  });

  it('rejects a dream longer than the character cap', async () => {
    await callRoute({ dream: 'x'.repeat(10_001) });

    const [payload, init] = lastJsonCall();
    expect(payload.error).toMatch(/exceeds 10000 characters/);
    expect(init).toMatchObject({ status: 400 });
    expect(runDreamAnalysis).not.toHaveBeenCalled();
  });

  it('rejects a malformed body', async () => {
    await callRoute('{ not json');

    const [payload, init] = lastJsonCall();
    expect(payload).toHaveProperty('error', 'Invalid JSON');
    expect(init).toMatchObject({ status: 400 });
  });

  it('refuses when the shared daily limit is spent', async () => {
    checkDreamSubmissionRateLimit.mockResolvedValueOnce({
      allowed: false,
      limit: 20,
      retryAfterSeconds: 3600,
    } as never);

    await callRoute({ dream: sampleDream });

    const [payload, init] = lastJsonCall();
    expect(payload).toHaveProperty('error', 'Daily analysis limit reached');
    expect(init).toMatchObject({ status: 429 });
    expect(runDreamAnalysis).not.toHaveBeenCalled();
  });

  it('clamps a free account to shallow even when it asks for profound', async () => {
    await callRoute({ dream: sampleDream, analysisDepth: 'profound' });

    // The mocked subscription lookup returns nothing, so the plan is free.
    expect(runDreamAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ analysisDepth: 'shallow' }),
    );
  });

  it('still answers with a reading when the analyzer falls back', async () => {
    // runDreamAnalysis swallows API failures and hands back FALLBACK_ANALYSIS
    // with null usage rather than throwing — the caller gets something usable
    // instead of an error. The previous version of this file asserted a 500
    // here, which the route has no code path to produce.
    runDreamAnalysis.mockResolvedValueOnce({
      analysis: analysisFixture,
      usage: { inputTokens: null, outputTokens: null },
    } as never);

    await callRoute({ dream: sampleDream });

    const [payload, init] = lastJsonCall();
    expect(payload).toMatchObject(analysisFixture);
    expect(payload._usage).toEqual({ inputTokens: null, outputTokens: null });
    expect(init).toBeUndefined();
  });
});
