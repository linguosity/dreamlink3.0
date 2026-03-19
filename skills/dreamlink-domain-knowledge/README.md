# Dreamlink Domain Knowledge Skill

The foundational skill providing all Dreamlink dream interpretation capabilities with biblical references.

## Structure

- **SKILL.md** - Complete skill documentation with usage guidelines
- **references/** - Domain knowledge databases
  - `dream-symbols.json` - 37 dream symbols with meanings and biblical refs
  - `bible-crossrefs.json` - 15 themes mapping dreams to scripture
  - `reading-levels.json` - 4-tier reading level definitions
  - `archetypes.json` - 12 Jungian archetypes for psychological analysis
- **scripts/** - Utility functions
  - `load-references.js` - Node.js module for accessing references

## Quick Start

### Using in Another Skill

```javascript
const refs = require('../dreamlink-domain-knowledge/scripts/load-references');

// Get a symbol
const waterSymbol = refs.getSymbol('water');

// Get a reading level
const level = refs.getReadingLevel('CELESTIAL_INSIGHT');

// Get a biblical theme
const guidanceTheme = refs.getTheme('guidance-direction');

// Compose interpretation
const interpretation = refs.composeSymbolInterpretation('mountain', 'PROPHETIC_WISDOM');
```

### CLI Usage

```bash
# List all symbols
node skills/dreamlink-domain-knowledge/scripts/load-references.js symbols

# Look up a specific symbol
node skills/dreamlink-domain-knowledge/scripts/load-references.js symbol water

# Look up a theme
node skills/dreamlink-domain-knowledge/scripts/load-references.js theme guidance

# Look up a reading level
node skills/dreamlink-domain-knowledge/scripts/load-references.js level CELESTIAL_INSIGHT
```

## Key Features

### Dream Symbols (37 total)
- **Nature** (7): Water, Mountain, Tree, Fire, Garden, River, Storm
- **Animals** (6): Lion, Eagle, Serpent, Lamb, Dove, Fish, Wolf
- **People/Figures** (5): King, Priest, Stranger, Child, Angel
- **Objects** (6): Door, Key, Crown, Sword, Bread, Wine, Garment, Vessel
- **Actions** (4): Flying, Falling, Running, Climbing, Crossing Water, Building
- **Places** (4): Temple, City, Wilderness, Valley

Each symbol includes:
- Common meanings
- Biblical references (with book, chapter, verse)
- Jungian archetype connections
- Emotional valence (positive/negative/neutral/ambiguous)

### Reading Levels (4 tiers)

| Level | Grade | Use Case | Vocabulary |
|-------|-------|----------|------------|
| RADIANT_CLARITY | 3rd | Young dreamers, families | 200-500 simple words |
| CELESTIAL_INSIGHT | 8th | General audience, teens | 1500-2000 moderate words |
| PROPHETIC_WISDOM | 12th | Adults, theological depth | 3000+ academic words |
| DIVINE_REVELATION | Graduate+ | Scholars, theologians | Unrestricted, original languages |

### Biblical Themes (15 total)

- Guidance & Direction
- Fear & Anxiety
- Promise & Hope
- Warning & Danger
- Transformation & Growth
- Protection
- Wisdom
- Judgment
- Redemption
- Love & Relationships
- Purpose & Calling
- Provision
- Spiritual Warfare
- Rest & Peace
- New Beginnings

### Jungian Archetypes (12)

The Self, The Shadow, The Anima/Animus, The Hero, The Wise Old Man/Woman, The Trickster, The Child, The Mother, The Father, The Maiden, Death & Rebirth, The Journey

## Integration Principles

1. **Progressive Disclosure** - Layer information gradually, don't overwhelm
2. **Reading Level First** - Always adapt explanation to reading level
3. **Biblical Authority** - Scripture is the primary source of meaning
4. **Psychology Secondary** - Jungian insights enrich but don't override biblical meaning
5. **Respect the Dreamer** - Interpretations should encourage and empower
6. **Context Drives Selection** - Load only references relevant to the dream

## For Future Skills

When building skills that compose with this one:

- Always check reading level first
- Use `dream-symbols.json` as authoritative
- Prefer biblical references from `bible-crossrefs.json`
- Layer archetypes carefully
- Respect gematria as supplementary
- Load progressively - request only what you'll use

See SKILL.md for detailed composition guidelines.
