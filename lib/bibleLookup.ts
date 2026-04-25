// lib/bibleLookup.ts
//
// Canonical KJV verse lookup. Used server-side to hydrate model-emitted
// citations with verse text from a known good source — eliminates the
// hallucination/length variance that comes from asking the model to
// reproduce verses verbatim.
//
// Public-domain text sourced from aruljohn/Bible-kjv (MIT-licensed
// repackaging of the public-domain KJV). Loaded as a static JSON file;
// the lookup index is built once at module load.
//
// IMPORTANT: this module pulls a ~5MB JSON file into the bundle. Do NOT
// import it from any Edge-runtime route. Keep imports inside Node-only
// handlers (e.g. app/api/dream-entries/route.ts).
//
// Rebuild data/kjv.json with: `python3 scripts/build-kjv.py`

import kjvRaw from "@/data/kjv.json";

interface RawVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export type VerseLookupStatus = "found" | "partial" | "not_found";

export interface VerseLookupResult {
  status: VerseLookupStatus;
  normalizedRef: string;
  book: string;
  chapter: number;
  verse: number;
  endVerse: number | null;
  text: string;
}

const VERSES = kjvRaw as RawVerse[];

// Map: "Book|chapter|verse" → record. Built once at module load.
const VERSE_INDEX: Map<string, RawVerse> = (() => {
  const m = new Map<string, RawVerse>();
  for (const v of VERSES) m.set(`${v.book}|${v.chapter}|${v.verse}`, v);
  return m;
})();

const CANONICAL_BOOKS = new Set(VERSES.map((v) => v.book));

// Aliases → canonical KJV book name. Only safe, unambiguous mappings.
// We deliberately do NOT auto-resolve bare "Peter"/"John" — ambiguity
// must surface as not_found and be logged so we can see the rate.
const FULL_ALIASES: Record<string, string> = {
  psalm: "Psalms",
  "songs of solomon": "Song of Solomon",
  "song of songs": "Song of Solomon",
  canticles: "Song of Solomon",
  // Roman numerals and verbose ordinals
  "i samuel": "1 Samuel",
  "ii samuel": "2 Samuel",
  "i kings": "1 Kings",
  "ii kings": "2 Kings",
  "i chronicles": "1 Chronicles",
  "ii chronicles": "2 Chronicles",
  "i corinthians": "1 Corinthians",
  "ii corinthians": "2 Corinthians",
  "i thessalonians": "1 Thessalonians",
  "ii thessalonians": "2 Thessalonians",
  "i timothy": "1 Timothy",
  "ii timothy": "2 Timothy",
  "i peter": "1 Peter",
  "ii peter": "2 Peter",
  "i john": "1 John",
  "ii john": "2 John",
  "iii john": "3 John",
  "first samuel": "1 Samuel",
  "second samuel": "2 Samuel",
  "first kings": "1 Kings",
  "second kings": "2 Kings",
  "first chronicles": "1 Chronicles",
  "second chronicles": "2 Chronicles",
  "first corinthians": "1 Corinthians",
  "second corinthians": "2 Corinthians",
  "first thessalonians": "1 Thessalonians",
  "second thessalonians": "2 Thessalonians",
  "first timothy": "1 Timothy",
  "second timothy": "2 Timothy",
  "first peter": "1 Peter",
  "second peter": "2 Peter",
  "first john": "1 John",
  "second john": "2 John",
  "third john": "3 John",
  // Concatenated digit forms
  "1samuel": "1 Samuel",
  "2samuel": "2 Samuel",
  "1kings": "1 Kings",
  "2kings": "2 Kings",
  "1chronicles": "1 Chronicles",
  "2chronicles": "2 Chronicles",
  "1corinthians": "1 Corinthians",
  "2corinthians": "2 Corinthians",
  "1thessalonians": "1 Thessalonians",
  "2thessalonians": "2 Thessalonians",
  "1timothy": "1 Timothy",
  "2timothy": "2 Timothy",
  "1peter": "1 Peter",
  "2peter": "2 Peter",
  "1john": "1 John",
  "2john": "2 John",
  "3john": "3 John",
  // Common numbered abbreviations (period stripped before lookup)
  "1 sam": "1 Samuel", "2 sam": "2 Samuel",
  "1 ki": "1 Kings", "2 ki": "2 Kings",
  "1 kgs": "1 Kings", "2 kgs": "2 Kings",
  "1 chr": "1 Chronicles", "2 chr": "2 Chronicles",
  "1 chron": "1 Chronicles", "2 chron": "2 Chronicles",
  "1 cor": "1 Corinthians", "2 cor": "2 Corinthians",
  "1 thess": "1 Thessalonians", "2 thess": "2 Thessalonians",
  "1 thes": "1 Thessalonians", "2 thes": "2 Thessalonians",
  "1 tim": "1 Timothy", "2 tim": "2 Timothy",
  "1 pet": "1 Peter", "2 pet": "2 Peter",
  "1 pe": "1 Peter", "2 pe": "2 Peter",
  "1 jn": "1 John", "2 jn": "2 John", "3 jn": "3 John",
  "1 jhn": "1 John", "2 jhn": "2 John", "3 jhn": "3 John",
};

