# Styling Prompt — Minimalist Monochrome

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Minimalist Monochrome
- **Type:** Mobile  ·  **Origin/Era:** 2020s Editorial Mobile  ·  **Complexity:** Medium
- **Look & feel / keywords:** monochrome, black white, editorial, austere, typographic, sharp, zero radius, high contrast, brutalist, pocket editorial, serif, mechanical
- **Art direction:** Design a minimalist monochrome mobile app. Use ONLY black (#000000) and white (#FFFFFF). Zero border-radius on every element. No shadows — depth is created by 1–4px black borders and color inversion only. Typography is the primary visual: Playfair Display for heroes (text-5xl–text-6xl, tracking-tighter, leading-[0.9]), Source Serif 4 for body, JetBrains Mono for labels/tags. Tap states instantly invert (bg-black text-white). Full-width horizontal rules separate sections. Use the word 'MENU' instead of hamburger icon.
- **Primary colors:** Pure Black #000000, Pure White #FFFFFF
- **Secondary colors:** Muted #F5F5F5, Dark Gray #525252, Border Light #E5E5E5
- **Effects & animation:** Instant inversion active state (tap → bg-black text-white, zero transition-none), no shadows (strictly 2D), full-bleed horizontal rules (4px black section dividers), subtle paper noise texture (opacity: 0.03), slide-in page transitions with hard edge
- **Key design values:** --color-bg: #FFFFFF, --color-fg: #000000, --color-muted: #F5F5F5, --color-muted-fg: #525252, --color-border: #000000, --color-border-light: #E5E5E5, --radius: 0px, --shadow: none, --border-hairline: 1px solid #E5E5E5, --border-thin: 1px solid #000000, --border-thick: 2px solid #000000, --border-heavy: 4px solid #000000, --font-display: Playfair Display, --font-body: Source Serif 4, --font-mono: JetBrains Mono
- **Best suited for:** Luxury fashion e-commerce mobile, editorial publications, high-end portfolio apps, experimental/avant-garde brands, digital exhibitions
- **Avoid for:** Entertainment, colorful brands, friendly consumer apps, anything requiring visual warmth or gradient
- **Theme support:** Light ✓ Full (Light Mode Enforced) · Dark ◐ Dark by section only (inverted sections)  ·  **Mobile:** ✓ Mobile-First  ·  **Conversion:** ◐ Medium
- **Accessibility:** ✓ WCAG AAA (pure black/white)  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Minimalist Monochrome Editorial (Serif + Serif + Mono (Triple Stack))
- **Heading typeface:** Playfair Display
- **Body typeface:** Source Serif 4
- **Mood:** monochrome, editorial, austere, typographic, pocket manifesto, luxury, high contrast, brutalist mobile

## Recommended color palette
- **Reference semantic palette:** Portfolio/Personal
- `Primary` #18181B / `On Primary` #FFFFFF / `Secondary` #3F3F46 / `On Secondary` #FFFFFF / `Accent` #2563EB / `On Accent` #FFFFFF / `Background` #FAFAFA / `Foreground` #09090B / `Card` #FFFFFF / `Card Foreground` #09090B / `Muted` #E8ECF0 / `Muted Foreground` #64748B / `Border` #E4E4E7 / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #18181B
- **Notes:** Monochrome + blue accent
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Minimalist Monochrome" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
