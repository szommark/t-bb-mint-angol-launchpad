## Hero Banner Revamp

Replace the right-column "Trusted by leaders" stats card with a **dynamic photo collage** and animate the three headline lines, while preserving the dark navy + teal palette, typography, eyebrow, subtitle, CTAs, and trust strip.

### 1. Right column — image collage (`src/routes/index.tsx`)
Swap the stats panel for a layered collage of 4 photos representing the three messages:
- **Card A (large, top-left)** — diverse friends chatting in a bright café (Connect)
- **Card B (medium, top-right, slightly raised)** — confident young professional in a video call on laptop (Speak)
- **Card C (medium, bottom-left, slightly lowered)** — adult learner on tablet/phone, modern lifestyle (Learn trendiest)
- **Card D (small floating accent, overlapping)** — traveler with smartphone / global moment

Styling: rounded-2xl, soft white/10 borders, layered drop shadows (`--shadow-elegant`), subtle rotation (-2°/+2°) on outer cards, teal-accent glow blob behind. A small floating "chip" badge ("🌍 50+ countries" or "⚡ Live conversation") on one card for premium polish. Mobile: collapses to a clean 2×2 grid below the text, no rotation.

### 2. Headline animation
Add a CSS-only entrance: each of the three `<span>` lines fades + slides up in sequence (0ms, 150ms, 300ms delays) using a new `@keyframes hero-line-in` utility in `src/styles.css`. The teal-gradient third line gets a subtle continuous shimmer (background-position animation on the existing gradient) to make it the focal accent. No JS, no new libs.

### 3. Background polish
Keep existing `--gradient-hero` + radial overlays. Remove the existing decorative `hero-banner-connect.png` globe (now redundant with collage). Add one extra very-soft teal radial blob behind the collage for depth.

### 4. Images
Generate 4 on-brand photos into `src/assets/`:
- `hero-collage-cafe.jpg` — diverse young adults laughing in modern café conversation
- `hero-collage-call.jpg` — professional woman on laptop video call, bright workspace
- `hero-collage-mobile.jpg` — stylish adult learning on smartphone, urban lifestyle
- `hero-collage-travel.jpg` — traveler with phone, airport/city scene

Bright, authentic, natural light, candid expressions — matched warm tone so they sit cohesively against the dark navy.

### 5. CTA copy (translations)
Update `ctaPrimary` to **"Start Your Journey"** / **"Indítsd az utad"** / **"Starte deine Reise"** across `en`/`hu`/`de`. Keep `ctaSecondary` ("Explore Our Courses" → already matches "Explore Courses"). Behavior unchanged: primary scrolls to placement form, secondary scrolls to courses.

### Out of scope
Nav, language switcher, value section, courses, form, about, testimonials, footer, routing, backend, design tokens (no new primary colors). The "Trusted by leaders" stats card is removed from the hero (stats can move to a later section in a follow-up if desired — not part of this task).

### Technical notes
- Pure frontend/presentation change in `src/routes/index.tsx` + `src/styles.css` + 4 new image assets.
- Animation via Tailwind v4 `@utility` keyframes in `src/styles.css` (no Motion/GSAP dependency).
- All images decorative → `alt=""` with descriptive aria where meaningful.
- No new packages.
