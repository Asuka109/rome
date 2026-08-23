# Styling Prompt — Flat Design Mobile (Touch-First)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Flat Design Mobile (Touch-First)
- **Type:** Mobile  ·  **Origin/Era:** 2010s–2020s Flat Mobile  ·  **Complexity:** Low
- **Look & feel / keywords:** flat, 2D, no shadow, color blocking, geometric, bold, poster, icon, touch-first, minimal, clean, tailored, cross-platform
- **Art direction:** Design a Flat Mobile app. NO shadows (shadowOpacity: 0, elevation: 0). Color creates all hierarchy. Sections: full-width View blocks alternating contrasting bg colors (Blue Hero → White Content → Gray Block). Buttons: solid #3B82F6, borderRadius 8, height 56. Cards: backgroundColor #FFFFFF (on gray bg) or #DBEAFE (blue tint) — no shadow. Text: fontWeight 800 letterSpacing -0.5 (heads), 600 (sub), 400 (body). Inputs: #F3F4F6 bg, focused: borderWidth 2 borderColor #3B82F6. Icons: Lucide strokeWidth 2.5 inside solid colored square/circle. Press feedback: scale 0.97 Pressable. Use position absolute low-opacity geometric shapes (circles, rotated squares) as background decoration.
- **Primary colors:** Blue #3B82F6, Emerald #10B981
- **Secondary colors:** Background #FFFFFF, Surface #F3F4F6, Text #111827, Amber #F59E0B, Border #E5E7EB
- **Effects & animation:** Immediate press feedback (scale 0.97, no delay), color section blocking (full-width contrasting View), zero elevation/shadow, solid icon containers (colored squares/circles), geometric low-opacity shape overlays, bottom tabs solid fill (no floating)
- **Key design values:** --bg: #FFFFFF, --surface: #F3F4F6, --fg: #111827, --primary: #3B82F6, --secondary: #10B981, --accent: #F59E0B, --border: #E5E7EB, --radius-sm: 6px, --radius-md: 12px, --radius-pill: 999px, --shadow: none, --elevation: 0, --touch-target: 48px, --spacing: 4 8 16 24 32 48
- **Best suited for:** Cross-platform apps (iOS+Android parity), information-dense dashboards, system UI, brand illustration, onboarding flows, marketing pages, icon design
- **Avoid for:** Ultra-premium contexts needing depth/shadow, dark-mode-first products, contexts where flat design reads as unfinished or sterile
- **Theme support:** Light ✓ Full · Dark ◐ Partial (Dark mode via color swap only)  ·  **Mobile:** ✓ Mobile-First  ·  **Conversion:** ✓ High
- **Accessibility:** ✓ WCAG AA (large bold type helps)  ·  **Performance:** ⚡ Excellent (no GPU effects)

## Recommended typography
- **Pairing:** Flat Design Mobile (System Bold) (Sans + Sans)
- **Heading typeface:** Inter
- **Body typeface:** Inter
- **Mood:** flat, clean, system, bold, geometric, cross-platform, icon, poster, minimal, functional, responsive

## Recommended color palette
- **Reference semantic palette:** Design System/Component Library
- `Primary` #4F46E5 / `On Primary` #FFFFFF / `Secondary` #6366F1 / `On Secondary` #FFFFFF / `Accent` #EA580C / `On Accent` #FFFFFF / `Background` #EEF2FF / `Foreground` #312E81 / `Card` #FFFFFF / `Card Foreground` #312E81 / `Muted` #EBEEF8 / `Muted Foreground` #64748B / `Border` #C7D2FE / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #4F46E5
- **Notes:** Indigo brand + doc hierarchy [Accent adjusted from #F97316 for WCAG 3:1]
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Flat Design Mobile (Touch-First)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
