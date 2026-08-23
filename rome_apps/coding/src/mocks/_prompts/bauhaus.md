# Styling Prompt — Bauhaus (包豪斯)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Bauhaus (包豪斯)
- **Type:** Mobile  ·  **Origin/Era:** 1919 Bauhaus Movement  ·  **Complexity:** Medium
- **Look & feel / keywords:** bauhaus, geometric, constructivist, primary colors, hard shadow, bold, tactile, functional, poster, mechanical, architectural
- **Art direction:** Design a Bauhaus mobile app. Use strict geometric shapes (circles and squares only), primary color blocking (Red #D02020, Blue #1040C0, Yellow #F0C020), hard 4px offset black shadows, OFF-WHITE canvas (#F0F0F0), massive bold uppercase headlines (Outfit Black 900), rectangular full-width buttons with mechanical press animation. No gradients. No rounded cards. No soft transitions.
- **Primary colors:** Primary Red #D02020, Primary Blue #1040C0, Primary Yellow #F0C020
- **Secondary colors:** Background #F0F0F0 (Off-white), Foreground #121212 (Stark Black), Muted #E0E0E0
- **Effects & animation:** Hard offset shadows (4px 4px 0px black), mechanical press active:translate, no smooth hover — instant 0ms transitions, dot grid pattern on sections, slide-over transitions
- **Key design values:** --color-red: #D02020, --color-blue: #1040C0, --color-yellow: #F0C020, --color-bg: #F0F0F0, --color-fg: #121212, --border-width: 2px, --shadow-hard: 4px 4px 0px 0px #121212, --radius-block: 0px, --radius-pill: 9999px, --font-display: Outfit, --font-weight-hero: 900
- **Best suited for:** Mobile-first apps needing high personality, onboarding flows, branding-forward product screens, artisan/design brands, editorial mobile experiences
- **Avoid for:** Enterprise dashboards, accessibility-critical contexts (requires extra a11y work), data-heavy screens, conservative industries
- **Theme support:** Light ✓ Full · Dark ◐ Partial (primary palette only)  ·  **Mobile:** ✓ Mobile-First  ·  **Conversion:** ◐ Medium
- **Accessibility:** ⚠ WCAG AA (high contrast primaries; verify yellow text separately)  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Flat Design Mobile (System Bold) (Sans + Sans)
- **Heading typeface:** Inter
- **Body typeface:** Inter
- **Mood:** flat, clean, system, bold, geometric, cross-platform, icon, poster, minimal, functional, responsive

## Recommended color palette
- **Reference semantic palette:** Magazine/Blog
- `Primary` #18181B / `On Primary` #FFFFFF / `Secondary` #3F3F46 / `On Secondary` #FFFFFF / `Accent` #EC4899 / `On Accent` #FFFFFF / `Background` #FAFAFA / `Foreground` #09090B / `Card` #FFFFFF / `Card Foreground` #09090B / `Muted` #E8ECF0 / `Muted Foreground` #64748B / `Border` #E4E4E7 / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #18181B
- **Notes:** Editorial black + accent pink
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Bauhaus (包豪斯)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
