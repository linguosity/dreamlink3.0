#!/usr/bin/env node

/**
 * retry-queue.js
 *
 * Manages image generation retries with exponential backoff, dead-letter
 * tracking, and manual review capabilities.
 *
 * Schema:
 * CREATE TABLE IF NOT EXISTS image_gen_queue (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   dream_id UUID NOT NULL REFERENCES dream_entries(id) ON DELETE CASCADE,
 *   prompt TEXT NOT NULL,
 *   aesthetic TEXT NOT NULL,
 *   attempt INT NOT NULL DEFAULT 1,
 *   status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
 *   error TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   next_retry_at TIMESTAMPTZ,
 *   completed_at TIMESTAMPTZ,
 *
 *   CONSTRAINT attempt_range CHECK (attempt >= 1 AND attempt <= 3),
 *   CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
 * );
 *
 * CREATE INDEX idx_image_gen_queue_status_retry
 *   ON image_gen_queue(status, next_retry_at)
 *   WHERE status IN ('pending', 'failed');
 */

/**
 * Creates a new retry entry for a failed image generation.
 *
 * @param {Object} supabaseClient - Supabase admin client
 * @param {string} dreamId - UUID of the dream entry
 * @param {string} prompt - FLUX prompt
 * @param {string} aesthetic - Aesthetic preset ID
 * @param {number} attempt - Current attempt number (default: 1)
 *
 * @returns {Promise<Object>} Created queue entry
 */
async function createRetryEntry(supabaseClient, dreamId, prompt, aesthetic, attempt = 1) {
  if (!supabaseClient) throw new Error('supabaseClient is required');
  if (!dreamId) throw new Error('dreamId is required');
  if (!prompt) throw new Error('prompt is required');
  if (!aesthetic) throw new Error('aesthetic is required');
  if (attempt < 1 || attempt > 3) throw new Error('attempt must be 1-3');

  const nextRetryAt = calculateNextRetry(attempt);

  const { data, error } = await supabaseClient
    .from('image_gen_queue')
    .insert({
      dream_id: dreamId,
      prompt,
      aesthetic,
      attempt,
      status: 'pending',
      next_retry_at: nextRetryAt,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create retry entry: ${error.message}`);

  return data;
}

/**
 * Retrieves the next pending retry entry, ordered by age (FIFO).
 *
 * @param {Object} supabaseClient - Supabase admin client
 *
 * @returns {Promise<Object|null>} Next retry entry or null
 */
async function getNextRetry(supabaseClient) {
  if (!supabaseClient) throw new Error('supabaseClient is required');

  const { data, error } = await supabaseClient
    .from('image_gen_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('next_retry_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  // single() throws error if no rows, return null gracefully
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch next retry: ${error.message}`);
  }

  return data || null;
}

/**
 * Marks a retry entry as completed with the generated image URL.
 *
 * @param {Object} supabaseClient - Supabase admin client
 * @param {string} entryId - Queue entry UUID
 * @param {string} imageUrl - Public URL of generated image
 *
 * @returns {Promise<Object>} Updated queue entry
 */
async function markCompleted(supabaseClient, entryId, imageUrl) {
  if (!supabaseClient) throw new Error('supabaseClient is required');
  if (!entryId) throw new Error('entryId is required');
  if (!imageUrl) throw new Error('imageUrl is required');

  const { data, error } = await supabaseClient
    .from('image_gen_queue')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .select()
    .single();

  if (error) throw new Error(`Failed to mark completed: ${error.message}`);

  // Update dream_entries.image_url
  const { error: updateError } = await supabaseClient
    .from('dream_entries')
    .update({ image_url: imageUrl })
    .eq('id', data.dream_id);

  if (updateError) {
    console.warn(`Failed to update dream image_url: ${updateError.message}`);
  }

  return data;
}

/**
 * Marks a retry entry as failed and schedules next retry if attempt < 3.
 *
 * @param {Object} supabaseClient - Supabase admin client
 * @param {string} entryId - Queue entry UUID
 * @param {string} error - Error message
 *
 * @returns {Promise<Object>} Updated queue entry
 */
async function markFailed(supabaseClient, entryId, error) {
  if (!supabaseClient) throw new Error('supabaseClient is required');
  if (!entryId) throw new Error('entryId is required');

  // Fetch current entry to check attempt count
  const { data: entry, error: fetchError } = await supabaseClient
    .from('image_gen_queue')
    .select('*')
    .eq('id', entryId)
    .single();

  if (fetchError) throw new Error(`Failed to fetch entry: ${fetchError.message}`);

  // If this was attempt 3, mark as failed
  // Otherwise, increment attempt and reschedule
  const nextAttempt = entry.attempt + 1;
  const shouldRetry = nextAttempt <= 3;

  if (shouldRetry) {
    // Reschedule for retry
    const nextRetryAt = calculateNextRetry(nextAttempt);

    const { data, updateError } = await supabaseClient
      .from('image_gen_queue')
      .update({
        status: 'pending',
        attempt: nextAttempt,
        error,
        next_retry_at: nextRetryAt,
      })
      .eq('id', entryId)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to reschedule retry: ${updateError.message}`);

    console.log(`⏳ Retry scheduled for attempt ${nextAttempt} at ${nextRetryAt}`);
    return data;
  } else {
    // Exhausted all retries, mark as failed
    const { data, updateError } = await supabaseClient
      .from('image_gen_queue')
      .update({
        status: 'failed',
        error: `Max retries exhausted: ${error}`,
      })
      .eq('id', entryId)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to mark failed: ${updateError.message}`);

    console.error(`❌ Image generation failed after 3 attempts for dream ${entry.dream_id}`);
    return data;
  }
}

