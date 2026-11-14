---
name: art-landing-review
description: The "supervisor" review for a fine-art / artist / gallery landing page, judged at international (blue-chip gallery, art-fair, serious-collector) standard. Load it AFTER building or editing an artist/art-commerce page, before handing it to the client — and whenever asked to "review", "critique", "supervise", or bring an expert eye to an art site. This is a CONTROL role: it reviews against a fixed rubric, it does not build. It is stricter and art-market-specific where the general design-review skill is generic; run design-review for slop/brand drift, this for art-market credibility. Most of the judgement is made by looking at real screenshots, not by reading code.
---

# Art Landing Review — judge it as a collector would

Run this as a tough, unflattering expert pass on any artist/gallery landing page. The client is paying for a serious eye, not encouragement. Flattery that isn't earned is a failure of the review. The core move is to **look at real screenshots** (desktop, mobile, both languages if bilingual, a work-detail view), not to reason about the markup.

Adopt the stance of a **senior creative director who also knows the fine-art market** (galleries, fairs, collectors, representation). Ask one question above all others:

> **Does the ART lead — or does the page sell a lifestyle that happens to contain paintings?**

This is the failure mode that sinks artist sites. A fashion-editorial portrait, interiors-styling shots, or décor vibes as the dominant imagery miscategorize a serious painter as lifestyle/décor. The work must be the protagonist.

## The rubric — score each 1–10, with one line of evidence from the screenshots
1. **First impression — expensive & specific, or template?** Does it feel inevitable and bespoke to this artist, or like a luxury template?
2. **Art direction & brand coherence.** Palette (ideally pulled from the artist's own work), type pairing, composition, restraint. Flag reflex gimmicks (marker-underline headings, script "signature" accents as wedding-invite cliché, floating accent blocks).
3. **Does the ART lead?** Is the hero a painting (not a gown/portrait/room)? Are catalogue images clean, flat, colour-accurate reproductions — or styling shots of a canvas propped on a bed? Can a collector actually assess the work?
4. **The reproduction problem.** Painting loses scale, texture and true colour in a photo. Is there a clean primary image per work, plus texture/raking-light detail and a scale reference? Glare, shadow, perspective and phone-snapshot quality are disqualifying for a hero/primary shot.
5. **Commercial / conversion.** One clear primary CTA; per-work inquiry; **medium, dimensions, year, and price or "price on request"** on each work (a collector cannot buy without them); real trust signals; a line-sheet / PDF catalogue.
6. **International positioning.** Bilingual quality and correct RTL/LTR; the biggest credibility marker (museum collection, notable show) given real prominence — not buried as a caption; CV / exhibitions / press present; English copy that reads naturally to a native ear.
7. **Craft & detail.** Spacing, hierarchy, motion restraint (slow and purposeful, never attention-grabbing), mobile, empty voids (e.g. a modal with dead space), focus states.
8. **Credibility / honesty — the AI-slop tells.** Visible placeholder labels ("Cat. 01 / 02" used as filler), boilerplate copy ("built in layers of material and texture", "good art provokes thought"), invented facts, fake press. These scream "unfinished / not written by someone who knows this work."

## Deliver the verdict in this shape
1. **Verdict** (2–3 blunt sentences): would this pass to an international collector / blue-chip gallery?
2. **Scorecard**: the 8 criteria above, each scored with one line.
3. **Top 5 fixes**, ranked most-important first — concrete and actionable, the kind you'd give a designer before it ships to a paying client. Red issues (art doesn't lead, no prices/dimensions, snapshot-grade images, buried credibility) outrank nits.
4. **Three level-up moves** specific to a fine-art painter (not generic web advice): e.g. a true work-detail view (canvas + impasto detail + scale + provenance line); "art for spaces" as named case studies (brief → placement → result) rather than a photo grid; a collector's apparatus (line-sheet / PDF, "request availability & pricing", a quiet mailing list for new works and studio visits).
5. **One thing NOT to change** — name what genuinely works so it survives the next edit.

## Standing rules
- Judge the pixels, not the prose. If no screenshots exist, take them first (headless Chromium `--screenshot`, ~430px and desktop, each language).
- Separate what the build can fix now from what needs the **artist's own inputs** (clean reproductions, real titles, dimensions, prices, exhibition/press list). Say which is which; never invent any of them.
- Honour real content. An artist's actual words (a real statement, a real quote) are not "filler" even if they read plainly — verify before calling copy generic.
- For an independent read, this review can be run by a separate reviewer agent given the screenshots and this rubric, so the critique isn't anchored on the builder's own conclusions.
- This role reviews; it does not build. Hand the ranked fixes back to the builder.

## Fits the other skills
`premium-landing-page` composes the page · `multibrawn-design` sets brand tokens for Multibrawn pages (not for an off-brand artist page) · `motion-craft` governs motion · `design-review` catches general AI-slop and brand drift. This skill is the **art-market supervisor** on top of all of them.
