import { describe, it, expect } from "vitest";
import {
  BLOG_COVER_STYLE,
  FALLBACK_SCENE,
  MAX_SCENE_CHARS,
  buildBlogCoverPrompt,
  seedFromSlug,
  truncateScene,
} from "@/schema/blogCover";

// The property that makes a set of covers look like one publication is that
// every prompt ends with the same style clause, and the only thing that varies
// is the scene at the front. These tests pin that shape, because it is easy to
// "improve" the prompt builder in a way that quietly lets the style drift.

describe("buildBlogCoverPrompt", () => {
  it("puts the article scene first and the house style after it", () => {
    const prompt = buildBlogCoverPrompt("A lone figure on a valley path at dawn");

    expect(prompt.startsWith("A lone figure on a valley path at dawn.")).toBe(true);
    expect(prompt).toContain(BLOG_COVER_STYLE.scene);
    expect(prompt).toContain(BLOG_COVER_STYLE.styleAnnotation);
    expect(prompt.indexOf("valley path")).toBeLessThan(
      prompt.indexOf(BLOG_COVER_STYLE.styleAnnotation),
    );
  });

  it("gives different articles the same style clause", () => {
    const a = buildBlogCoverPrompt("An empty chair beside a window");
    const b = buildBlogCoverPrompt("A river splitting around a stone");

    expect(a).not.toBe(b);
    for (const shared of [BLOG_COVER_STYLE.scene, BLOG_COVER_STYLE.styleAnnotation]) {
      expect(a).toContain(shared);
      expect(b).toContain(shared);
    }
  });

  // FLUX renders lettering whenever a prompt implies it, and a cover derived
  // from a headline is exactly the case that invites fake words onto a book
  // spine or a sign.
  it("always forbids text in the image", () => {
    expect(buildBlogCoverPrompt("A signpost at a crossroads")).toMatch(
      /no text, letters, numerals, captions, signage/i,
    );
  });

  it("falls back to the house scene when given nothing usable", () => {
    expect(buildBlogCoverPrompt("")).toContain(FALLBACK_SCENE);
    expect(buildBlogCoverPrompt("   ")).toContain(FALLBACK_SCENE);
  });

  it("strips a trailing period so the prompt does not double up", () => {
    expect(buildBlogCoverPrompt("A candle on a stone ledge.")).toContain(
      "A candle on a stone ledge. ",
    );
    expect(buildBlogCoverPrompt("A candle on a stone ledge.")).not.toContain("..");
  });
});

describe("truncateScene", () => {
  // A long subject crowds out the style annotation, and the annotation is the
  // only thing making separate covers look related.
  it("caps the scene so the style clause stays dominant", () => {
    const long = "a ".repeat(400);
    expect(truncateScene(long).length).toBeLessThanOrEqual(MAX_SCENE_CHARS);
  });

  it("cuts at a word boundary rather than mid-word", () => {
    const long = `${"word ".repeat(60)}unmistakeable`;
    const cut = truncateScene(long);
    expect(cut.endsWith("word")).toBe(true);
    expect(cut).not.toMatch(/\s$/);
  });

  it("leaves a short scene alone", () => {
    expect(truncateScene("  A kettle steaming on a windowsill  ")).toBe(
      "A kettle steaming on a windowsill",
    );
  });
});

describe("seedFromSlug", () => {
  // Without a stable seed, an accidental regeneration silently reshuffles the
  // art on an already-published post.
  it("is stable for the same slug", () => {
    expect(seedFromSlug("dreams-in-scripture")).toBe(
      seedFromSlug("dreams-in-scripture"),
    );
  });

  it("differs between slugs", () => {
    expect(seedFromSlug("dreams-in-scripture")).not.toBe(
      seedFromSlug("dreams-in-scripture-part-2"),
    );
  });

  it("stays a non-negative 32-bit integer, which is what BFL accepts", () => {
    for (const slug of ["a", "", "a-much-longer-slug-with-many-parts", "z".repeat(200)]) {
      const seed = seedFromSlug(slug);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
    }
  });
});