/**
 * Retrieves all failed entries for manual review.
 *
 * @param {Object} supabaseClient - Supabase admin client
 * @param {number} limit - Max entries to return (default: 50)
 *
 * @returns {Promise<Array>} Failed entries
 */
async function getFailedEntries(supabaseClient, limit = 50) {
  if (!supabaseClient) throw new Error('supabaseClient is required');

  const { data, error } = await supabaseClient
    .from('image_gen_queue')
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch failed entries: ${error.message}`);

  return data || [];
}

/**
 * Clears a failed entry after manual review/fix.
 *
 * @param {Object} supabaseClient - Supabase admin client
 * @param {string} entryId - Queue entry UUID
 *
 * @returns {Promise<void>}
 */
async function clearFailedEntry(supabaseClient, entryId) {
  if (!supabaseClient) throw new Error('supabaseClient is required');
  if (!entryId) throw new Error('entryId is required');

  const { error } = await supabaseClient
    .from('image_gen_queue')
    .delete()
    .eq('id', entryId);

  if (error) throw new Error(`Failed to delete entry: ${error.message}`);

  console.log(`✅ Cleared failed entry ${entryId}`);
}

/**
 * Gets queue stats for monitoring.
 *
 * @param {Object} supabaseClient - Supabase admin client
 *
 * @returns {Promise<Object>} { pending, processing, completed, failed, avgWaitTime }
 */
async function getQueueStats(supabaseClient) {
  if (!supabaseClient) throw new Error('supabaseClient is required');

  const { data, error } = await supabaseClient
    .from('image_gen_queue')
    .select('status, created_at, next_retry_at', { count: 'exact' });

  if (error) throw new Error(`Failed to fetch queue stats: ${error.message}`);

  const stats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    avgWaitTimeMs: 0,
  };

  let waitTimes = [];

  for (const entry of data) {
    stats[entry.status]++;

    if (entry.status === 'pending' && entry.next_retry_at) {
      const nextRetry = new Date(entry.next_retry_at);
      const now = new Date();
      waitTimes.push(Math.max(0, nextRetry - now));
    }
  }

  if (waitTimes.length > 0) {
    stats.avgWaitTimeMs = Math.round(
      waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
    );
  }

  return stats;
}

/**
 * Calculates next retry time with exponential backoff.
 *
 * Backoff schedule:
 * - Attempt 1 → Retry in 5 minutes
 * - Attempt 2 → Retry in 15 minutes
 * - Attempt 3 → Retry in 60 minutes
 *
 * @param {number} attempt - Current attempt number
 *
 * @returns {string} ISO 8601 timestamp for next retry
 */
function calculateNextRetry(attempt) {
  const backoffMs = {
    1: 5 * 60 * 1000,      // 5 minutes
    2: 15 * 60 * 1000,     // 15 minutes
    3: 60 * 60 * 1000,     // 60 minutes (won't be used for actual retry, but for failed)
  };

  const delay = backoffMs[attempt] || 60 * 60 * 1000;
  const nextRetry = new Date(Date.now() + delay);

  return nextRetry.toISOString();
}

/**
 * Processes a retry entry: updates status to "processing" and returns it.
 *
 * @param {Object} supabaseClient - Supabase admin client
 * @param {string} entryId - Queue entry UUID
 *
 * @returns {Promise<Object>} Updated entry with status='processing'
 */
async function markProcessing(supabaseClient, entryId) {
  if (!supabaseClient) throw new Error('supabaseClient is required');
  if (!entryId) throw new Error('entryId is required');

  const { data, error } = await supabaseClient
    .from('image_gen_queue')
    .update({ status: 'processing' })
    .eq('id', entryId)
    .select()
    .single();

  if (error) throw new Error(`Failed to mark processing: ${error.message}`);

  return data;
}

// ────────────────────────────────────────────────────────────────────────────
// CLI Mode for manual inspection and management
// ────────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const command = process.argv[2];

  if (!command || command === '--help') {
    console.log(`
retry-queue.js — Manage image generation retry queue

USAGE:
  node retry-queue.js COMMAND [OPTIONS]

COMMANDS:
  stats                    Show queue statistics
  list-failed              List all failed entries
  clear ENTRY_ID          Clear a failed entry (delete from queue)
  help                     Show this message
    `);
    process.exit(0);
  }

  // In a real CLI, you'd initialize Supabase client here
  // For now, just show the available functions
  console.log(`
Available functions for import:
  - createRetryEntry(supabaseClient, dreamId, prompt, aesthetic, attempt)
  - getNextRetry(supabaseClient)
  - markCompleted(supabaseClient, entryId, imageUrl)
  - markFailed(supabaseClient, entryId, error)
  - markProcessing(supabaseClient, entryId)
  - getFailedEntries(supabaseClient, limit)
  - clearFailedEntry(supabaseClient, entryId)
  - getQueueStats(supabaseClient)
  - calculateNextRetry(attempt)
    `);
}

// ────────────────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────────────────

module.exports = {
  createRetryEntry,
  getNextRetry,
  markCompleted,
  markFailed,
  markProcessing,
  getFailedEntries,
  clearFailedEntry,
  getQueueStats,
  calculateNextRetry,
};
