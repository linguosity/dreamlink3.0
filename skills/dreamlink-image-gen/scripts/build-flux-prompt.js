#!/usr/bin/env node

/**
 * build-flux-prompt.js
 *
 * Constructs FLUX.2 [klein] image prompts by combining dream content with
 * aesthetic presets. Follows BFL's prompting guide:
 *   Subject → Setting → Details → Lighting → Atmosphere → Style/Mood
 *
 * Usage (CLI):
 *   node build-flux-prompt.js \
 *     --title "The Golden Gate" \
 *     --summary "I walked through a shimmering gate..." \
 *     --aesthetic sacred_oil_painting
 *
 * Usage (Module):
 *   const { buildPrompt } = require('./build-flux-prompt.js');
 *   const result = buildPrompt(dreamContent, aesthetic, options);
 */

const fs = require('fs');
const path = require('path');

// Load aesthetic presets
function loadAesthetics() {
  const aestheticsPath = path.join(__dirname, '../references/aesthetics.json');
  try {
    const data = fs.readFileSync(aestheticsPath, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.aesthetics.reduce((acc, aes) => {
      acc[aes.id] = aes;
      return acc;
    }, {});
  } catch (err) {
    console.error('Failed to load aesthetics.json:', err.message);
    process.exit(1);
  }
}

const AESTHETICS = loadAesthetics();

/**
 * Builds a FLUX prompt from dream content and aesthetic preset.
 *
 * @param {Object} dreamContent - { title, summary, topicSentence, symbols }
 * @param {Object|string} aesthetic - Aesthetic preset object or preset ID
 * @param {Object} options - { maxLength: 500, includeNegative: true }
 *
 * @returns {Object} { prompt, negative_prompt, width, height }
 */
function buildPrompt(dreamContent, aesthetic, options = {}) {
  const {
    maxLength = 500,
    includeNegative = true,
  } = options;

  // Normalize aesthetic to object
  let aestheticPreset;
  if (typeof aesthetic === 'string') {
    aestheticPreset = AESTHETICS[aesthetic];
    if (!aestheticPreset) {
      throw new Error(`Unknown aesthetic: ${aesthetic}`);
    }
  } else if (typeof aesthetic === 'object' && aesthetic.id) {
    aestheticPreset = aesthetic;
  } else {
    throw new Error('Invalid aesthetic: must be preset ID (string) or preset object');
  }

  // Extract and clean dream content
  const title = cleanText(dreamContent.title);
  const summary = cleanText(dreamContent.summary);
  const topic = cleanText(dreamContent.topicSentence);
  const symbols = Array.isArray(dreamContent.symbols)
    ? dreamContent.symbols.map(s => cleanText(s)).filter(Boolean)
    : [];

  // Build subject from dream content
  const subject = buildSubject(title, summary, topic, symbols);

  // Construct prompt: Subject + Aesthetic Preset
  // Format: [subject]. [scene_prose]. [style_annotation]
  const promptParts = [
    subject,
    aestheticPreset.scene_prose_template,
    aestheticPreset.style_annotation,
  ];

  let prompt = promptParts.filter(Boolean).join(' ').trim();

  // Enforce max length
  if (prompt.length > maxLength) {
    prompt = truncatePrompt(prompt, maxLength);
  }

  // Build negative prompt from aesthetic hints
  const negative_prompt = includeNegative
    ? aestheticPreset.negative_prompt_hints
    : '';

  return {
    prompt,
    negative_prompt,
    width: 512,
    height: 512,
  };
}

/**
 * Cleans text by removing trailing punctuation and extra whitespace.
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[.!?]+$/, '')
    .trim();
}

/**
 * Builds the subject from available dream content.
 *
 * Priority:
 * 1. Title (sets the scene)
 * 2. Summary (provides specific detail)
 * 3. Topic sentence (fallback)
 * 4. Symbols (add depth if available)
 */
function buildSubject(title, summary, topic, symbols) {
  const parts = [];

  if (title) parts.push(title);

  if (summary) {
    // Truncate summary to ~120 chars to keep subject focused
    const truncated = summary.length > 120
      ? summary.substring(0, 120).replace(/\s+\S*$/, '')
      : summary;
    parts.push(truncated);
  } else if (topic) {
    parts.push(topic);
  }

  // Add up to 2 key symbols for visual richness
  if (symbols.length > 0) {
    const topSymbols = symbols.slice(0, 2).join(', ');
    parts.push(`featuring ${topSymbols}`);
  }

  return parts.length > 0
    ? parts.join('. ')
    : 'A sacred vision';
}

/**
 * Truncates a prompt to a max length, trying to preserve complete sentences.
 */
function truncatePrompt(prompt, maxLength) {
  if (prompt.length <= maxLength) return prompt;

  // Try to cut at the last period before max length
  const truncated = prompt.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');

  if (lastPeriod > maxLength * 0.7) {
    // Safe to cut at period
    return truncated.substring(0, lastPeriod + 1).trim();
  }

  // Otherwise cut at last space
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0
    ? truncated.substring(0, lastSpace).trim() + '.'
    : truncated.trim() + '.';
}

// ────────────────────────────────────────────────────────────────────────────
// CLI Mode
// ────────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`
build-flux-prompt.js — Construct FLUX.2 [klein] image prompts

USAGE:
  node build-flux-prompt.js [OPTIONS]

OPTIONS:
  --title TEXT                  Dream title
  --summary TEXT                Dream summary
  --topic TEXT                  Topic sentence
  --symbols SYMBOL1,SYMBOL2     Comma-separated symbols
  --aesthetic ID                Aesthetic preset ID (see list below)
  --max-length NUM              Max prompt length (default: 500)
  --help                        Show this message

AVAILABLE AESTHETICS:
${Object.entries(AESTHETICS)
  .map(([id, aes]) => `  • ${id} — ${aes.display_name} (tier: ${aes.tier})`)
  .join('\n')}

EXAMPLE:
  node build-flux-prompt.js \\
    --title "The Golden Gate" \\
    --summary "I walked through a shimmering gate, feeling completely safe" \\
    --aesthetic sacred_oil_painting
    `);
    process.exit(0);
  }

  const dreamContent = {
    title: args.title,
    summary: args.summary,
    topicSentence: args.topic,
    symbols: args.symbols || [],
  };

  const aesthetic = args.aesthetic || 'photorealistic_vision';

  try {
    const result = buildPrompt(dreamContent, aesthetic, {
      maxLength: args['max-length'] || 500,
    });

    console.log('\n📸 FLUX Prompt Builder');
    console.log('═'.repeat(60));
    console.log(`\nAesthetic: ${AESTHETICS[aesthetic]?.display_name || aesthetic}`);
    console.log(`Tier: ${AESTHETICS[aesthetic]?.tier || 'unknown'}`);
    console.log(`\nPrompt (${result.prompt.length} chars):`);
    console.log(`\n${result.prompt}`);

    if (result.negative_prompt) {
      console.log(`\nNegative Prompt:\n${result.negative_prompt}`);
    }

    console.log(`\nDimensions: ${result.width}×${result.height}`);
    console.log('\n' + '═'.repeat(60));

    // Output JSON for programmatic use
    console.log('\nJSON Output:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Parse command-line arguments into an object.
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].substring(2);
      if (key === 'help') {
        args.help = true;
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args[key] = argv[i + 1];
        i++;
      }
    }
  }
  return args;
}

// ────────────────────────────────────────────────────────────────────────────
// Exports for module use
// ────────────────────────────────────────────────────────────────────────────

module.exports = {
  buildPrompt,
  AESTHETICS,
  loadAesthetics,
};
