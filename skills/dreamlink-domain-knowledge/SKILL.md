---
name: dreamlink-domain-knowledge
description: Provides Dreamlink's core domain expertise for dream interpretation with biblical references, symbolism analysis, gematria, and reading-level-appropriate explanations. Triggers on dream interpretation, biblical symbolism, dream analysis, reading levels, gematria, and dream symbols.
---

# Dreamlink Domain Knowledge Skill

## Purpose

This skill provides the foundation for all Dreamlink dream interpretation capabilities. It manages:
- **Dream symbol taxonomy** with biblical cross-references
- **Reading level system** (4 tiers from elementary to scholarly)
- **Biblical theme mapping** connecting dreams to scripture
- **Jungian archetype patterns** for psychological depth
- **Gematria interpretation** for numerical symbolism
- **Progressive disclosure** of domain knowledge based on context

This skill is the **primary composition partner** for all other Dreamlink skills (analysis, guidance, interpretation, etc.).

---

## Core Concepts

### Reading Levels

Dreamlink uses a 4-tier reading level system to adapt explanations:

1. **RADIANT_CLARITY** (3rd grade, ~8-9 years old)
   - Simple vocabulary (common words only)
   - Short, direct sentences (8-12 words max)
   - Concrete examples and warm tone
   - Emphasis on safety and wonder
   - Use: Young dreamers or families sharing dreams

2. **CELESTIAL_INSIGHT** (8th grade, ~13-14 years old)
   - Moderate vocabulary with brief explanations
   - Balanced detail with relatable analogies
   - Narrative flow with some depth
   - Mix of practical and spiritual perspective
   - Use: Teens and general audience (default)

3. **PROPHETIC_WISDOM** (12th grade, ~17-18 years old)
   - Rich vocabulary with theological terms
   - Nuanced analysis with multiple perspectives
   - Bible knowledge assumed
   - Cross-cultural and historical context
   - Use: Adults seeking theological depth

4. **DIVINE_REVELATION** (scholarly/academic)
   - Technical and academic language
   - Extensive cross-references and citations
   - Hermeneutical analysis
   - Original language insights (Hebrew/Greek where relevant)
   - Use: Scholars, theologians, advanced seekers

### Dream Symbol Structure

Each symbol in `dream-symbols.json` contains:
- **name**: The dream image (e.g., "Water", "Lion")
- **category**: Symbol type (Nature, Animals, People, Objects, Actions, Places)
- **common_meanings**: Array of interpretations (cultural, psychological)
- **biblical_references**: Array of {book, chapter, verse, context} entries
- **jungian_archetype**: Connection to Jungian psychological pattern (if applicable)
- **emotional_valence**: positive/negative/neutral/ambiguous

### Biblical Theme Mapping

Themes in `bible-crossrefs.json` organize scripture by dream context:
- **Guidance/Direction**: When dreamer seeks path or purpose
- **Fear/Anxiety**: When dreams evoke threat or danger
- **Promise/Hope**: When dreams suggest encouragement
- **Warning/Danger**: When dreams carry caution
- **Transformation/Growth**: When dreams hint at change
- **Protection**: When dreams show safety
- **Wisdom**: When dreams offer insight
- **Judgment**: When dreams involve evaluation
- **Redemption**: When dreams suggest restoration
- **Love/Relationships**: When dreams involve connection
- **Purpose/Calling**: When dreams suggest vocation
- **Provision**: When dreams show supply or abundance
- **Spiritual Warfare**: When dreams involve conflict
- **Rest/Peace**: When dreams offer tranquility
- **New Beginnings**: When dreams suggest fresh starts

### Gematria in Context

Gematria (Hebrew numerology) is included for symbols with numerical significance:
- Each Hebrew letter has a numeric value
- Words in scripture carry numeric weight
- Numbers in dreams (3, 7, 12, 40, etc.) often carry biblical meaning
- Use gematria to deepen analysis, never as primary interpretation

---

## How to Use This Skill

### When Composing with Other Skills

This skill provides **reference data and interpretation frameworks**. Other skills use it by:

1. **Identifying dream symbols** in user-provided dream narratives
2. **Loading appropriate references** based on identified symbols
3. **Applying the reading level** the user has selected
4. **Mapping to biblical themes** relevant to emotional content
5. **Enriching with archetypes** when psychological depth is needed

### Progressive Disclosure Pattern

**Never dump all references at once.** Instead:

1. **Start with the symbol itself** - What is it? (name, category)
2. **Add common meanings** - What does it typically represent?
3. **Layer in biblical context** - What does scripture say about this?
4. **Introduce archetypes** - What psychological pattern emerges?
5. **Add gematria (optional)** - Is there numerical significance?

Example flow for "Water" symbol:
```
User: "I dreamed of crossing a river"
→ Symbol: Water (category: Nature)
→ Meanings: Change, cleansing, boundary, emotional depth
→ Biblical: Crossing the Red Sea (Exodus 14), Baptism (Matthew 3:16)
→ Archetype: The Journey (crossing a threshold)
→ [Only add gematria if asked or if river was specifically mentioned as "40 cubits"]
```

### Reading Level Application

**Prompt modifiers** for each reading level are in `reading-levels.json`:

- **RADIANT_CLARITY**: Add to prompt: *"Use only simple words. Keep sentences short. Be warm and encouraging."*
- **CELESTIAL_INSIGHT**: Default prompt modifier (used unless other level selected)
- **PROPHETIC_WISDOM**: Add to prompt: *"Provide theological depth. Include original language insights. Assume biblical knowledge."*
- **DIVINE_REVELATION**: Add to prompt: *"Use academic language. Include hermeneutical analysis. Provide extensive cross-references."*

