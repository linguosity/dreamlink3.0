"""
Dreamlink 3.0 — Product Roadmap PDF Generator
Generates a professional, non-technical-friendly roadmap document.
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from datetime import datetime
import os

# ── Colors ──────────────────────────────────────────────
BRAND_DARK    = HexColor("#1a1a2e")
BRAND_PRIMARY = HexColor("#4f46e5")  # Indigo
BRAND_LIGHT   = HexColor("#e0e7ff")
GREEN         = HexColor("#16a34a")
YELLOW        = HexColor("#ca8a04")
RED           = HexColor("#dc2626")
GRAY          = HexColor("#6b7280")
LIGHT_GRAY    = HexColor("#f3f4f6")
DARK_TEXT      = HexColor("#1f2937")
MED_TEXT       = HexColor("#4b5563")

OUTPUT_PATH = "/sessions/bold-practical-ptolemy/mnt/Linguosity/Dreamlink-Product-Roadmap.pdf"


def build_styles():
    ss = getSampleStyleSheet()

    styles = {
        "cover_title": ParagraphStyle(
            "cover_title", parent=ss["Title"],
            fontSize=32, leading=38, textColor=white,
            alignment=TA_CENTER, spaceAfter=12,
            fontName="Helvetica-Bold",
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub", parent=ss["Normal"],
            fontSize=14, leading=20, textColor=HexColor("#c7d2fe"),
            alignment=TA_CENTER, spaceAfter=6,
            fontName="Helvetica",
        ),
        "h1": ParagraphStyle(
            "h1", parent=ss["Heading1"],
            fontSize=22, leading=28, textColor=BRAND_PRIMARY,
            spaceAfter=10, spaceBefore=20,
            fontName="Helvetica-Bold",
        ),
        "h2": ParagraphStyle(
            "h2", parent=ss["Heading2"],
            fontSize=16, leading=22, textColor=BRAND_DARK,
            spaceAfter=8, spaceBefore=14,
            fontName="Helvetica-Bold",
        ),
        "h3": ParagraphStyle(
            "h3", parent=ss["Heading3"],
            fontSize=13, leading=18, textColor=MED_TEXT,
            spaceAfter=6, spaceBefore=10,
            fontName="Helvetica-Bold",
        ),
        "body": ParagraphStyle(
            "body", parent=ss["Normal"],
            fontSize=10.5, leading=16, textColor=DARK_TEXT,
            spaceAfter=8, alignment=TA_JUSTIFY,
            fontName="Helvetica",
        ),
        "body_bold": ParagraphStyle(
            "body_bold", parent=ss["Normal"],
            fontSize=10.5, leading=16, textColor=DARK_TEXT,
            spaceAfter=8, fontName="Helvetica-Bold",
        ),
        "small": ParagraphStyle(
            "small", parent=ss["Normal"],
            fontSize=9, leading=13, textColor=GRAY,
            spaceAfter=4, fontName="Helvetica",
        ),
        "toc_item": ParagraphStyle(
            "toc_item", parent=ss["Normal"],
            fontSize=12, leading=22, textColor=DARK_TEXT,
            fontName="Helvetica", leftIndent=20,
        ),
        "glossary_term": ParagraphStyle(
            "glossary_term", parent=ss["Normal"],
            fontSize=10.5, leading=16, textColor=BRAND_PRIMARY,
            spaceAfter=2, fontName="Helvetica-Bold",
        ),
        "glossary_def": ParagraphStyle(
            "glossary_def", parent=ss["Normal"],
            fontSize=10, leading=15, textColor=DARK_TEXT,
            spaceAfter=10, leftIndent=12, fontName="Helvetica",
        ),
        "table_header": ParagraphStyle(
            "table_header", parent=ss["Normal"],
            fontSize=9.5, leading=13, textColor=white,
            fontName="Helvetica-Bold",
        ),
        "table_cell": ParagraphStyle(
            "table_cell", parent=ss["Normal"],
            fontSize=9.5, leading=13, textColor=DARK_TEXT,
            fontName="Helvetica",
        ),
        "table_cell_bold": ParagraphStyle(
            "table_cell_bold", parent=ss["Normal"],
            fontSize=9.5, leading=13, textColor=DARK_TEXT,
            fontName="Helvetica-Bold",
        ),
    }
    return styles


def status_badge(text, color):
    """Return a colored status string for table cells."""
    return f'<font color="{color}">{text}</font>'


def make_cover(story, styles):
    """Cover page with brand background."""
    # Spacer to push content down
    story.append(Spacer(1, 2.5 * inch))

    # Title block (simulated with colored table background)
    cover_data = [
        [Paragraph("Dreamlink 3.0", styles["cover_title"])],
        [Paragraph("Product Roadmap", styles["cover_sub"])],
        [Spacer(1, 12)],
        [Paragraph("From Current State to Launch and Beyond", styles["cover_sub"])],
        [Spacer(1, 30)],
        [Paragraph(f"Prepared: {datetime.now().strftime('%B %d, %Y')}", styles["cover_sub"])],
        [Paragraph("Version 1.0", styles["cover_sub"])],
    ]

    cover_table = Table(cover_data, colWidths=[6.5 * inch])
    cover_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_DARK),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (0, 0), 40),
        ("BOTTOMPADDING", (0, -1), (0, -1), 40),
        ("LEFTPADDING", (0, 0), (-1, -1), 30),
        ("RIGHTPADDING", (0, 0), (-1, -1), 30),
        ("ROUNDEDCORNERS", [8, 8, 8, 8]),
    ]))
    story.append(cover_table)
    story.append(PageBreak())


def make_toc(story, styles):
    """Table of Contents."""
    story.append(Paragraph("Table of Contents", styles["h1"]))
    story.append(Spacer(1, 8))

    toc_items = [
        "1. Executive Summary",
        "2. What Dreamlink Does",
        "3. Current Status at a Glance",
        "4. Feature Tracker: What's Built, What's Not",
        "5. MVP Requirements (Minimum to Launch)",
        "6. Phase 1: Pre-Launch Essentials",
        "7. Phase 2: Launch Day Checklist",
        "8. Phase 3: Post-Launch Growth",
        "9. Phase 4: Scale and Expand",
        "10. Known Issues and Technical Debt",
        "11. Timeline Estimate",
        "12. Glossary of Terms",
    ]
    for item in toc_items:
        story.append(Paragraph(item, styles["toc_item"]))

    story.append(PageBreak())


def make_executive_summary(story, styles):
    story.append(Paragraph("1. Executive Summary", styles["h1"]))
    story.append(Paragraph(
        "Dreamlink 3.0 is a web application that helps users record their dreams, "
        "receive AI-powered dream analysis with biblical references, and generate "
        "artistic images inspired by their dreams. The app is built on modern web "
        "technology and is hosted on Vercel with a Supabase database.",
        styles["body"]
    ))
    story.append(Paragraph(
        "The core experience is functional today: users can sign up, log in, submit dreams, "
        "receive AI interpretations with Bible citations, and see AI-generated artwork. "
        "However, several systems needed for a public launch are incomplete, including "
        "payment processing, error monitoring, email notifications, and analytics. "
        "This document outlines exactly where things stand and what needs to happen before launch.",
        styles["body"]
    ))
    story.append(Spacer(1, 8))


def make_what_dreamlink_does(story, styles):
    story.append(Paragraph("2. What Dreamlink Does", styles["h1"]))
    story.append(Paragraph(
        "At its core, Dreamlink gives users a personal dream journal that does more than just "
        "store text. Here is what happens when someone uses the app:",
        styles["body"]
    ))

    steps = [
        ("<b>Sign Up / Log In</b> \u2014 Users create an account with their email and password. "
         "They receive a verification email and can reset their password if forgotten."),
        ("<b>Write a Dream</b> \u2014 The user types out their dream in a simple text box. "
         "The app automatically generates a title for it."),
        ("<b>AI Analysis</b> \u2014 The dream text is sent to OpenAI's language model, which returns "
         "a structured interpretation including a summary, key themes, a personalized message, "
         "and relevant Bible verse references."),
        ("<b>Image Generation</b> \u2014 A separate AI system (FLUX.2) creates a unique piece of "
         "artwork inspired by the dream's themes. This happens in the background so the user "
         "does not have to wait."),
        ("<b>Dream Gallery</b> \u2014 All past dreams are displayed in an animated gallery where "
         "users can browse, search, and revisit their analyses."),
        ("<b>Personalization</b> \u2014 Users can choose their preferred Bible translation, "
         "reading complexity level, and visual art style for generated images."),
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {step}", styles["body"]))

    story.append(Spacer(1, 8))


def make_status_overview(story, styles):
    story.append(Paragraph("3. Current Status at a Glance", styles["h1"]))
    story.append(Paragraph(
        "This table shows each major area of the app and its current readiness level.",
        styles["body"]
    ))

    header = [
        Paragraph("Area", styles["table_header"]),
        Paragraph("Status", styles["table_header"]),
        Paragraph("Notes", styles["table_header"]),
    ]

    rows = [
        ["User Accounts", status_badge("Complete", GREEN.hexval()), "Sign up, log in, password reset all working"],
        ["Dream Journaling", status_badge("Complete", GREEN.hexval()), "Create, view, delete dreams"],
        ["AI Dream Analysis", status_badge("Complete", GREEN.hexval()), "OpenAI integration with structured output"],
        ["Bible Citations", status_badge("Complete", GREEN.hexval()), "Auto-extracted from AI analysis, stored in database"],
        ["Image Generation", status_badge("Complete", GREEN.hexval()), "FLUX.2 creates artwork, runs in background"],
        ["User Settings", status_badge("Complete", GREEN.hexval()), "Reading level, Bible version, image style"],
        ["Dark Mode", status_badge("Complete", GREEN.hexval()), "Toggle between light and dark themes"],
        ["Admin Dashboard", status_badge("Complete", GREEN.hexval()), "User, dream, revenue, and system metrics"],
        ["Search", status_badge("Partial", YELLOW.hexval()), "Client-side keyword search works; advanced server search disabled"],
        ["Payment System", status_badge("Scaffolded", YELLOW.hexval()), "Code is ready but Stripe account not connected yet"],
        ["Error Monitoring", status_badge("Scaffolded", YELLOW.hexval()), "Error logging in place; Sentry account not connected yet"],
        ["Email Notifications", status_badge("Not Started", RED.hexval()), "No welcome emails, digests, or reminders"],
        ["Analytics", status_badge("Not Started", RED.hexval()), "No tracking of user behavior or feature usage"],
        ["Rate Limiting", status_badge("Not Started", RED.hexval()), "No protection against excessive API usage"],
    ]

    data = [header]
    for row in rows:
        data.append([
            Paragraph(row[0], styles["table_cell_bold"]),
            Paragraph(row[1], styles["table_cell"]),
            Paragraph(row[2], styles["table_cell"]),
        ])

    col_widths = [1.6 * inch, 1.0 * inch, 3.9 * inch]
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("BACKGROUND", (0, 1), (-1, -1), white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#d1d5db")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))


def make_feature_tracker(story, styles):
    story.append(Paragraph("4. Feature Tracker: What's Built, What's Not", styles["h1"]))
    story.append(Paragraph(
        "A detailed look at every feature, organized by category. "
        "This is the full inventory of what exists in the codebase today.",
        styles["body"]
    ))

    categories = [
        ("Authentication and Accounts", [
            ("Email/password sign-up with verification", "Done"),
            ("Sign-in and sign-out", "Done"),
            ("Forgot password / reset password", "Done"),
            ("Auto-create user profile on sign-up", "Done"),
            ("Social login (Google, Apple, etc.)", "Not Started"),
        ]),
        ("Core Dream Features", [
            ("Submit a dream (text input)", "Done"),
            ("Auto-generate dream title", "Done"),
            ("AI dream analysis with structured output", "Done"),
            ("Bible citation extraction and storage", "Done"),
            ("AI image generation (FLUX.2)", "Done"),
            ("Dream gallery with animations", "Done"),
            ("Dream detail view", "Done"),
            ("Delete a dream (cascades to citations)", "Done"),
            ("Edit a dream after submission", "Not Started"),
            ("Re-analyze dream with different settings", "Not Started"),
            ("Favorite or bookmark dreams", "Not Started"),
        ]),
        ("Personalization", [
            ("Reading level selection (4 tiers)", "Done"),
            ("Bible version selection (KJV, NIV, ESV, NKJV)", "Done"),
            ("Image art style selection (8 styles, tiered)", "Done"),
            ("Language preference", "Done"),
            ("Email notification preferences (UI only)", "Done"),
        ]),
        ("Search", [
            ("Client-side keyword filtering", "Done"),
            ("Multi-keyword search (AND logic)", "Done"),
            ("Server-side full-text search", "Disabled"),
            ("Search by date range", "Not Started"),
        ]),
        ("Admin Dashboard", [
            ("Overview page with key metrics", "Done"),
            ("Users page with activity table", "Done"),
            ("Dreams analytics page", "Done"),
            ("Revenue and subscription page", "Done"),
            ("System health and environment status", "Done"),
            ("Admin-only route protection", "Done"),
        ]),
        ("Payments and Subscriptions", [
            ("Database tables for subscriptions and payments", "Done"),
            ("Stripe checkout session API", "Scaffolded"),
            ("Stripe webhook handler", "Scaffolded"),
            ("Stripe billing portal API", "Scaffolded"),
            ("Subscription tier enforcement", "Not Done"),
            ("Pricing page", "Partial"),
        ]),
        ("Error Handling and Monitoring", [
            ("Structured error logging utility", "Done"),
            ("Global error boundary page", "Done"),
            ("Page-level error boundary", "Done"),
            ("Sentry integration", "Scaffolded"),
            ("API error alerting", "Not Started"),
        ]),
        ("Email and Notifications", [
            ("Default Supabase auth emails", "Done"),
            ("Custom branded welcome email", "Not Started"),
            ("Weekly dream digest", "Not Started"),
            ("Daily journal reminder", "Not Started"),
            ("Payment receipt emails", "Not Started"),
        ]),
        ("Performance and Infrastructure", [
            ("Edge Runtime for AI calls", "Done"),
            ("In-memory analysis caching (1-hour)", "Done"),
            ("Database row-level security", "Done"),
            ("Vercel deployment (auto-deploy)", "Done"),
            ("Rate limiting on API endpoints", "Not Started"),
            ("CDN image optimization", "Partial"),
        ]),
    ]

    for cat_name, features in categories:
        story.append(Paragraph(cat_name, styles["h3"]))
        header = [
            Paragraph("Feature", styles["table_header"]),
            Paragraph("Status", styles["table_header"]),
        ]
        data = [header]
        for feat, stat in features:
            if stat == "Done":
                badge = status_badge("Done", GREEN.hexval())
            elif stat in ("Scaffolded", "Partial", "Disabled"):
                badge = status_badge(stat, YELLOW.hexval())
            else:
                badge = status_badge(stat, RED.hexval())
            data.append([
                Paragraph(feat, styles["table_cell"]),
                Paragraph(badge, styles["table_cell"]),
            ])

        t = Table(data, colWidths=[5.0 * inch, 1.5 * inch], repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_GRAY]),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#d1d5db")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(t)
        story.append(Spacer(1, 6))

    story.append(PageBreak())


def make_mvp(story, styles):
    story.append(Paragraph("5. MVP Requirements (Minimum to Launch)", styles["h1"]))
    story.append(Paragraph(
        "The MVP (Minimum Viable Product) is the smallest version of Dreamlink that can be "
        "released to real users. Everything below this line must work before opening the doors. "
        "Items marked as done are already working.",
        styles["body"]
    ))

    mvp_items = [
        ("User can sign up, verify email, log in, and reset password", "Done"),
        ("User can submit a dream and receive AI analysis", "Done"),
        ("User can view all their past dreams in a gallery", "Done"),
        ("AI-generated images appear on dream entries", "Done"),
        ("Bible citations display correctly", "Done"),
        ("User preferences are saved (reading level, Bible version)", "Done"),
        ("Dark mode works", "Done"),
        ("App loads fast and handles errors gracefully", "Done"),
        ("Payment system accepts subscriptions (Stripe)", "Needs Stripe Account"),
        ("Error monitoring catches production issues (Sentry)", "Needs Sentry Account"),
        ("Admin dashboard shows key business metrics", "Done"),
        ("Basic rate limiting prevents abuse", "To Do"),
    ]

    header = [
        Paragraph("Requirement", styles["table_header"]),
        Paragraph("Status", styles["table_header"]),
    ]
    data = [header]
    for item, stat in mvp_items:
        if stat == "Done":
            badge = status_badge("Done", GREEN.hexval())
        elif "Needs" in stat:
            badge = status_badge(stat, YELLOW.hexval())
        else:
            badge = status_badge(stat, RED.hexval())
        data.append([
            Paragraph(item, styles["table_cell"]),
            Paragraph(badge, styles["table_cell"]),
        ])

    t = Table(data, colWidths=[5.0 * inch, 1.5 * inch], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#d1d5db")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(Paragraph(
        "<b>Bottom line:</b> About 80% of the MVP is already built and working. The remaining items "
        "are configuration tasks (creating accounts on Stripe and Sentry, adding API keys) "
        "plus one development task (rate limiting).",
        styles["body"]
    ))
    story.append(Spacer(1, 8))


def make_phases(story, styles):
    phases = [
        ("6. Phase 1: Pre-Launch Essentials", "Complete these before inviting any users.", [
            ("Connect Stripe", "Create a Stripe account, add API keys to the app, and test the payment flow. The code is already written and waiting for the keys.", "High"),
            ("Connect Sentry", "Create a Sentry account and plug in the project key. Errors will start being tracked automatically.", "High"),
            ("Add Rate Limiting", "Prevent any single user from flooding the AI analysis endpoint. This protects against runaway costs.", "High"),
            ("Fix TypeScript Build Errors", "The app currently skips type-checking during deployment. This should be fixed to catch bugs before they reach users.", "Medium"),
            ("Clean Up Codebase", "Remove duplicate files and leftover test pages that should not be in the live app.", "Low"),
        ]),
        ("7. Phase 2: Launch Day Checklist", "Final checks before going live.", [
            ("Test the Full User Journey", "Walk through sign-up, submit a dream, see the analysis, view the gallery, upgrade subscription, and manage billing. Every step must work.", "Critical"),
            ("Set Up Custom Domain", "Point your domain (e.g., dreamlink.app) to Vercel and configure SSL.", "High"),
            ("Configure Auth Emails", "Ensure verification, password reset, and welcome emails look professional and are not landing in spam.", "High"),
            ("Load Test", "Simulate multiple users submitting dreams at the same time to make sure the system handles the load.", "Medium"),
            ("Privacy Policy and Terms", "Ensure the legal pages are up to date and accessible.", "Medium"),
        ]),
        ("8. Phase 3: Post-Launch Growth", "Improvements to make after real users are on the platform.", [
            ("Email Notifications", "Add welcome emails, weekly dream digests, and daily journal reminders. These significantly boost user retention.", "High"),
            ("Google Analytics", "Track which features users engage with, where they drop off, and how often they return.", "High"),
            ("Finish Full-Text Search", "Enable the server-side search that is already built but disabled. Lets users search across all dream content.", "Medium"),
            ("Dream Editing", "Let users edit their dream text after submission and optionally re-run the analysis.", "Medium"),
            ("Bible Verse Validation", "Cross-check AI-generated Bible references against a canonical database to improve accuracy.", "Medium"),
            ("Slack Alerts for Team", "Get real-time notifications in Slack when users sign up, subscribe, or when errors spike.", "Low"),
        ]),
        ("9. Phase 4: Scale and Expand", "Long-term features for growing the product.", [
            ("Social Login", "Let users sign in with Google or Apple for easier onboarding.", "Medium"),
            ("Dream Sharing", "Let users share a read-only view of their dream analysis with friends or on social media.", "Medium"),
            ("Favorites and Collections", "Let users organize dreams into themed collections or mark favorites.", "Low"),
            ("Dream Streak Tracking", "Gamification: show users how many consecutive days they have journaled.", "Low"),
            ("Mobile App (PWA)", "Make the app installable on phones with offline support.", "Medium"),
            ("Live Interpretation Sessions", "Premium feature: book a video call with a dream counselor.", "Low"),
        ]),
    ]

    for title, desc, items in phases:
        story.append(Paragraph(title, styles["h1"]))
        story.append(Paragraph(desc, styles["body"]))

        header = [
            Paragraph("Task", styles["table_header"]),
            Paragraph("What This Means", styles["table_header"]),
            Paragraph("Priority", styles["table_header"]),
        ]
        data = [header]
        for task, explanation, priority in items:
            if priority == "Critical":
                p_color = RED.hexval()
            elif priority == "High":
                p_color = YELLOW.hexval()
            elif priority == "Medium":
                p_color = BRAND_PRIMARY.hexval()
            else:
                p_color = GRAY.hexval()

            data.append([
                Paragraph(f"<b>{task}</b>", styles["table_cell"]),
                Paragraph(explanation, styles["table_cell"]),
                Paragraph(status_badge(priority, p_color), styles["table_cell"]),
            ])

        t = Table(data, colWidths=[1.5 * inch, 4.0 * inch, 1.0 * inch], repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_GRAY]),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#d1d5db")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        story.append(t)
        story.append(Spacer(1, 10))


def make_known_issues(story, styles):
    story.append(Paragraph("10. Known Issues and Technical Debt", styles["h1"]))
    story.append(Paragraph(
        "These are existing problems in the codebase that should be addressed. They will not "
        "prevent launch but will make the app harder to maintain if left unresolved.",
        styles["body"]
    ))

    issues = [
        ("TypeScript errors are being skipped during deployment",
         "The app is configured to ignore code-checking errors when deploying. This means bugs that the checker would normally catch are slipping through. Fix the errors and turn the checker back on.",
         "High"),
        ("One component file is very large (74 KB)",
         "The DreamCard component handles too many responsibilities. It should be split into smaller, more manageable pieces.",
         "Medium"),
        ("Duplicate files exist in the codebase",
         "Several files have copies with \" 2\" in the name (e.g., SearchFeatureToggle 2.tsx). These should be cleaned up.",
         "Low"),
        ("Server-side search is commented out",
         "The database-powered search feature was built but disabled. It needs testing and re-enabling.",
         "Medium"),
        ("Test coverage is limited",
         "Only a handful of tests exist. There are no end-to-end tests that simulate a real user's journey through the app.",
         "Medium"),
        ("Debug logging in production code",
         "Some developer-only console messages are still in the production codebase. These should be replaced with the structured error logging system.",
         "Low"),
    ]

    header = [
        Paragraph("Issue", styles["table_header"]),
        Paragraph("Explanation", styles["table_header"]),
        Paragraph("Severity", styles["table_header"]),
    ]
    data = [header]
    for issue, explanation, severity in issues:
        if severity == "High":
            s_color = RED.hexval()
        elif severity == "Medium":
            s_color = YELLOW.hexval()
        else:
            s_color = GRAY.hexval()
        data.append([
            Paragraph(f"<b>{issue}</b>", styles["table_cell"]),
            Paragraph(explanation, styles["table_cell"]),
            Paragraph(status_badge(severity, s_color), styles["table_cell"]),
        ])

    t = Table(data, colWidths=[1.8 * inch, 3.7 * inch, 1.0 * inch], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#d1d5db")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))


def make_timeline(story, styles):
    story.append(Paragraph("11. Timeline Estimate", styles["h1"]))
    story.append(Paragraph(
        "These are rough estimates assuming one developer working on Dreamlink. "
        "Actual timelines depend on how many hours per week are dedicated and whether "
        "any unexpected issues arise.",
        styles["body"]
    ))

    header = [
        Paragraph("Phase", styles["table_header"]),
        Paragraph("Estimated Time", styles["table_header"]),
        Paragraph("What Happens", styles["table_header"]),
    ]
    data = [header]
    timeline = [
        ("Phase 1: Pre-Launch", "1-2 weeks", "Stripe and Sentry accounts connected, rate limiting added, codebase cleaned up"),
        ("Phase 2: Launch", "1 week", "Full testing, domain setup, email configuration, go live"),
        ("Phase 3: Growth", "4-6 weeks", "Email notifications, analytics, full-text search, dream editing"),
        ("Phase 4: Scale", "Ongoing", "Social login, sharing, mobile PWA, premium features"),
    ]
    for phase, time, what in timeline:
        data.append([
            Paragraph(f"<b>{phase}</b>", styles["table_cell"]),
            Paragraph(time, styles["table_cell"]),
            Paragraph(what, styles["table_cell"]),
        ])

    t = Table(data, colWidths=[1.8 * inch, 1.2 * inch, 3.5 * inch], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#d1d5db")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(Paragraph(
        "<b>Key takeaway:</b> Dreamlink could be ready for a soft launch in as little as 2-3 weeks. "
        "The heavy lifting (AI analysis, image generation, database, authentication) is already done. "
        "What remains is mostly connecting external services and polishing.",
        styles["body"]
    ))
    story.append(PageBreak())


def make_glossary(story, styles):
    story.append(Paragraph("12. Glossary of Terms", styles["h1"]))
    story.append(Paragraph(
        "A plain-language guide to the technical terms used in this document and in "
        "conversations about Dreamlink development.",
        styles["body"]
    ))
    story.append(Spacer(1, 6))

    terms = [
        ("API (Application Programming Interface)",
         "A way for two software systems to talk to each other. When Dreamlink sends a dream to "
         "OpenAI for analysis, it uses OpenAI's API. Think of it like a waiter taking your order "
         "to the kitchen and bringing back the food."),
        ("API Key",
         "A secret password that lets our app connect to external services like OpenAI, Stripe, "
         "or the image generator. Each service gives us a unique key. If someone gets our key, "
         "they could use our account, so we keep them private."),
        ("Authentication (Auth)",
         "The system that verifies who a user is. This includes sign-up, login, password reset, "
         "and email verification. Dreamlink uses Supabase for this."),
        ("Backend",
         "The behind-the-scenes part of the app that users never see directly. It handles "
         "database storage, AI processing, and business logic. Think of it as the kitchen "
         "in a restaurant."),
        ("Codebase",
         "All the source code files that make up the app. Dreamlink's codebase has about 290 files."),
        ("Database",
         "Where all the app's data is stored: user accounts, dreams, analyses, Bible citations, "
         "subscriptions. Dreamlink uses Supabase, which runs on PostgreSQL (a popular database system)."),
        ("Dark Mode",
         "An option to switch the app's appearance from light backgrounds with dark text to dark "
         "backgrounds with light text. Easier on the eyes at night."),
        ("Deployment / Deploy",
         "The process of taking code from a developer's computer and putting it live on the internet "
         "where users can access it. Dreamlink deploys automatically to Vercel whenever code is pushed."),
        ("Edge Runtime",
         "A special way of running code on servers located close to each user around the world. "
         "Dreamlink uses this for AI analysis calls so they start faster (no waiting for a distant server to wake up)."),
        ("Environment Variables (Env Vars)",
         "Secret settings stored outside the code itself, like API keys and database passwords. "
         "They are configured in the hosting platform (Vercel) and never included in the code files."),
        ("Error Boundary",
         "A safety net in the app that catches crashes on a single page without breaking the entire "
         "application. Instead of a blank screen, the user sees a friendly error message with a retry button."),
        ("Error Monitoring",
         "A service (like Sentry) that automatically collects and reports errors happening in the live app. "
         "Without this, we would not know when something breaks unless a user tells us."),
        ("Frontend",
         "The part of the app that users see and interact with: buttons, text, images, animations. "
         "Think of it as the dining room in a restaurant."),
        ("Full-Text Search (FTS)",
         "A database feature that lets users search through all the words in their dreams, not just "
         "titles. It is more powerful than simple keyword matching."),
        ("FLUX.2",
         "The AI image generation model Dreamlink uses to create dream artwork. It is made by "
         "Black Forest Labs and creates images from text descriptions."),
        ("Git / GitHub",
         "A version control system (Git) and a website (GitHub) where the app's code is stored "
         "and tracked. Every change is recorded so we can undo mistakes and collaborate safely."),
        ("Migration",
         "A file that describes a change to the database structure (like adding a new column). "
         "Migrations are applied in order so the database evolves alongside the code."),
        ("Middleware",
         "Code that runs between a user's request and the app's response. Dreamlink's middleware "
         "checks if the user is logged in and refreshes their session on every page load."),
        ("MVP (Minimum Viable Product)",
         "The smallest version of the app that delivers the core experience and can be released "
         "to real users. It does not include every planned feature, just enough to be useful and "
         "gather feedback."),
        ("Next.js",
         "The web framework Dreamlink is built on. It is a popular system for building modern "
         "websites using React. Think of it as the blueprint and construction system for the building."),
        ("OpenAI",
         "The company that provides the AI language model (like ChatGPT) that Dreamlink uses to "
         "analyze dreams. We send the dream text to OpenAI and receive back a structured analysis."),
        ("Rate Limiting",
         "A safety mechanism that limits how many times a user (or attacker) can call the app's "
         "services in a given time period. Prevents someone from racking up AI costs by sending "
         "thousands of requests."),
        ("React",
         "A JavaScript library for building user interfaces. It is the technology that powers "
         "what users see on screen in Dreamlink."),
        ("RLS (Row-Level Security)",
         "A database security feature that ensures users can only see their own data. Even if "
         "someone tried to access another user's dreams directly, the database would block it."),
        ("Scaffolded",
         "The code structure and logic are written and ready, but the external service "
         "(like Stripe or Sentry) has not been connected yet. Like having the plumbing installed "
         "but not turning on the water."),
        ("Sentry",
         "An error monitoring service. When something breaks in the live app, Sentry catches it, "
         "records what happened, and can send alerts to the development team."),
        ("Server Actions",
         "A Next.js feature that lets the app run secure operations on the server (like signing up "
         "a user) without exposing sensitive logic to the browser."),
        ("Stripe",
         "A payment processing service. Dreamlink uses Stripe to handle subscriptions, credit card "
         "payments, invoices, and billing management. Users never enter payment info directly into "
         "our app; Stripe handles it securely."),
        ("Supabase",
         "The backend service Dreamlink uses for its database, user authentication, and file storage. "
         "It is an open-source alternative to Firebase built on PostgreSQL."),
        ("Technical Debt",
         "Shortcuts or incomplete work in the code that works for now but will cause problems later. "
         "Like patching a roof with tape instead of replacing the shingles. Eventually it needs "
         "proper fixing."),
        ("TypeScript",
         "A programming language that adds type-checking to JavaScript. It catches certain kinds of "
         "bugs before the code runs. Dreamlink is written in TypeScript."),
        ("Vercel",
         "The hosting platform where Dreamlink runs. When we push code changes, Vercel automatically "
         "builds and deploys the new version. It also provides the web address users visit."),
        ("Webhook",
         "A way for an external service to notify our app when something happens. For example, "
         "when Stripe processes a payment, it sends a webhook to Dreamlink saying the payment succeeded. "
         "It is like a doorbell: Stripe rings it and our app answers."),
    ]

    for term, definition in terms:
        story.append(Paragraph(term, styles["glossary_term"]))
        story.append(Paragraph(definition, styles["glossary_def"]))


def add_page_numbers(canvas_obj, doc):
    """Footer with page numbers."""
    canvas_obj.saveState()
    canvas_obj.setFont("Helvetica", 8)
    canvas_obj.setFillColor(GRAY)
    page_num = canvas_obj.getPageNumber()
    canvas_obj.drawRightString(
        doc.pagesize[0] - 0.75 * inch,
        0.5 * inch,
        f"Dreamlink 3.0 Product Roadmap  |  Page {page_num}"
    )
    canvas_obj.restoreState()


def main():
    styles = build_styles()

    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=letter,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        title="Dreamlink 3.0 Product Roadmap",
        author="Linguosity",
    )

    story = []

    make_cover(story, styles)
    make_toc(story, styles)
    make_executive_summary(story, styles)
    make_what_dreamlink_does(story, styles)
    make_status_overview(story, styles)
    story.append(PageBreak())
    make_feature_tracker(story, styles)
    make_mvp(story, styles)
    story.append(PageBreak())
    make_phases(story, styles)
    make_known_issues(story, styles)
    make_timeline(story, styles)
    make_glossary(story, styles)

    doc.build(story, onFirstPage=add_page_numbers, onLaterPages=add_page_numbers)
    print(f"PDF generated: {OUTPUT_PATH}")
    print(f"Size: {os.path.getsize(OUTPUT_PATH) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
