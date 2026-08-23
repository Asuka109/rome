# Styling Prompt — Sketch Hand-Drawn (Mobile)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Sketch Hand-Drawn (Mobile)
- **Type:** Mobile  ·  **Origin/Era:** Creative/Education  ·  **Complexity:** Medium
- **Look & feel / keywords:** sketch, hand-drawn, handwriting, wobbly, imperfect, paper, kalam, organic, collage, post-it, tape, offset shadow, scribble
- **Art direction:** Design a Hand-Drawn (Sketch) mobile app. Background #FDFBF7 (warm paper texture). Typography: Kalam Bold for headings (high weight, felt-tip style), PatrickHand Regular for body (human but legible). Colors: Pencil Black #2D2D2D for all text and borders, Red Marker #FF4D4D for accents, Blue Ballpoint #2D5DA1for input focus. Cards: white background, wobbly corner radii (e.g., 15/25/20/10), borderWidth 3, rotate -1deg or +1deg. Hard offset shadow implemented as a second View behind the card offset 4px right and 4px down. Buttons: Post-it yellow #FFF9C4 for primary CTA, press state shifts the button (translateX 4, translateY 4) to cover the shadow. Inputs: PatrickHand font, wobbly border, focus changes to Blue Ballpoint. Add absolute SVG tape and tack decorations. Error: jiggle animation -2deg to +2deg. All touch targets minimum 48x48.
- **Primary colors:** Red Marker #FF4D4D, Pencil Black #2D2D2D
- **Secondary colors:** Warm Paper #FDFBF7, Old Paper #E5E0D8, Blue Ballpoint #2D5DA1, Post-it Yellow #FFF9C4
- **Effects & animation:** Wobbly borderRadius (unique per corner: 15/25/20/10), borderWidth 2–3 solid/dashed, hard offset shadow via rear View (4px,4px) #2D2D2D, Kalam Bold headings, PatrickHand Regular body, slight rotation (-1deg/1deg) on cards, absolute SVG scribble overlays (arrows/tape/tacks), jiggle -2deg↔2deg on error, LayoutAnimation spring on layout changes, Haptics on press, paper texture repeating background
- **Key design values:** --bg: #FDFBF7, --text: #2D2D2D, --accent-red: #FF4D4D, --accent-blue: #2D5DA1, --postit: #FFF9C4, --border-width: 3px, --shadow-offset: 4px 4px, --font-heading: Kalam Bold, --font-body: Patrick Hand, --rotation-card: -1deg to 1deg
- **Best suited for:** Low-fidelity prototyping, creative brands, children/picturebook apps, education tools, journaling apps, gamified puzzles
- **Avoid for:** Enterprise dashboards, high-density data tables, fintech precision tools, medical or legal apps
- **Theme support:** Light ✓ Light · Dark ⚠ Dark (requires texture inversion)  ·  **Mobile:** ✓ Mobile-First (wobbly touch targets 48x48)  ·  **Conversion:** ✗ Low-Conversion
- **Accessibility:** ⚠ Moderate (small/muted text risk)  ·  **Performance:** ✓ Lightweight

## Recommended typography
- **Pairing:** Sketch Hand-Drawn Mobile (Kalam + Patrick Hand) (Handwritten + Handwritten (Dual))
- **Heading typeface:** Kalam
- **Body typeface:** Patrick Hand
- **Mood:** sketch, hand-drawn, handwriting, human, imperfect, organic, paper, kalam, patrick hand, education, journal, creative

## Recommended color palette
- **Reference semantic palette:** Generative Art Platform
- `Primary` #18181B / `On Primary` #FFFFFF / `Secondary` #3F3F46 / `On Secondary` #FFFFFF / `Accent` #EC4899 / `On Accent` #FFFFFF / `Background` #FAFAFA / `Foreground` #09090B / `Card` #FFFFFF / `Card Foreground` #09090B / `Muted` #E8ECF0 / `Muted Foreground` #64748B / `Border` #E4E4E7 / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #18181B
- **Notes:** Canvas neutral + creative pink
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Sketch Hand-Drawn (Mobile)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
