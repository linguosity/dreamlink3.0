// lib/blogSchema.ts
//
// Structured-data helpers for blog posts. The dream-symbol articles carry a
// "## Frequently asked questions" section written as `### Question` blocks;
// extracting it into FAQPage JSON-LD makes those Q&As machine-readable for
// Google rich results and AI answer engines, which quote FAQ content heavily.
// Pure string work — safe to call on any markdown; posts without an FAQ
// section simply yield [].

export interface FaqItem {
  question: string;
  answer: string;
}

/** Markdown → plain text for JSON-LD bodies: links keep their label, emphasis
 * and inline code drop their markers. Intentionally minimal — the articles
 * use simple markdown. */
export function stripMarkdown(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [label](url) → label
    .replace(/[*_`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pull `### question` / answer pairs out of the FAQ section. The section is
 * any H2 whose text contains "frequently asked" or equals "faq"/"faqs"
 * (case-insensitive), ending at the next H2.
 */
export function extractFaq(contentMd: string): FaqItem[] {
  const lines = contentMd.replace(/\r\n/g, "\n").split("\n");
  const items: FaqItem[] = [];
  let inSection = false;
  let question: string | null = null;
  let answer: string[] = [];

  const flush = () => {
    if (question && answer.length) {
      const a = stripMarkdown(answer.join(" "));
      if (a) items.push({ question: stripMarkdown(question), answer: a });
    }
    question = null;
    answer = [];
  };

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      const t = h2[1].trim().toLowerCase();
      if (inSection) {
        flush();
        inSection = false;
      }
      if (/frequently asked/.test(t) || t === "faq" || t === "faqs") {
        inSection = true;
      }
      continue;
    }
    if (!inSection) continue;
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      flush();
      question = h3[1].trim();
      continue;
    }
    if (question && line.trim()) answer.push(line.trim());
  }
  flush();
  return items;
}

export function faqPageJsonLd(items: FaqItem[], url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
    // Ties the FAQPage node to the article URL for engines that read both.
    url,
  };
}

/** Body word count for Article JSON-LD (markdown markers stripped roughly). */
export function bodyWordCount(contentMd: string): number {
  return stripMarkdown(contentMd).split(/\s+/).filter(Boolean).length;
}
