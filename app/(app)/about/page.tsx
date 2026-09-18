// /about — the trust page. Copy by Justin (Sep 2026), rendered as markdown
// sections so it stays easy to edit. Each major section carries an id, so
// deep links like /about#biblical-discernment work today and any section can
// graduate into its own page later (the "trust architecture" plan) without
// breaking links.

import type { Metadata } from "next";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SITE_URL } from "@/lib/blog";

export const metadata: Metadata = {
  title: "About DreamRiver — Dream journaling, patterns, and discernment",
  description:
    "DreamRiver is a private dream journal built around one idea: your dreams mean more when you can see the story they form over time. Reflection, not divination.",
  alternates: { canonical: `${SITE_URL}/about` },
};

interface Section {
  id: string;
  md: string;
}

const INTRO = `
DreamRiver is a private dream journaling and personal insight platform designed to help you record your dreams, explore them thoughtfully, and recognize meaningful patterns across your dream history.

Most dream tools begin and end with a single question:

> "What does this dream mean?"

DreamRiver was built around a different question:

> "What can I learn when I look at my dreams together over time?"

A single dream may be interesting. But recurring people, places, symbols, emotions, circumstances, and themes can become more meaningful when viewed in the context of your own history.

That is where DreamRiver is designed to help.
`;

const SECTIONS: Section[] = [
  {
    id: "dream-intelligence",
    md: `
## From dream interpretation to dream intelligence

DreamRiver combines dream journaling, contextual reflection, pattern recognition, and AI-assisted analysis to help you build a growing record of your dream life.

Instead of treating every dream as an isolated event, DreamRiver is designed to help you notice connections across your personal dream history. As your journal grows, you may begin to recognize:

- recurring symbols, people, places, and themes
- emotional patterns that appear across different dreams
- connections between dreams separated by weeks or months
- changes in recurring dream imagery over time
- relationships between your dreams and the circumstances you were experiencing when you recorded them

The goal isn't simply to produce another interpretation. The goal is to help you understand your own dream journey more clearly over time.
`,
  },
  {
    id: "context",
    md: `
## Dreams deserve context

DreamRiver does not operate like a traditional dream dictionary where every symbol is assigned a fixed meaning.

A river does not necessarily mean the same thing for every person. Neither does a house, snake, child, storm, mountain, road, death, wedding, or any other image that may appear in a dream.

Context matters. Your emotions matter. Your experiences matter. Your personal associations matter. And when a symbol appears repeatedly across your own dream history, that history matters too.

Rather than asking only, "What does this symbol mean?", we encourage a better set of questions:

- What was happening in the dream?
- How did you feel?
- What does this symbol mean to you personally?
- Has it appeared before?
- What was happening in your life when similar dreams occurred?

These questions turn dream interpretation into thoughtful reflection rather than formula.
`,
  },
  {
    id: "editorial-standards",
    md: `
## A more thoughtful Dream Symbol Library

The [DreamRiver Dream Symbol Library](/blog) extends that same philosophy to our educational content.

Our goal is not to build another collection of simplistic statements such as "If you dream about X, it means Y."

Instead, DreamRiver explores dream imagery through multiple relevant perspectives, which may include psychology, sleep and dream research, history, culture, personal association, common interpretations, and biblical context.

When discussing scientific or historical claims, we prioritize credible sources such as peer-reviewed research, recognized institutions, primary texts, universities, and established scholarly references. Different perspectives are clearly identified rather than presented as interchangeable facts.

The result is a library designed to help you ask better questions about your dreams — not tell you what you must believe about them.
`,
  },
  {
    id: "biblical-discernment",
    md: `
## Biblical reflection without divination

For users who desire it, DreamRiver also provides biblical context and reflection. We believe this requires humility and clear boundaries.

DreamRiver does not practice or promote divination, fortune-telling, omen reading, or attempts to predict the future through dream symbols.

DreamRiver does not claim that every dream is a message from God. We do not teach that symbols have universal spiritual meanings, and we do not claim that artificial intelligence can determine God's will or speak with divine authority.

Biblical references and AI-assisted reflections are intended to support thoughtful discernment — not replace Scripture, prayer, conscience, wise counsel, pastoral guidance, or personal responsibility.

DreamRiver provides tools for reflection and discernment. It does not provide revelation.
`,
  },
  {
    id: "ai",
    md: `
## AI should help you reflect — not pretend to know everything

Artificial intelligence makes it possible to organize and examine large amounts of information in ways that were previously difficult for an individual dreamer. But AI also has limitations, and DreamRiver is intentionally designed around them.

Our AI-generated insights should be understood as possibilities for reflection rather than declarations of certainty. An interpretation may identify themes, connections, questions, or patterns worth considering, but you remain responsible for evaluating whether those observations are meaningful to you.

The longer-term purpose of DreamRiver is not to make AI the authority over your dreams. It is to make your own dream history more understandable and useful to you.
`,
  },
  {
    id: "your-story",
    md: `
## Built around your story

DreamRiver was created from a simple realization: the most valuable dream dictionary may eventually be your own.

Over time, your journal can become something no generic dream dictionary can reproduce — a record of your own recurring imagery, experiences, associations, emotions, and patterns. DreamRiver is being built to help you preserve and understand that record.

A symbol that means very little in isolation may become significant when you discover that it has appeared seven times. A recurring location may take on new context when you can see the dreams in which it previously appeared. A theme that felt random may look different when viewed across months or years.

This is the foundation of what we call **Dream Intelligence**: using your growing dream history to help surface patterns and context that are difficult to recognize one dream at a time.
`,
  },
  {
    id: "privacy",
    md: `
## Privacy matters

Dreams can contain deeply personal information. DreamRiver is therefore designed with privacy and user control as core considerations rather than afterthoughts.

Your dream journal exists to serve you. We do not believe private dreams should become public content simply because they are processed by technology.

Our approach to product development emphasizes responsible handling of personal information, clear user controls, and transparency about how DreamRiver and its AI-assisted features work. For specific information about how data is collected, processed, stored, and deleted, please review our [Privacy Policy](/privacy).
`,
  },
  {
    id: "why",
    md: `
## Why DreamRiver exists

People have recorded and wrestled with dreams for thousands of years. Technology has changed dramatically. The human desire to remember, examine, and understand our dreams has not.

DreamRiver exists to bring those two worlds together thoughtfully. We are building a place where someone can wake from a dream, capture it before it disappears, explore it without being handed simplistic answers, preserve it as part of a growing personal history, and return months or years later to discover connections they could not have seen before.

**Record the dream. Preserve the memory. Recognize the patterns. Understand the journey.**

That is DreamRiver.
`,
  },
];

