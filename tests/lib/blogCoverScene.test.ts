import { describe, it, expect, vi, beforeEach } from "vitest";
import { FALLBACK_SCENE, MAX_SCENE_CHARS } from "@/schema/blogCover";

const create = vi.fn(async () => ({
  choices: [{ message: { content: "A lone figure on a narrow valley path at first light" } }],
}));

vi.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({ chat: { completions: { create } } }),
  OPENAI_MODEL: "gpt-test",
  modelTuning: () => ({ temperature: 0.9 }),
}));

async function extract(input: Parameters<
  typeof import("@/lib/blogCoverScene").extractCoverScene
>[0]) {
  const { extractCoverScene } = await import("@/lib/blogCoverScene");
  return extractCoverScene(input);
}

describe("extractCoverScene", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockImplementation(async () => ({
      choices: [
        { message: { content: "A lone figure on a narrow valley path at first light" } },
      ],
    }));
  });

  it("returns the model's scene", async () => {
    const result = await extract({ title: "On Grief and Psalm 23" });
    expect(result.scene).toBe("A lone figure on a narrow valley path at first light");
    expect(result.fallback).toBe(false);
  });

  // Models wrap the sentence in quotes despite being told not to, and that
  // punctuation would otherwise survive into the image prompt.
  it("strips quotes the model adds anyway", async () => {
    create.mockImplementation(async () => ({
      choices: [{ message: { content: '  "An empty chair beside a window"  ' } }],
    }));
    const result = await extract({ title: "Waiting" });
    expect(result.scene).toBe("An empty chair beside a window");
  });

  it("caps an overlong scene", async () => {
    create.mockImplementation(async () => ({
      choices: [{ message: { content: "a ".repeat(400) } }],
    }));
    const result = await extract({ title: "Long" });
    expect(result.scene.length).toBeLessThanOrEqual(MAX_SCENE_CHARS);
  });

  // A cover is a nice-to-have. A failed model call must not be able to block
  // saving or importing a post.
  it("falls back instead of throwing when the model errors", async () => {
    create.mockImplementation(async () => {
      throw new Error("upstream is down");
    });
    const result = await extract({ title: "Anything" });
    expect(result.scene).toBe(FALLBACK_SCENE);
    expect(result.fallback).toBe(true);
  });

  it("falls back when the model returns nothing usable", async () => {
    create.mockImplementation(async () => ({ choices: [{ message: { content: "   " } }] }));
    const result = await extract({ title: "Anything" });
    expect(result.fallback).toBe(true);
  });

  it("does not call the model without a title", async () => {
    const result = await extract({ title: "   " });
    expect(result.scene).toBe(FALLBACK_SCENE);
    expect(create).not.toHaveBeenCalled();
  });

  // Image and link URLs are noise that occasionally leaks into the output as
  // scene detail, and code fences are never the subject of a cover.
  it("strips markdown noise before sending the article", async () => {
    await extract({
      title: "Formatting",
      contentMd:
        "# Heading\n\n![alt](https://example.com/a.png)\n\n[link text](https://example.com)\n\n```ts\nconst x = 1;\n```\n\nReal prose here.",
    });

    const sent = create.mock.calls[0][0].messages[1].content as string;
    expect(sent).toContain("Real prose here.");
    expect(sent).toContain("link text");
    expect(sent).not.toContain("https://example.com");
    expect(sent).not.toContain("const x = 1");
    expect(sent).not.toContain("# Heading");
  });

  it("includes the excerpt when there is one", async () => {
    await extract({ title: "T", excerpt: "A short standfirst" });
    const sent = create.mock.calls[0][0].messages[1].content as string;
    expect(sent).toContain("A short standfirst");
  });
});