### Symbol Lookup Pattern

When analyzing a dream:

```javascript
// 1. Identify symbols in dream narrative
const symbolsInDream = ["water", "bridge", "stranger"];

// 2. Load dream-symbols.json
// 3. Look up each symbol
// 4. Apply reading level from reading-levels.json
// 5. Filter biblical references relevant to dream's emotional tone
// 6. Load archetype patterns from archetypes.json
// 7. Compose response with progressive disclosure
```

### Theme-Based Analysis

When a dream carries emotional weight:

1. **Identify the primary theme** - What is the dreamer seeking?
   - Guidance? Load Guidance/Direction references
   - Reassurance? Load Promise/Hope references
   - Warning? Load Warning/Danger references

2. **Cross-reference with symbols** - Do the symbols and theme align?
3. **Load bible-crossrefs.json** for that theme
4. **Select most relevant verses** for the dreamer's context
5. **Explain the connection** in the reading level chosen

---

## Reference Files

### dream-symbols.json
- **Scope**: 40-50 common dream symbols organized by category
- **Update frequency**: Quarterly (as patterns emerge)
- **Usage**: Primary lookup for any identified symbol
- **Structure**: Array of symbol objects

### bible-crossrefs.json
- **Scope**: 14 core dream themes with primary and related verses
- **Update frequency**: As new biblical patterns emerge
- **Usage**: Context-aware scripture matching
- **Structure**: Array of theme objects

### reading-levels.json
- **Scope**: 4 tier definitions with prompt modifiers
- **Update frequency**: Rarely (stable framework)
- **Usage**: Adapt output complexity for user capability
- **Structure**: Array of reading level objects

### archetypes.json
- **Scope**: 12 Jungian archetypes with dream manifestations
- **Update frequency**: As psychological research informs interpretation
- **Usage**: Psychological enrichment layer
- **Structure**: Array of archetype objects

---

## Composition Guidelines

### With dreamlink-analysis Skill
The analysis skill handles the computational dream parsing. This skill provides:
- Symbol definitions to analyze against
- Reading level for output adaptation
- Biblical theme context for deeper meaning

### With dreamlink-guidance Skill
The guidance skill generates advice. This skill provides:
- Actionable interpretations from symbols
- Biblical wisdom relevant to the dream
- Appropriate reading level

### With dreamlink-interpretation Skill
The interpretation skill layers meaning. This skill provides:
- Full symbol taxonomy
- Jungian depth layers
- Gematria and numerology (when relevant)

---

## Key Principles

1. **Context drives selection** - Don't load all references; load what's relevant
2. **Reading level is critical** - A RADIANT_CLARITY explanation of "Babylon" is very different from DIVINE_REVELATION
3. **Progressive disclosure** - Layer information rather than overwhelming
4. **Biblical first** - Scripture is the primary authority in Dreamlink interpretations
5. **Psychology second** - Jungian archetypes enrich but don't override biblical meaning
6. **Gematria carefully** - Numerology is interesting but secondary to literal meaning
7. **Respect the dreamer** - Interpretations should encourage, challenge appropriately, and respect autonomy

---

## Example Integration

When a user provides a dream:

```
Dream: "I was climbing a mountain made of stone, and there was a door at the top."

1. Symbol identification: Mountain, Stone, Door
2. Emotional tone: Determined, hopeful (suggests Guidance/Direction theme)
3. Reading level: CELESTIAL_INSIGHT (user's preference)

3. Load references:
   - dream-symbols.json: Mountain, Stone, Door entries
   - bible-crossrefs.json: Guidance/Direction theme
   - reading-levels.json: CELESTIAL_INSIGHT modifiers

4. Compose response:
   - "Mountains in dreams often represent challenges or spiritual elevation..."
   - "In scripture, Mt. Sinai (Exodus 19), Mt. Moriah (Genesis 22)..."
   - "The door suggests a threshold or new opportunity..."
   - "Psychologically, the Hero archetype appears here - your journey toward transformation..."

5. Inject reading level:
   - Use CELESTIAL_INSIGHT vocabulary throughout
   - Include balanced detail with analogies
   - Mix practical and spiritual perspective
```

---

## Maintenance

### Adding New Symbols
1. Research common dream symbol (consult dream dictionaries, Jung, Freud)
2. Find biblical parallels (concordance search)
3. Determine emotional valence (cultural context matters)
4. Add archetype if applicable
5. Format as JSON object and add to dream-symbols.json

### Updating Themes
1. Identify recurring dream patterns from user feedback
2. Research corresponding biblical themes
3. Add primary and related verses with context
4. Update bible-crossrefs.json

### Verifying References
All biblical references are verified against:
- English Standard Version (ESV)
- King James Version (KJV)
- Hebrew original text (for gematria/OT)
- Greek original text (for NT)

---

## Notes for Future Skills

When building skills that compose with this one:

- **Always check reading level first** before generating any output
- **Use `dream-symbols.json` as authoritative** - don't generate symbol meanings
- **Prefer biblical references** from `bible-crossrefs.json` - they're curated
- **Layer archetypes carefully** - don't force psychological patterns onto scripture
- **Respect gematria boundaries** - it's supplementary, not primary
- **Load progressively** - only request references you'll actually use
