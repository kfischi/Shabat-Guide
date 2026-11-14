---
name: premium-landing-page
description: The craft of composing a high-end, art-directed landing page — editorial standard, not a template. Load before building or editing ANY landing page, marketing page, hero-driven page or one-pager, whether it is a Multibrawn page or an off-brand client page (an artist, a venue, a launch). This is the "landing-page composition" role: it governs concept, layout, typography, hierarchy, conversion and the anti-generic bar. It works ON TOP OF the design language — multibrawn-design for Multibrawn pages, or a committed client palette otherwise — and never replaces it. When it is a Multibrawn page, load multibrawn-design too; for motion load motion-craft; before shipping load design-review.
---

# Premium Landing Page — compose it, don't template it

A landing page at our level is **art-directed**: one concept, expressed through deliberate composition, typography and restraint. "Looks expensive" is not the goal — looks *inevitable and specific to this subject* is. Most AI landing pages fail not because they're ugly but because they're **generic**: a page that could belong to anyone belongs to no one. This skill is the bar that stops that.

## Step 0 — before any markup, write the brief (one line each)
1. **Subject** — who/what is this, in their own world (an artist, a venue, a launch). Name one detail only they have.
2. **Feeling** — three words. ("quiet, assured, collectible" — not "modern, clean, professional".)
3. **One action** — the single thing a visitor should do. Everything else is secondary by design.
4. **The concept** — one art-direction idea the whole page expresses (a material, a motif, a compositional rule). Write it down. If you can't name it, you'll default to a template.

If you skip Step 0 you will produce the generic page. This is non-negotiable.

## The generic-AI tells — forbidden unless the concept truly calls for it
These are the patterns that read as "AI default luxury/SaaS". Avoid them on reflex:
- ❌ **Serif-on-near-black-with-gold** as an unmotivated "luxury" shortcut. Dark+gold is one of the most overused AI looks. Earn darkness from the subject (a gallery at night, a cellar) or choose a palette with a real point of view.
- ❌ **Eyebrow label + thin hairline rule** above every section heading. One decorative system repeated is wallpaper.
- ❌ **01 / 02 / 03 numbered markers** on things that aren't a sequence. Numbering is information, not ornament — use it only for real order (a process, a timeline).
- ❌ **Centered pull-quote band** on a slightly different background as the "vision" moment.
- ❌ **Three identical cards in a row** as the answer to every section.
- ❌ **Everything symmetrical, everything centered, everything equal weight.** No focal point = no design.
- ❌ **Full-viewport (100vh) hero** that pushes all real content below the fold.
- ❌ **Emoji as the icon system**, grey-rectangle fake screenshots, neon glow on everything, unmotivated purple/gradient heroes.
If you catch yourself reaching for one, that's the signal the page is going generic — change the move.

## 1. Concept over decoration
The page is one idea, not a stack of pretty sections. Pick a compositional rule and hold it: an **editorial grid** you can feel, a **recurring motif** from the subject (a brushstroke edge, a frame, a ledger line), a **single bold gesture** repeated at different scales. Decoration is what you add when you have no concept — don't.

## 2. The hero earns the fold
Not a lone heading on a flat field. A hero has: a **real subject** (the work, the product, the person — never a placeholder), an **art-directed composition** (asymmetry, overlap, an image bleeding off an edge, type that interacts with the image), **one headline carrying a real idea** (a claim or a line with tension — not "Welcome" / the subject's name alone), and **one CTA**. Size the hero to its content; let the next section peek above the fold so the page invites scrolling.

## 3. Typography is the identity
Type does more than the color palette to make a page feel bespoke.
- Choose a **display face with a point of view** and pair it deliberately; avoid the faces you'd use on any project.
- Set a **real scale with extreme contrast** — a hero headline can be 6–10× body size. Timid scale reads as a template.
- Vary **weight and width**, not just size. Track uppercase labels; give headings `text-wrap: balance`; keep running text ~60–70ch.
- Hebrew: `dir="rtl" lang="he"`, logical properties, a Hebrew display face (e.g. Frank Ruhl Libre) — never let it silently fall back to a system serif.

## 4. Composition & hierarchy
- **Asymmetry and overlap** over centered rows. Let one element break the grid on purpose.
- **Editorial scale jumps** — oversized statements next to small quiet text. Flat sameness is the generic smell.
- **One bold moment, quiet around it.** Put the boldness in a single place (a giant type statement, a full-bleed work, an interactive moment) and keep everything near it calm.
- **Whitespace is structure**, not leftover. Generous, intentional, uneven where it should be.
- **Vary the section shapes.** A split, a full-bleed image with an overlaid caption, an asymmetric text+portrait, an editorial index/list, a real interactive tool — match each to its content instead of stamping the same card grid.

## 5. Color from the subject's world
Derive the palette from the subject, not from a "luxury" preset. Choose neutrals with a deliberate hue bias (a warm off-black, not pure #000). One accent, used with restraint, where attention should go. Commit to light+dark (tokens on `:root`, redefined for dark) — or to a single theme **on purpose**, with every color set explicitly. For an off-brand client page, define their committed palette at the top as tokens and build everything from it.

## 6. Real content, always
No lorem, no invented stats, no fake logos or press, no grey-box "product shots". Use the subject's real words, real work, real numbers. Specific, true detail is what sells premium — "ציור שמן על בד, אוסף המוזיאון בבלמונטה" beats "stunning artwork". If a fact isn't real, don't print it.

## 7. Conversion craft
- **One primary CTA per screen.** Secondary actions visibly lower priority.
- **Remove friction** from the one action. Inside an artifact a form can't silently capture leads from anonymous visitors — lead with a working path: copyable contact, a real WhatsApp (`wa.me`) or Instagram link (https links open fine), and a compose-and-copy inquiry. Never claim "sent" when it wasn't. For real lead capture, hand off to the live site (Kfir / Wix / form→mail).
- **Trust signals must be real** — actual collections, venues, names, places.

## 8. Motion — one orchestrated moment
Restraint beats scatter. A considered page-load sequence or a few honest hover micro-interactions, not effects on everything. Content is **complete at rest** (nothing stuck at `opacity:0`; the first still frame reads fully — it's what a thumbnail and a share preview show). When there is motion, load **motion-craft**.

## 9. Build order & proof
Brief → structure → verify layout → type & color → **then** motion. After building, **look at a real screenshot** (headless Chromium `--screenshot`, ~430px and desktop), fix what the pixels show, and run **design-review** before handing over. You judge a landing page with your eyes, not by reading the CSS.

## Section patterns worth reaching for (not a fixed template)
Split hero (subject bleeds off one edge) · oversized type statement as its own section · full-bleed work/photo with an overlaid caption plate · asymmetric about with a portrait off-axis · editorial index/list with real hierarchy instead of equal cards · a real interactive moment (filter, tool, before/after) · press/collections as a quiet marquee of real names · signature footer. Pick the few the concept needs; leave the rest.

## How this fits the other skills
- **multibrawn-design** sets the brand (tokens, fonts, RTL) for Multibrawn pages — this skill sets how the page is *composed*. Load both for a Multibrawn page.
- **off-brand client pages** (an artist, a venue not under Multibrawn): no Multibrawn tokens — define the client's committed palette here and compose to this bar.
- **motion-craft** when there's motion. **design-review** last, every time.
