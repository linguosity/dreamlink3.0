#!/usr/bin/env node

/**
 * cache-manager.js
 *
 * Supabase-backed analysis cache management module.
 * Provides methods for generating cache keys, checking cache, and storing results.
 *
 * Usage (in Node.js/TypeScript):
 *   const cacheManager = require('./cache-manager');
 *   const key = cacheManager.generateCacheKey(dreamText, readingLevel);
 *   const cached = await cacheManager.getCachedAnalysis(supabaseClient, key);
 */

const crypto = require('crypto');

/**
 * Configuration constants
 */
const CONFIG = {
  TABLE_NAME: 'analysis_cache',
  TTL_HOURS: 24,
  MAX_ENTRIES: 10000,
  HASH_ALGORITHM: 'sha256'
};

/**
 * Generates a cache key from dream text and reading level
 *
 * @param {string} dreamText - The dream content to hash
 * @param {string} [readingLevel='default'] - User's reading level
 * @returns {string} SHA-256 hex string
 *
 * @example
 * const key = generateCacheKey("I had a dream about flying", "celestial_insight");
 * // Returns: "a3f2c8d9e1f4b5c6a7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a"
 */
function generateCacheKey(dreamText, readingLevel = 'default') {
  if (typeof dreamText !== 'string' || !dreamText.trim()) {
    throw new Error('dreamText must be a non-empty string');
  }

  const input = `${dreamText}:${readingLevel || 'default'}`;
  return crypto
    .createHash(CONFIG.HASH_ALGORITHM)
    .update(input, 'utf8')
    .digest('hex');
}

/**
 * Retrieves cached analysis from Supabase
 *
 * @param {object} supabaseClient - Authenticated Supabase client
 * @param {string} cacheKey - Cache key from generateCacheKey()
 * @returns {Promise<object|null>} Cached analysis data, or null if not found/expired
 *
 * @example
 * const cached = await getCachedAnalysis(supabase, cacheKey);
 * if (cached) {
 *   console.log('Cache hit:', cached.topicSentence);
 * } else {
 *   console.log('Cache miss or expired');
 * }
 */
