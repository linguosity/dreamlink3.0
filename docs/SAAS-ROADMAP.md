# DreamRiver SaaS Roadmap

**Inspired by Mike Hill's 10-Step Playbook** — *"I Built 3 SaaS Apps to $200K MRR"*

> Mike Hill bootstrapped 5 SaaS apps (Curator.io, Frill.co, Juno.co, and more) to $200K+ MRR without funding, using a repeatable framework. This roadmap maps his playbook to DreamRiver's current stage and next moves.

**Last updated:** March 31, 2026

---

## At a Glance

| Phase | Mike's Step | DreamRiver Status |
|-------|------------|-------------------|
| 1. Pick an Idea | Choose a proven market | ✅ Done |
| 2. Define MVP | Scope "good enough" | ✅ Done |
| 3. Build & Ship | Launch quickly, charge from day 1 | 🔄 In Progress |
| 4. Engage Customers | Feedback loop with paying users | ⬜ Upcoming |
| 5. Content & SEO | Write from day one | ⬜ Upcoming |
| 6. Private Lifetime Deal | Raise ~$30-100K early capital | ⬜ Upcoming |
| 7. AppSumo Launch | Massive reach + user acquisition | ⬜ Future |
| 8. Final LTD Push | Close the deal window with urgency | ⬜ Future |
| 9. Reviews & Social Proof | Trustpilot, G2, app stores | ⬜ Future |
| 10. Reddit & Community | Authentic engagement at scale | ⬜ Future |

---

## Phase 1: Pick an Idea

### Mike's Playbook
Pick an idea that has been done before. Choosing an existing business model validates that a market exists and people are willing to pay. Analyze competitors to understand what features customers want most. The goal is to build something that *cannot fail* — not something novel.

### DreamRiver
✅ **Done.** Dream journaling apps exist (DreamApp, DreamMoods, Dreamboard). The market is validated. DreamRiver's differentiation is the faith-based/biblical analysis angle — a proven niche (faith-based apps like Pray.com, Abide, and Hallow have raised hundreds of millions). We're not inventing a category; we're serving an underserved segment of an existing one.

**Key insight applied:** We're in a "red ocean" (existing market) with a clear wedge (biblical dream interpretation powered by AI).

---

## Phase 2: Define MVP

### Mike's Playbook
Determine what "good enough" looks like. The bar for MVPs is much higher today — it needs to be polished enough that people will pay from day one. Study competitors' core features and build only what matters. Don't over-scope.

### DreamRiver
✅ **Done.** Core MVP is live:
- Dream text input with AI analysis (OpenAI-powered)
- Biblical references and verse integration
- AI-generated dream imagery (FLUX model)
- Dream gallery with search
- Reading level customization (4 tiers)
- Admin prompt editing system
- User accounts with Supabase auth

**What we intentionally left out (for now):** social/community features, dream pattern tracking over time, mobile app, dream sharing to social media (beyond basic share links), premium tiers.

---

## Phase 3: Build & Ship

### Mike's Playbook
Build the MVP swiftly. Critically: **charge from day one**. Don't give away free accounts — even early adopters should pay (via lifetime deal). This filters for serious users who give better feedback. Ship fast, iterate based on real paying-user feedback.

### DreamRiver
🔄 **In Progress.** The app is deployed on Vercel and functional. Current priorities before charging:

- [ ] **Stabilize core UX** — Fix the issues flagged in testing (modal scroll, image loading, real-time analysis updates) ← *being addressed now*
- [ ] **Onboarding flow** — First-time user experience explaining the app's purpose and how to use it
- [ ] **Payment integration** — Stripe setup for subscription billing and/or lifetime deal purchases
- [ ] **Landing page polish** — Convert the `/landing` page into a high-conversion page with clear value prop, testimonials placeholder, and CTA
- [ ] **Terms of Service / Privacy Policy** — Legal pages (already have route stubs)

**Target:** Ship paywall-ready version within 2-4 weeks.

---

## Phase 4: Engage Customers

### Mike's Playbook
Actively seek feedback from paying users. This is the most crucial development stage — your early adopters tell you what to build next. Talk to every single customer. Their feedback shapes the product roadmap.

### DreamRiver — Action Items
⬜ **Upcoming.** Once we have paying users:

