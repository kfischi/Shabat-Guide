---
name: motion-craft
description: Motion and animation rules for this repo (Emil Kowalski–style craft). Load whenever adding or editing any animation, transition, reveal-on-scroll, hover state, or page-load choreography. This is the "motion" role — it does not set the design language (that is multibrawn-design). Load it only when there IS motion to build.
---

# Motion Craft

Motion should feel inevitable and calm, never decorative. If an animation does not help the user understand what changed or where to look, cut it.

## Timing & easing
- **Ease-out for entrances** — deceleration at the *end*, when the eye is most focused. Use `cubic-bezier(.2,.8,.2,1)`. Never ease-in for something appearing (it feels sluggish exactly when attention peaks).
- **Durations:** enter 400–700ms; hover/press 120–250ms; exits ~20% faster than the matching entrance.
- **Nothing appears from nothing.** Enter from `opacity:0` + `translateY(12–18px)` and/or `scale(.985)` — never from `scale(0)` or width/height 0.

## Choreography
- **Stagger** grouped items (cards, list rows, hero children) by ~60–80ms each, so they cascade instead of popping together.
- After a staggered entrance, **reset the per-item delay** (clear `transition-delay`) so later `:hover` stays instant and never lags.
- **Order of work:** build structure → verify layout → *then* add motion. Animating a layout that will still change is wasted effort.

## Reveal-on-scroll
- Use `IntersectionObserver` (threshold ~.12), add an `.in` class, then `unobserve`. Do not re-animate on every scroll.
- Keep parent `.reveal` for section text; stagger the cards inside as their own items.

## Hover / press
- Cards: subtle lift `translateY(-4px)` + softer-to-stronger shadow, ~250ms ease-out.
- Buttons: `translateY(-2px)` on hover, `scale(.97)` on `:active`. Keep it quick.

## Accessibility — always
Wrap every non-essential animation so it is disabled under reduced-motion:
```css
@media (prefers-reduced-motion: reduce){
  .reveal,.card{opacity:1;transform:none;transition:none}
  .hero-in>*{animation:none}
}
```

## Verify
Motion cannot be judged from a static file. After building, open the page in a real browser and let it settle (headless Chromium with a `--virtual-time-budget`), screenshot the end state, and confirm nothing is stuck at `opacity:0` or mid-transform.