// The trust-architecture row: every destination here exists today. Sections
// of this page (#editorial-standards, #biblical-discernment) stand in for
// future standalone pages, so these links keep working if/when they split out.
const EXPLORE: Array<{ href: string; label: string }> = [
  { href: "/landing#how-it-works", label: "How DreamRiver works" },
  { href: "/about#biblical-discernment", label: "Biblical discernment" },
  { href: "/about#editorial-standards", label: "Editorial standards" },
  { href: "/blog", label: "Dream Symbol Library" },
  { href: "/privacy", label: "Privacy" },
];

export default function AboutPage() {
  return (
    <div className="flex-1 w-full flex flex-col items-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <header className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            About DreamRiver
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl leading-tight mt-3">
            Your dreams are more than isolated moments.
          </h1>
          <p className="text-muted-foreground text-lg mt-4 leading-relaxed">
            DreamRiver helps you see the story they form over time.
          </p>
        </header>

        {/* .prose-blog spaces via a direct-child combinator, so the class
            goes on each section wrapper — not one outer article — or the
            markdown inside the sections would collapse together. */}
        <article className="mt-10">
          <div className="prose-blog">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{INTRO}</ReactMarkdown>
          </div>
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="prose-blog scroll-mt-24 mt-9">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.md}</ReactMarkdown>
            </section>
          ))}
        </article>

        {/* Trust links — About is the hub, not the only trust page */}
        <nav
          aria-label="Learn more about DreamRiver"
          className="mt-12 rounded-2xl border bg-card p-6"
        >
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
            Go deeper
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {EXPLORE.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-primary underline underline-offset-4 hover:text-primary-hover"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="pt-8 text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; Back to journal
          </Link>
        </div>
      </div>
    </div>
  );
}
