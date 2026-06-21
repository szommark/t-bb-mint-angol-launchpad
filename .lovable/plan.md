## Goal

Refresh the top hero on the homepage so it reads as a bold, on-brand banner with the new headline:

> **Connect to the world. Speak with ease. Learn the trendiest way.**

## Decisions made for you (since further questions were skipped)

- **Placement**: Replace the existing homepage hero headline area (in place, no extra stacked banner). Nav stays sticky on top.
- **Headline**: "Connect to the world. Speak with ease. Learn the trendiest way." — rendered as three stacked lines with the third line emphasized in teal accent for rhythm.
- **Subheadline + CTAs**: Keep the current subtitle and the two existing CTAs ("Take Free Placement Test" / "Explore Our Courses") so the form flow and conversion path are unchanged.
- **Translations**: Add HU and DE equivalents of the new headline so language switching keeps working.
- **Visual**: Keep the current `--gradient-hero` (deep navy → slate → teal blend) and the existing radial glow overlay. Add a subtle generated abstract globe/network illustration on the right side at low opacity to reinforce "connect to the world" without competing with text.
- **Trust row**: Keep the three check items below the CTAs.

## Scope (what changes)

1. `src/routes/index.tsx`
   - Update the `hero.title1` / `hero.title2` translations in `en`, `hu`, `de` to the new banner copy (split into 3 lines: line1, line2, line3Highlight).
   - Update the hero JSX so the headline renders as three lines, with the third line wrapped in a teal accent gradient/clip.
   - Add a decorative right-side image (abstract globe / connection lines) absolutely positioned inside the hero, low opacity, only on `lg+`. Keeps the existing right-column placement-test card intact.
2. `src/assets/hero-banner-connect.png` (new)
   - Generated abstract on-brand visual: glowing globe with thin teal connection arcs on dark navy, transparent background, used as the decorative image. Imported as an ES6 asset.

## Out of scope

- Nav, language switcher, courses, about, testimonials, form, footer — untouched.
- No new routes, no backend / DB / server-function changes.
- No design-token changes in `src/styles.css`.
- No copy changes outside the hero headline.

## Technical notes

- Translations remain typed via the existing `as const` `translations` object; the new structure adds `line1`, `line2`, `line3` alongside (or replacing) `title1`/`title2` — chosen to minimize JSX churn, single render path.
- Decorative image uses `aria-hidden` and `pointer-events-none` so it doesn't affect the form/CTA tap targets.
- No new dependencies.