async function getCachedAnalysis(supabaseClient, cacheKey) {
  if (!supabaseClient) {
    throw new Error('supabaseClient is required');
  }

  if (typeof cacheKey !== 'string' || !cacheKey.trim()) {
    throw new Error('cacheKey must be a non-empty string');
  }

  try {
    const now = new Date().toISOString();

    const { data, error } = await supabaseClient
      .from(CONFIG.TABLE_NAME)
      .select('analysis_data, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', now) // Only fetch non-expired entries
      .single(); // Expect exactly one row

    if (error) {
      // Record not found is not an error, just a cache miss
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    if (!data || !data.analysis_data) {
      return null;
    }

    return data.analysis_data;
  } catch (error) {
    console.error(`Error fetching from cache (${CONFIG.TABLE_NAME}):`, error.message);
    // Return null on error to trigger fresh analysis (graceful degradation)
    return null;
  }
}

/**
 * Stores analysis in the persistent cache
 *
 * @param {object} supabaseClient - Authenticated Supabase client (admin preferred for insert)
 * @param {string} cacheKey - Cache key from generateCacheKey()
 * @param {object} analysisData - Full analysis response object (will be stringified as JSONB)
 * @param {number} [ttlHours=24] - Time-to-live in hours
 * @returns {Promise<boolean>} True if successful, false otherwise
 *
 * @example
 * const success = await setCachedAnalysis(
 *   adminSupabase,
 *   cacheKey,
 *   { topicSentence: "...", supportingPoints: [...], ... },
 *   24
 * );
 */
async function setCachedAnalysis(
  supabaseClient,
  cacheKey,
  analysisData,
  ttlHours = CONFIG.TTL_HOURS
) {
  if (!supabaseClient) {
    throw new Error('supabaseClient is required');
  }

  if (typeof cacheKey !== 'string' || !cacheKey.trim()) {
    throw new Error('cacheKey must be a non-empty string');
  }

  if (!analysisData || typeof analysisData !== 'object') {
    throw new Error('analysisData must be a non-null object');
  }

  if (typeof ttlHours !== 'number' || ttlHours <= 0) {
    throw new Error('ttlHours must be a positive number');
  }

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const { error } = await supabaseClient
      .from(CONFIG.TABLE_NAME)
      .insert({
        cache_key: cacheKey,
        analysis_data: analysisData, // Supabase will store as JSONB
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      // Unique constraint violation (cache key already exists): Update instead
      if (error.code === '23505') {
        const { error: updateError } = await supabaseClient
          .from(CONFIG.TABLE_NAME)
          .update({
            analysis_data: analysisData,
            created_at: now.toISOString(),
            expires_at: expiresAt.toISOString()
          })
          .eq('cache_key', cacheKey);

        if (updateError) {
          console.error(`Error updating cache (${CONFIG.TABLE_NAME}):`, updateError.message);
          return false;
        }
        return true;
      }

      throw error;
    }

    return true;
  } catch (error) {
    console.error(`Error storing to cache (${CONFIG.TABLE_NAME}):`, error.message);
    // Return false on error but don't throw (cache is not critical)
    return false;
  }
}

/**
 * Invalidates (deletes) a cached entry
 *
 * @param {object} supabaseClient - Authenticated Supabase client
 * @param {string} cacheKey - Cache key from generateCacheKey()
 * @returns {Promise<boolean>} True if deleted, false if not found/error
 *
 * @example
 * const invalidated = await invalidateCache(supabase, cacheKey);
 * if (invalidated) {
 *   console.log('Cache entry removed');
 * }
 */
async function invalidateCache(supabaseClient, cacheKey) {
  if (!supabaseClient) {
    throw new Error('supabaseClient is required');
  }

  if (typeof cacheKey !== 'string' || !cacheKey.trim()) {
    throw new Error('cacheKey must be a non-empty string');
  }

  try {
    const { error } = await supabaseClient
      .from(CONFIG.TABLE_NAME)
      .delete()
      .eq('cache_key', cacheKey);

    if (error) {
      console.error(`Error invalidating cache (${CONFIG.TABLE_NAME}):`, error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error invalidating cache:`, error.message);
    return false;
  }
}

/**
 * Cleans up expired cache entries (intended for scheduled task/cron)
 *
 * @param {object} supabaseClient - Authenticated Supabase client (admin recommended)
 * @returns {Promise<number>} Number of deleted entries
 *
 * @example
 * // Run daily via scheduled task
 * const deleted = await cleanupExpiredCache(adminSupabase);
 * console.log(`Cleaned up ${deleted} expired cache entries`);
 */
async function cleanupExpiredCache(supabaseClient) {
  if (!supabaseClient) {
    throw new Error('supabaseClient is required');
  }

  try {
    const now = new Date().toISOString();

    const { data, error } = await supabaseClient
      .from(CONFIG.TABLE_NAME)
      .delete()
      .lt('expires_at', now)
      .select('id'); // Return deleted rows count

    if (error) {
      console.error(`Error cleaning up cache:`, error.message);
      return 0;
    }

    const deletedCount = data ? data.length : 0;
    return deletedCount;
  } catch (error) {
    console.error(`Error cleaning up cache:`, error.message);
    return 0;
  }
}

/**
 * Gets cache statistics (useful for monitoring)
 *
 * @param {object} supabaseClient - Authenticated Supabase client
 * @returns {Promise<object>} Statistics including total entries, expired count, average age
 *
 * @example
 * const stats = await getCacheStats(supabase);
 * console.log(`Cache has ${stats.totalEntries} entries, ${stats.expiredCount} expired`);
 */
async function getCacheStats(supabaseClient) {
  if (!supabaseClient) {
    throw new Error('supabaseClient is required');
  }

  try {
    const now = new Date().toISOString();

    // Total entries
    const { count: totalCount, error: countError } = await supabaseClient
      .from(CONFIG.TABLE_NAME)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    // Expired entries
    const { count: expiredCount, error: expiredError } = await supabaseClient
      .from(CONFIG.TABLE_NAME)
      .select('*', { count: 'exact', head: true })
      .lt('expires_at', now);

    if (expiredError) {
      throw expiredError;
    }

    // Active entries
    const activeCount = (totalCount || 0) - (expiredCount || 0);

    return {
      totalEntries: totalCount || 0,
      activeEntries: activeCount,
      expiredEntries: expiredCount || 0,
      timestamp: now,
      table: CONFIG.TABLE_NAME
    };
  } catch (error) {
    console.error(`Error fetching cache stats:`, error.message);
    return {
      totalEntries: 0,
      activeEntries: 0,
      expiredEntries: 0,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Export module interface
 */
module.exports = {
  generateCacheKey,
  getCachedAnalysis,
  setCachedAnalysis,
  invalidateCache,
  cleanupExpiredCache,
  getCacheStats,

  // Configuration export (for reference/testing)
  CONFIG
};

/**
 * CLI usage (when run directly)
 *
 * Examples:
 *   node cache-manager.js --generate-key "my dream text" "celestial_insight"
 *   node cache-manager.js --help
 */
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === '--generate-key' && args[1]) {
    const dreamText = args[1];
    const readingLevel = args[2] || 'default';
    const key = generateCacheKey(dreamText, readingLevel);
    console.log(JSON.stringify({ cache_key: key, input: { dreamText, readingLevel } }, null, 2));
  } else if (args[0] === '--help') {
    console.log(`
Cache Manager CLI

Usage:
  node cache-manager.js --generate-key "<dream-text>" [reading-level]

Options:
  --generate-key    Generate a cache key
  --help            Show this help message

Examples:
  node cache-manager.js --generate-key "I dreamed I was flying" "divine_revelation"

Module Usage (in code):
  const cacheManager = require('./cache-manager');
  const key = cacheManager.generateCacheKey(dreamText, readingLevel);
    `);
  } else {
    console.error('Unknown command. Use --help for usage.');
    process.exit(1);
  }
}