const SHORT_ALIASES: Record<string, string> = {
  gen: "Genesis", exo: "Exodus", lev: "Leviticus", num: "Numbers",
  deu: "Deuteronomy", deut: "Deuteronomy", jos: "Joshua", jdg: "Judges",
  rut: "Ruth", ezr: "Ezra", neh: "Nehemiah", est: "Esther",
  psa: "Psalms", ps: "Psalms", pro: "Proverbs", prov: "Proverbs",
  ecc: "Ecclesiastes", sos: "Song of Solomon",
  isa: "Isaiah", jer: "Jeremiah", lam: "Lamentations",
  eze: "Ezekiel", ezk: "Ezekiel", dan: "Daniel", hos: "Hosea",
  joe: "Joel", amo: "Amos", oba: "Obadiah", jon: "Jonah",
  mic: "Micah", nah: "Nahum", hab: "Habakkuk", zep: "Zephaniah",
  hag: "Haggai", zec: "Zechariah", mal: "Malachi",
  mat: "Matthew", matt: "Matthew", mar: "Mark", mrk: "Mark",
  luk: "Luke", jhn: "John", jn: "John", act: "Acts",
  rom: "Romans", gal: "Galatians", eph: "Ephesians",
  php: "Philippians", phil: "Philippians", col: "Colossians",
  tit: "Titus", phm: "Philemon", phlm: "Philemon",
  heb: "Hebrews", jas: "James", rev: "Revelation",
};

function normalizeBook(rawBook: string): string | null {
  const cleaned = rawBook
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();

  for (const b of CANONICAL_BOOKS) {
    if (b.toLowerCase() === cleaned) return b;
  }
  if (FULL_ALIASES[cleaned]) return FULL_ALIASES[cleaned];
  if (SHORT_ALIASES[cleaned]) return SHORT_ALIASES[cleaned];
  return null;
}

// Matches "Genesis 1:1", "1 Peter 5:8", "1 Pet. 5:8", "Genesis 1:1-3",
// with optional surrounding parens/whitespace. Periods inside book names
// are allowed; normalizeBook strips them before alias lookup.
const REF_RE =
  /^\(?\s*((?:[1-3]\s+)?[A-Za-z][A-Za-z.\s]*?)\s+(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?\s*\)?$/;

export function lookupVerse(rawCitation: string): VerseLookupResult {
  const citation = (rawCitation ?? "").trim();
  const match = citation.match(REF_RE);

  if (!match) {
    return {
      status: "not_found",
      normalizedRef: citation,
      book: "",
      chapter: 0,
      verse: 0,
      endVerse: null,
      text: "",
    };
  }

  const [, rawBook, chapterStr, verseStr, endVerseStr] = match;
  const book = normalizeBook(rawBook);
  const chapter = Number(chapterStr);
  const verse = Number(verseStr);
  const endVerse = endVerseStr ? Number(endVerseStr) : null;

  if (!book) {
    return {
      status: "not_found",
      normalizedRef: citation,
      book: "",
      chapter,
      verse,
      endVerse,
      text: "",
    };
  }

  const normalizedRef =
    endVerse !== null && endVerse > verse
      ? `${book} ${chapter}:${verse}-${endVerse}`
      : `${book} ${chapter}:${verse}`;

  const startRecord = VERSE_INDEX.get(`${book}|${chapter}|${verse}`);
  if (!startRecord) {
    return {
      status: "not_found",
      normalizedRef,
      book,
      chapter,
      verse,
      endVerse,
      text: "",
    };
  }

  if (endVerse === null || endVerse <= verse) {
    return {
      status: "found",
      normalizedRef,
      book,
      chapter,
      verse,
      endVerse: null,
      text: startRecord.text,
    };
  }

  const parts: string[] = [];
  let missingAny = false;
  for (let v = verse; v <= endVerse; v++) {
    const rec = VERSE_INDEX.get(`${book}|${chapter}|${v}`);
    if (rec) parts.push(rec.text);
    else missingAny = true;
  }

  if (parts.length === 0) {
    return {
      status: "not_found",
      normalizedRef,
      book,
      chapter,
      verse,
      endVerse,
      text: "",
    };
  }

  return {
    status: missingAny ? "partial" : "found",
    normalizedRef,
    book,
    chapter,
    verse,
    endVerse,
    text: parts.join(" "),
  };
}
