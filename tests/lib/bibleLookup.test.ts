import { describe, it, expect } from "vitest";
import { normalizeCitation, lookupVerse } from "@/lib/bibleLookup";

// This file replaces tests/utils/citations.test.ts and
// tests/utils/parseCitation.test.ts, which exercised utils/citations.ts — a
// module with no callers anywhere in the app, superseded by this one. Those
// tests were red because the module they covered was genuinely broken: its
// book pattern was /^([a-zA-Z\s]+)\s+\d+:\d+/, which excludes digits, so every
// numbered book (1 Kings, 2 Samuel, 1 Corinthians — roughly a third of the
// canon) parsed as null, and it had no notion of which book names are real, so
// "Invalid 2:3" parsed happily. Both behaviours are pinned below against the
// implementation the app actually calls.

describe("lookupVerse", () => {
  it("resolves a simple citation to its verse text", () => {
    const result = lookupVerse("Genesis 1:1");
    expect(result.status).toBe("found");
    expect(result.normalizedRef).toBe("Genesis 1:1");
    expect(result.text).toContain("In the beginning God created");
  });

  // The exact case the replaced module got wrong.
  it.each([
    ["1 Kings 6:19", "1 Kings 6:19"],
    ["1 Corinthians 13:4", "1 Corinthians 13:4"],
    ["2 Samuel 7:12", "2 Samuel 7:12"],
    ["3 John 1:4", "3 John 1:4"],
  ])("resolves numbered book %s", (input, normalized) => {
    const result = lookupVerse(input);
    expect(result.status).toBe("found");
    expect(result.normalizedRef).toBe(normalized);
    expect(result.text).not.toBe("");
  });

  it("resolves multi-word book names", () => {
    const result = lookupVerse("Song of Solomon 2:1");
    expect(result.status).toBe("found");
    expect(result.text).toContain("rose of Sharon");
  });

  it("resolves abbreviations and roman numerals to canonical names", () => {
    expect(lookupVerse("2 Sam 7:12").normalizedRef).toBe("2 Samuel 7:12");
    expect(lookupVerse("1 Kgs 6:19").normalizedRef).toBe("1 Kings 6:19");
    expect(lookupVerse("II Timothy 1:7").normalizedRef).toBe("2 Timothy 1:7");
  });

  // Regression: roman numeral + abbreviation matched neither alias map, so this
  // came back not_found even though normalizeCitation's docstring gives it as a
  // worked example.
  it("resolves a roman numeral combined with an abbreviation", () => {
    const result = lookupVerse("II Tim. 1:7");
    expect(result.status).toBe("found");
    expect(result.normalizedRef).toBe("2 Timothy 1:7");
    expect(result.text).toContain("spirit of fear");
  });

  it("carries a verse range through to the text", () => {
    const result = lookupVerse("Psalms 23:4-6");
    expect(result.status).toBe("found");
    expect(result.normalizedRef).toBe("Psalms 23:4-6");
    expect(result.endVerse).toBe(6);
  });

  // Models emit en-dashes and zero-width characters inside citations; without
  // sanitizing, a semantically fine reference silently loses its verse text.
  it("survives punctuation models actually emit", () => {
    expect(lookupVerse("Lamentations 3:22–23").normalizedRef).toBe(
      "Lamentations 3:22-23",
    );
    expect(lookupVerse("John 6:35﻿").status).toBe("found");
    expect(lookupVerse("(Titus 3:5)").status).toBe("found");
  });

  it("rejects a book that is not in the canon", () => {
    // The replaced module accepted this, because any word-shaped token passed
    // as a book name.
    const result = lookupVerse("Invalid 2:3");
    expect(result.status).toBe("not_found");
    expect(result.text).toBe("");
  });

  it("rejects a real book with an out-of-range chapter", () => {
    expect(lookupVerse("Genesis 999:1").status).toBe("not_found");
  });

  it("rejects text that is not a citation at all", () => {
    expect(lookupVerse("see the notes above").status).toBe("not_found");
    expect(lookupVerse("").status).toBe("not_found");
  });
});

describe("normalizeCitation", () => {
  it("canonicalizes book-name variants without touching the verse index", () => {
    expect(normalizeCitation("Psalm 23:4")).toBe("Psalms 23:4");
    expect(normalizeCitation("2 Sam 7:12")).toBe("2 Samuel 7:12");
    expect(normalizeCitation("II Tim. 1:7")).toBe("2 Timothy 1:7");
  });

  it("normalizes spacing around chapter and verse", () => {
    expect(normalizeCitation("Genesis 1 : 1")).toBe("Genesis 1:1");
  });

  it("returns the input unchanged when it does not parse", () => {
    expect(normalizeCitation("not a citation")).toBe("not a citation");
    expect(normalizeCitation("Invalid 2:3")).toBe("Invalid 2:3");
  });
});
