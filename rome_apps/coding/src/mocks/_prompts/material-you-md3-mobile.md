# Styling Prompt — Material You (MD3 Mobile)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Material You (MD3 Mobile)
- **Type:** Mobile  ·  **Origin/Era:** Material Design 3  ·  **Complexity:** Medium
- **Look & feel / keywords:** material design 3, md3, tonal surfaces, pills, soft curves, android, md3 easing, state layers, haptic, fab, google
- **Art direction:** Design a Material You (MD3) mobile app. Use #FFFBFE background, #6750A4 primary, #E8DEF8 secondary container, #F3EDF7 surface container. All interactive elements are pill-shaped (borderRadius: 999). Buttons use Pressable with scale: 0.95 on press and state-layer overlays (black 10% or primary 12%). Inputs use filled M3 style: background #E7E0EC with floating label animation on focus. Elevation is tonal (layering containers) plus light shadow/elevation on Android. Animations use emphasized easing (0.2,0,0,1) at 100–400ms. FABs are tertiary-colored rounded squares/circles with level 3 elevation.
- **Primary colors:** Primary Violet #6750A4, Secondary Container #E8DEF8, Tertiary #7D5260
- **Secondary colors:** Surface #FFFBFE, On Surface #1C1B1F, Surface Container #F3EDF7, Outline #79747E
- **Effects & animation:** Tonal elevation (overlay colors instead of strong shadows), pill-shaped buttons and chips (borderRadius 999), emphasized easing Easing.bezier(0.2,0,0,1), state layers (pressed overlays 10–15% opacity), Reanimated-filled label float for inputs, HapticFeedback on FAB/toggles
- **Key design values:** --md3-bg: #FFFBFE, --md3-on-surface: #1C1B1F, --md3-primary: #6750A4, --md3-on-primary: #FFFFFF, --md3-secondary-container: #E8DEF8, --md3-on-secondary-container: #1D192B, --md3-tertiary: #7D5260, --md3-surface-container: #F3EDF7, --md3-outline: #79747E, --radius-pill: 999px, --easing-emphasized: cubic-bezier(0.2,0,0,1)
- **Best suited for:** Android ecosystem apps, cross-platform productivity tools, MD3-based admin panels, data-heavy back-office UI with Material UI
- **Avoid for:** Ultra-minimal brutalist brands, terminal/hacker aesthetics, monochrome editorial apps
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ Mobile-First  ·  **Conversion:** ✓ High
- **Accessibility:** ✓ WCAG AA (with MD3 token checks)  ·  **Performance:** ⚠ Good (requires gradients and overlays)

## Recommended typography
- **Pairing:** Material You MD3 (Roboto System) (Sans (System Default))
- **Heading typeface:** Roboto
- **Body typeface:** Roboto
- **Mood:** material design 3, md3, android, google, tonal, friendly, rounded, accessible, adaptive

## Recommended color palette
- **Reference semantic palette:** Analytics Dashboard
- `Primary` #1E40AF / `On Primary` #FFFFFF / `Secondary` #3B82F6 / `On Secondary` #FFFFFF / `Accent` #D97706 / `On Accent` #FFFFFF / `Background` #F8FAFC / `Foreground` #1E3A8A / `Card` #FFFFFF / `Card Foreground` #1E3A8A / `Muted` #E9EEF6 / `Muted Foreground` #64748B / `Border` #DBEAFE / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #1E40AF
- **Notes:** Blue data + amber highlights [Accent adjusted from #F59E0B for WCAG 3:1]
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Material You (MD3 Mobile)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
