# Styling Prompt — Academia (Scholarly Mobile)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Academia (Scholarly Mobile)
- **Type:** Mobile  ·  **Origin/Era:** Timeless Scholarly  ·  **Complexity:** High
- **Look & feel / keywords:** academia, library, mahogany, parchment, brass, crimson, serif, drop cap, arch-top, vignette, leather, scholarly, tactile
- **Art direction:** Design a Scholarly Academia mobile app. Background #1C1714 (mahogany), alt surfaces #251E19 (oak), text #E8DFD4 (parchment). Accent brass #C9A962 for CTAs + borders; crimson #8B2635 for wax seals. Typography: Cormorant Garamond (headings), Crimson Pro (body), Cinzel (labels/overlines). Use arch-top hero containers (borderTopRadius 100). Cards: oak bg, 1px wood-grain border. Inputs: worn-leather background, brass focus border. Global vignette overlay and ornate brass dividers (Unicode glyph + gradient line). Animations: no spring, only Timing with Easing.out(Easing.poly(4)).
- **Primary colors:** Mahogany #1C1714, Oak #251E19
- **Secondary colors:** Parchment #E8DFD4, Worn Leather #3D332B, Faded Ink #9C8B7A, Brass #C9A962, Library Crimson #8B2635
- **Effects & animation:** Deep mahogany backgrounds, oak surface cards, brass accented CTAs, arch-top hero/imagery, heavy vignette overlays, sepia-tinted images, drop caps with brass Cinzel, Roman numeral volume headings, slow timing-based animations (Easing.out poly(4)), zero neon or modern tech cues
- **Key design values:** --bg: #1C1714, --bg-alt: #251E19, --fg: #E8DFD4, --muted: #3D332B, --muted-fg: #9C8B7A, --border: #4A3F35, --accent-brass: #C9A962, --accent-crimson: #8B2635, --radius: 4px, --arch-radius: 100px, --shadow-card: 0 4px 6px rgba(0,0,0,0.4), --font-heading: Cormorant Garamond, --font-body: Crimson Pro, --font-label: Cinzel
- **Best suited for:** Knowledge management apps, deep reading tools, ritual-heavy personal brands, lore-heavy RPG/roleplay apps, culture-specific community platforms
- **Avoid for:** Hyper-modern tech dashboards, neon/glassmorphism, playful Gen Z branding
- **Theme support:** Light ✓ Dark Rich · Dark ◐ Light parchment sections  ·  **Mobile:** ◐ Mobile-First  ·  **Conversion:** ◐ Medium
- **Accessibility:** ✓ Legible (serif optimized)  ·  **Performance:** ⚠ Moderate (vignette + shadows)

## Recommended typography
- **Pairing:** Academia Mobile (Cormorant + Crimson + Cinzel) (Serif + Book Serif + Engraved (Triple Stack))
- **Heading typeface:** Cormorant Garamond
- **Body typeface:** Crimson Pro
- **Mood:** academia, library, mahogany, parchment, brass, scholarly, prestige, antique, victorian, leather

## Recommended color palette
- **Reference semantic palette:** Membership/Community
- `Primary` #7C3AED / `On Primary` #FFFFFF / `Secondary` #A78BFA / `On Secondary` #0F172A / `Accent` #16A34A / `On Accent` #FFFFFF / `Background` #FAF5FF / `Foreground` #4C1D95 / `Card` #FFFFFF / `Card Foreground` #4C1D95 / `Muted` #ECEEF9 / `Muted Foreground` #64748B / `Border` #DDD6FE / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #7C3AED
- **Notes:** Community purple + join green [Accent adjusted from #22C55E for WCAG 3:1]
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Academia (Scholarly Mobile)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