- [ ] **In-app feedback mechanism** — Simple "How was this analysis?" thumbs up/down on each dream interpretation
- [ ] **Email onboarding sequence** — Welcome email → Day 3 check-in → Day 7 "how's it going?" → Day 14 feature highlight
- [ ] **Direct outreach** — Personally email/message early LTD buyers asking what they'd improve
- [ ] **Feature request board** — Consider using Frill.co (Mike's own product!) or a simple feedback form
- [ ] **Dream quality scoring** — Track which analyses users engage with most to improve prompts

**Mike's principle:** "Paying users give 10x better feedback than free users."

---

## Phase 5: Content & SEO

### Mike's Playbook
Start writing content *immediately* — it's never too early. Write:
- Landing pages for each feature
- "Alternative to [Competitor]" pages
- Blog posts targeting relevant keywords
- Comparison pages

The longer content is live, the sooner Google and AI tools (ChatGPT, Perplexity) index it and send organic traffic.

### DreamRiver — Action Items
⬜ **Upcoming.** High-priority content to create:

- [ ] **"Alternative to" pages:**
  - "DreamRiver vs DreamApp" / "Best DreamApp alternative for Christians"
  - "DreamRiver vs DreamMoods" / "Biblical dream interpretation app"
  - "Best AI dream journal app 2026"
- [ ] **SEO blog posts:**
  - "What does the Bible say about dreams?"
  - "Biblical meaning of common dream symbols"
  - "How to keep a spiritual dream journal"
  - "AI dream interpretation: How it works"
  - "Famous dreams in the Bible and what they mean"
- [ ] **Feature landing pages:**
  - AI-powered biblical dream analysis
  - Personalized reading levels
  - Dream image visualization
  - Private & secure dream journaling
- [ ] **Technical setup:**
  - Add a `/blog` section (MDX or CMS-backed)
  - Submit sitemap to Google Search Console
  - Set up basic analytics (Plausible or PostHog)

**Mike's principle:** "Content compounds. A blog post written today will still bring traffic 3 years from now."

---

## Phase 6: Private Lifetime Deal (LTD)

### Mike's Playbook
Run a private LTD to raise early revenue and recruit early adopters. Typical pricing: $59-$100 one-time for lifetime access. Promote in relevant Facebook groups, LTD communities (LTD Hunter, SaaS Lifetime Deals), and on X/Twitter. For Frill.co, this phase raised ~$30K.

### DreamRiver — Action Items
⬜ **Upcoming.** Plan the LTD:

- [ ] **Define LTD tiers:**
  - Tier 1 (~$49): Lifetime access, 30 dreams/month, standard reading levels
  - Tier 2 (~$79): Unlimited dreams, all reading levels, priority analysis
  - Tier 3 (~$129): Everything + early access to new features, family sharing (future)
- [ ] **Create LTD landing page** with countdown timer and limited quantity
- [ ] **Target communities:**
  - Christian Facebook groups (prayer groups, Bible study groups)
  - LTD deal communities (AppSumo Marketplace group, LTD Hunter)
  - Faith & technology crossover communities
  - r/Christianity, r/Dreams, r/SideProject
- [ ] **Set revenue target:** Aim for $10-30K to fund 6-12 months of content creation and hosting
- [ ] **Build email list** leading up to LTD launch (lead magnet: "Free Guide to Biblical Dream Symbols")

**Mike's principle:** "Never give away free accounts. Even $49 filters for people who actually care."

---

## Phase 7: AppSumo Launch

### Mike's Playbook
AppSumo has massive reach and a huge email list. Two options:
1. **Marketplace** (lower fee, self-serve)
2. **Select** (work with their sales team, higher visibility, higher fee)

Use AppSumo for reach and user acquisition, not as a long-term revenue strategy.

### DreamRiver — Action Items
⬜ **Future** (after LTD phase, ~3-6 months out):

- [ ] **Prepare AppSumo listing** — Screenshots, demo video, feature comparison
- [ ] **Plan for volume** — Ensure infrastructure can handle a spike in users (Vercel scaling, Supabase limits, OpenAI rate limits)
- [ ] **AppSumo-specific tier** — Usually 1-3 codes stackable, priced $39-$79 per code
- [ ] **Support plan** — AppSumo users ask a LOT of questions; prepare FAQ and support workflow
- [ ] **Review mining** — AppSumo reviews become social proof for later marketing

**Consideration:** AppSumo takes 60-70% on Select deals. Worth it for the exposure, but factor that into pricing.

---

## Phase 8: Final LTD Push

### Mike's Playbook
After AppSumo, run a final private LTD at slightly higher prices. This is the "last chance" before switching to recurring-only pricing. Creates urgency. Send to your email list. Then close the LTD window forever.

### DreamRiver — Action Items
⬜ **Future** (after AppSumo):

- [ ] **"Last chance" campaign** — Email sequence to existing list: "LTD closes in 72 hours"
- [ ] **Price increase** — Bump LTD tiers by 30-50% for this final round
- [ ] **Transition to subscriptions** — Finalize monthly/annual pricing:
  - Free tier: 3 dreams/month, basic analysis
  - Pro ($9.99/mo or $79/yr): Unlimited dreams, all reading levels, image generation
  - Family ($19.99/mo or $149/yr): Up to 5 accounts, shared dream journals (future)

---

## Phase 9: Reviews & Social Proof

### Mike's Playbook
Get current LTD customers to write honest reviews on Trustpilot, G2, Capterra, etc. Reviews boost domain ranking and credibility. Don't ask for fake reviews — just make it easy for happy customers to share their experience.

### DreamRiver — Action Items
⬜ **Future** (once you have 50+ paying users):

- [ ] **Trustpilot profile** — Set up and add review widget to landing page
- [ ] **App Store reviews** (when mobile app launches)
- [ ] **In-app review prompt** — After 10th dream analysis, gently ask for a review
- [ ] **Testimonial collection** — Email asking "Would you mind sharing a sentence about your experience?"
- [ ] **Case studies** — "How [User] deepened their prayer life with DreamRiver"

---

## Phase 10: Reddit & Community Engagement

### Mike's Playbook
Answer questions honestly and authentically on Reddit and Quora. Listen to complaints about competitors. Help people. Learn what competitors get wrong. Don't spam — provide genuine value and mention your product only when directly relevant.

### DreamRiver — Action Items
⬜ **Future** (ongoing):

- [ ] **Monitor subreddits:** r/Dreams, r/Christianity, r/Bible, r/DreamInterpretation, r/LucidDreaming, r/SideProject
- [ ] **Quora topics:** Biblical dream interpretation, dream journaling, spiritual dream meaning
- [ ] **Provide value first:** Answer questions about biblical dream symbolism, then mention DreamRiver naturally
- [ ] **Track competitor complaints** — What do users hate about existing dream apps? Build those fixes.
- [ ] **Community building** — Consider a DreamRiver Discord or private community for power users

---

## Financial Milestones

| Milestone | Target | Mike's Benchmark |
|-----------|--------|-----------------|
| First paying customer | Month 1-2 of LTD | Immediate (LTD launch) |
| $1K MRR | Month 3-4 | ~Month 2-3 |
| $5K MRR | Month 6-8 | ~Month 4-6 |
| $10K MRR | Month 9-12 | ~Month 6-9 |
| $50K MRR | Year 2 | ~Year 1-2 |
| Sustainable (covers all costs + salary) | $5-10K MRR | - |

**Mike's key insight:** "Monitor your burn rate. As LTD revenue depletes, your MRR must be growing fast enough to sustain operations. If not, cut costs — don't raise prices on existing customers."

---

## DreamRiver's Competitive Advantages

1. **Faith-based niche** — No major AI dream app targets Christians specifically
2. **Biblical integration** — Verse references, reading levels tuned to spiritual maturity
3. **AI-generated imagery** — Visual dream representations (most competitors are text-only)
4. **Privacy-first** — Dreams are deeply personal; we don't share or train on user data
5. **Customizable analysis depth** — 4 reading levels from accessible to seminary-level

---

## Immediate Next Steps (This Week)

1. ~~Fix UX bugs flagged in testing~~ ✅ (modal scroll, image loading, analysis refresh)
2. Set up Stripe integration for payments
3. Design LTD tier pricing
4. Begin writing first 3 SEO blog posts
5. Polish landing page with clear CTA and value proposition

---

*Roadmap based on Mike Hill's playbook. Video: [youtube.com/watch?v=67zh8_yiPh4](https://youtube.com/watch?v=67zh8_yiPh4)*
