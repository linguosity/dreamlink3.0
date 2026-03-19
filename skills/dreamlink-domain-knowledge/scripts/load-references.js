#!/usr/bin/env node

/**
 * load-references.js
 *
 * Utility script for loading Dreamlink domain knowledge references.
 * Used by other Dreamlink skills to access dream symbols, biblical themes,
 * reading levels, and archetypal patterns.
 *
 * Usage:
 *   const refs = require('./load-references');
 *   const waterSymbol = refs.getSymbol('water');
 *   const guidanceTheme = refs.getTheme('guidance-direction');
 *   const readingLevel = refs.getReadingLevel('CELESTIAL_INSIGHT');
 */

const fs = require('fs');
const path = require('path');

const REFERENCES_DIR = path.join(__dirname, '../references');

/**
 * Load JSON reference file
 * @param {string} filename - Name of the JSON file to load
 * @returns {object} Parsed JSON content
 */
function loadReference(filename) {
  try {
    const filepath = path.join(REFERENCES_DIR, filename);
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading reference ${filename}:`, error.message);
    return null;
  }
}

// Cache references after first load
let symbolsCache = null;
let themesCache = null;
let levelsCache = null;
let archetypesCache = null;

/**
 * Get all dream symbols
 * @returns {array} Array of symbol objects
 */
function getAllSymbols() {
  if (!symbolsCache) {
    const data = loadReference('dream-symbols.json');
    symbolsCache = data?.symbols || [];
  }
  return symbolsCache;
}

/**
 * Get a specific dream symbol by ID or name
 * @param {string} identifier - Symbol ID or name (case-insensitive)
 * @returns {object|null} Symbol object or null if not found
 */
function getSymbol(identifier) {
  const symbols = getAllSymbols();
  const id = identifier.toLowerCase().replace(/\s+/g, '-');
  return symbols.find(s => s.id === id || s.name.toLowerCase() === identifier.toLowerCase()) || null;
}

/**
 * Search symbols by category
 * @param {string} category - Category name (e.g., "Animals", "Nature")
 * @returns {array} Array of matching symbols
 */
function getSymbolsByCategory(category) {
  const symbols = getAllSymbols();
  return symbols.filter(s => s.category === category);
}

/**
 * Get all biblical themes
 * @returns {array} Array of theme objects
 */
function getAllThemes() {
  if (!themesCache) {
    const data = loadReference('bible-crossrefs.json');
    themesCache = data?.themes || [];
  }
  return themesCache;
}

/**
 * Get a specific biblical theme by ID or name
 * @param {string} identifier - Theme ID or name
 * @returns {object|null} Theme object or null if not found
 */
function getTheme(identifier) {
  const themes = getAllThemes();
  const id = identifier.toLowerCase().replace(/\s+/g, '-');
  return themes.find(t => t.id === id || t.theme_name.toLowerCase().includes(identifier.toLowerCase())) || null;
}

/**
 * Get all reading levels
 * @returns {array} Array of reading level objects
 */
function getAllReadingLevels() {
  if (!levelsCache) {
    const data = loadReference('reading-levels.json');
    levelsCache = data?.reading_levels || [];
  }
  return levelsCache;
}

/**
 * Get a specific reading level by ID or name
 * @param {string} identifier - Level ID (e.g., "CELESTIAL_INSIGHT") or name
 * @returns {object|null} Reading level object or null if not found
 */
function getReadingLevel(identifier) {
  const levels = getAllReadingLevels();
  const id = identifier.toUpperCase().replace(/\s+/g, '_');
  return levels.find(l => l.id === id || l.display_name.toLowerCase().includes(identifier.toLowerCase())) || null;
}

/**
 * Get all archetypes
 * @returns {array} Array of archetype objects
 */
function getAllArchetypes() {
  if (!archetypesCache) {
    const data = loadReference('archetypes.json');
    archetypesCache = data?.archetypes || [];
  }
  return archetypesCache;
}

/**
 * Get a specific archetype by ID or name
 * @param {string} identifier - Archetype ID or name
 * @returns {object|null} Archetype object or null if not found
 */
function getArchetype(identifier) {
  const archetypes = getAllArchetypes();
  const id = identifier.toLowerCase().replace(/\s+/g, '-');
  return archetypes.find(a => a.id === id || a.name.toLowerCase().includes(identifier.toLowerCase())) || null;
}

/**
 * Find biblical references related to a symbol
 * @param {string} symbolId - ID of the symbol
 * @returns {array} Array of biblical references from the symbol
 */
function getSymbolBiblicalReferences(symbolId) {
  const symbol = getSymbol(symbolId);
  return symbol?.biblical_references || [];
}

/**
 * Get suggested theme based on emotional context
 * @param {string} emotionalTone - One of: positive, negative, neutral, ambiguous, mixed
 * @returns {array} Array of potentially relevant theme IDs
 */
function getThemesByEmotionalContext(emotionalTone) {
  const themes = getAllThemes();
  const emotionMap = {
    'positive': ['promise-hope', 'protection', 'redemption', 'love-relationships', 'new-beginnings'],
    'negative': ['fear-anxiety', 'warning-danger', 'judgment'],
    'neutral': ['guidance-direction', 'wisdom', 'purpose-calling'],
    'ambiguous': ['transformation-growth', 'spiritual-warfare'],
    'mixed': ['all'] // Return popular themes for mixed emotions
  };

  const themeIds = emotionMap[emotionalTone.toLowerCase()] || emotionMap['mixed'];
  return themes.filter(t => themeIds.includes(t.id) || themeIds.includes('all'));
}

/**
 * Compose symbol interpretation with reading level applied
 * @param {string} symbolId - ID of the symbol
 * @param {string} readingLevelId - ID of reading level (e.g., "CELESTIAL_INSIGHT")
 * @returns {object} Simplified symbol with reading level guidance
 */
function composeSymbolInterpretation(symbolId, readingLevelId) {
  const symbol = getSymbol(symbolId);
  const level = getReadingLevel(readingLevelId) || getReadingLevel('CELESTIAL_INSIGHT');

  if (!symbol) return null;

  return {
    symbol: symbol.name,
    category: symbol.category,
    meanings: symbol.common_meanings,
    biblicalReferences: symbol.biblical_references.slice(0, 3), // Limit to 3 for brevity
    readingLevel: level.id,
    readingLevelName: level.display_name,
    promptModifier: level.prompt_modifiers,
    archetype: symbol.jungian_archetype,
    emotionalValence: symbol.emotional_valence
  };
}

// Export functions
module.exports = {
  // Symbol functions
  getAllSymbols,
  getSymbol,
  getSymbolsByCategory,
  getSymbolBiblicalReferences,

  // Theme functions
  getAllThemes,
  getTheme,
  getThemesByEmotionalContext,

  // Reading level functions
  getAllReadingLevels,
  getReadingLevel,

  // Archetype functions
  getAllArchetypes,
  getArchetype,

  // Composition helpers
  composeSymbolInterpretation
};

// CLI usage: node load-references.js [command] [arg]
if (require.main === module) {
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'symbol':
      console.log(JSON.stringify(getSymbol(arg), null, 2));
      break;
    case 'theme':
      console.log(JSON.stringify(getTheme(arg), null, 2));
      break;
    case 'level':
      console.log(JSON.stringify(getReadingLevel(arg), null, 2));
      break;
    case 'archetype':
      console.log(JSON.stringify(getArchetype(arg), null, 2));
      break;
    case 'symbols':
      console.log(`Total symbols: ${getAllSymbols().length}`);
      getAllSymbols().forEach(s => console.log(`  - ${s.name} (${s.category})`));
      break;
    case 'themes':
      console.log(`Total themes: ${getAllThemes().length}`);
      getAllThemes().forEach(t => console.log(`  - ${t.theme_name}`));
      break;
    default:
      console.log('Usage:');
      console.log('  node load-references.js symbol <name>');
      console.log('  node load-references.js theme <name>');
      console.log('  node load-references.js level <id>');
      console.log('  node load-references.js archetype <name>');
      console.log('  node load-references.js symbols');
      console.log('  node load-references.js themes');
  }
}
