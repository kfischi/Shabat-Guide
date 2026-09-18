---
name: design-review
description: A design QA pass that catches "AI slop" and brand drift before a page ships. Load it AFTER building or editing any page/section, right before handing it to the user or merging. This is the "control" role — it reviews, it does not build; run it last. Most of it is done by looking at a real screenshot, not by reasoning about the code.
---

# Design Review — catch the slop before it ships

Run this as the final step on any visual change. The core move is **look at a real screenshot**, not read the CSS. Open the page in headless Chromium (`--screenshot`, mobile width ~430 and a desktop width), and check each item against the actual pixels.

## The generic-AI tells (fix any that appear)
- [ ] Unmotivated centered hero on flat dark with a lone heading → does it have imagery, a badge, tagline, sub, one CTA?
- [ ] Three identical cards in a row used as a reflex → does the layout fit the content, or is it a template?
- [ ] Fake UI built from grey rectangles / fake screenshots → replaced with real imagery or removed.
- [ ] Neon glow on everything, gradient on every surface → restrained, one focal CTA.
- [ ] Emoji standing in for a real icon system → SVG line icons where structure is needed.

## Brand & correctness (against `multibrawn-design`)
- [ ] Colors come from the tokens; no stray off-brand hex.
- [ ] Frank Ruhl Libre on headings, Heebo on body; `dir="rtl" lang="he"`.
- [ ] Premium surfaces use gold accents, not extra fuchsia.
- [ ] Exactly one primary CTA per screen; secondary actions clearly lower priority.

## Legibility & layout (from the screenshot)
- [ ] Text over photo/video is readable — scrim + text-shadow present, nothing washed out.
- [ ] Nothing clipped: CTA fully on-screen at mobile width, no horizontal scroll, no text under a fixed bar.
- [ ] RTL correct: alignment, arrows, and inline spacing read right-to-left; logical properties used.
- [ ] Tap targets ≥ 44px; inputs are 16px+ font (no iOS zoom).
- [ ] Contrast is sufficient for body and muted text.

## Motion (if any; see `motion-craft`)
- [ ] Nothing stuck at `opacity:0` or mid-transform in the settled screenshot.
- [ ] Reduced-motion path exists and yields a clean static page.

## Content honesty
- [ ] No invented stats, fake logos, or claims we can't back (e.g. "הראשון בישראל"). Prefer "ערכת התכנון המעשית של Multibrawn".
- [ ] Prices and links are correct and point to the right domain.

## Verdict
List only what actually fails against the pixels, ranked by how much it hurts. If nothing fails, say so plainly — don't invent nits. Fix the real issues, re-screenshot, then ship.
