---
name: multibrawn-design
description: The design language for Multibrawn (שבת חתן venue-finding). Load before building or editing ANY page, section, hero, component, or visual in this repo. Enforces the brand tokens (fuchsia-lavender + gold, Frank Ruhl Libre / Heebo, Hebrew RTL) and forbids generic AI-default patterns. This is the "design language" role — exactly one such skill; do not add a second.
---

# Multibrawn — Design Language

Before writing any markup, state one line to yourself: **what is this page, who is it for, what should they feel and do.** Every visual choice is judged against that. Only then build.

Multibrawn helps Israeli families plan a **שבת חתן** — the groom's Shabbat before the wedding. The feeling: warm, festive, trustworthy, a little luxurious. Hebrew, right-to-left, mobile-first.

## Brand tokens — use these, never invent new ones ad-hoc
```css
--bg:#E9D6F2;      /* fuchsia-lavender background */
--card:#F6EAFA;    /* soft card */
--field:#EFE0F6;   /* input fill */
--ink:#2C1A3D;     /* text */
--muted:#715B85;   /* secondary text */
--line:#D7B8E6;    /* borders */
--purple:#7C3AED;  --fuchsia:#D946EF;  --turq:#40E0D0;
--gold:#E7B34A;    /* premium accent */
--grad:linear-gradient(90deg,#7C3AED,#D946EF,#40E0D0);
```
- **Fonts:** headings `Frank Ruhl Libre` (700/800), body `Heebo` (300–700). Always `dir="rtl" lang="he"`.
- **Premium surfaces** lean darker (`#2a0d3f`→`#2C1A3D`) with **gold** accents, not more fuchsia.
- Define colors as CSS variables on `:root`; never hardcode hex mid-markup when a token exists.

## Non-negotiable: this palette is a deliberate brand, not a lazy default
The generic "purple gradient" warning in AI-design articles is about *unmotivated* purple. Ours is chosen. Keep it consistent — do not drift to teal-heavy or dark-SaaS looks that break the brand.

## Forbidden patterns (and what to do instead)
- ❌ A centered hero on flat dark with one big heading and nothing else → ✅ use a real photo/video hero (we have Cloudinary שבת חתן assets), a gold ribbon badge, a tagline, headline, sub, and one clear CTA.
- ❌ Three identical cards in a row as the answer to every "benefits" section → ✅ vary: a feature list with right-border accent, a value stack, or an interactive tool — match the content.
- ❌ Fake screenshots built from grey rectangles → ✅ real imagery or an honest illustrative UI; never mock a "product shot" from boxes.
- ❌ Neon glow around every button → ✅ one confident gradient CTA with a soft shadow; glow sparingly.
- ❌ Emoji as the only "icon" everywhere → ✅ inline SVG line icons (stroke, `currentColor`); emoji only as a warm accent.

## Rules of craft
- **One primary CTA per screen.** Payment is the primary action; WhatsApp/secondary links are visibly lower priority.
- **Mobile-first.** 16px side gutter, no horizontal scroll, tap targets ≥ 44px.
- **Readable text over media:** always a gradient/scrim overlay + `text-shadow` so headlines stay crisp over photo/video heroes.
- **Hebrew RTL:** use logical properties (`margin-inline-start`, `inset-inline-start`), `padding-inline`, etc.
- **Verify with your eyes:** after building, open the page in a real browser (headless Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, `--screenshot`), look at the screenshot, fix what's wrong (clipped CTA, unreadable text, broken RTL) before handing it over.

## When you touch motion, load `motion-craft`. Before shipping, load `design-review`.
