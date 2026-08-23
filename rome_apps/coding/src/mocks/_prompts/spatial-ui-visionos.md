# Styling Prompt — Spatial UI (VisionOS)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Spatial UI (VisionOS)
- **Type:** General  ·  **Origin/Era:** 2024 Spatial Era  ·  **Complexity:** High
- **Look & feel / keywords:** Glass, depth, immersion, spatial, translucent, gaze, gesture, apple, vision-pro
- **Art direction:** Design a VisionOS-style spatial interface. Use: frosted glass panels, depth layers, translucent backgrounds (15-30% opacity), vibrant colors for active states, gaze-hover effects, floating windows, immersive feel.
- **Primary colors:** Frosted Glass #FFFFFF (15-30% opacity), System White
- **Secondary colors:** Vibrant system colors for active states, deep shadows for depth
- **Effects & animation:** Parallax depth, dynamic lighting response, gaze-hover effects, smooth scale on focus
- **Key design values:** --glass-bg: rgba(255,255,255,0.2), --glass-blur: 40px, --glass-saturate: 180%, --window-radius: 24px, --depth-shadow: 0 8px 32px rgba(0,0,0,0.1), --focus-scale: 1.02
- **Best suited for:** Spatial computing apps, VR/AR interfaces, immersive media, futuristic dashboards
- **Avoid for:** Text-heavy documents, high-contrast requirements, non-3D capable devices
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ High (if adapted)  ·  **Conversion:** ✓ High
- **Accessibility:** ⚠ Contrast risks  ·  **Performance:** ⚠ Moderate (blur cost)

## Recommended typography
- **Pairing:** Spatial Clear (Sans + Sans)
- **Heading typeface:** Inter
- **Body typeface:** Inter
- **Mood:** spatial, legible, glass, system, clean, neutral

## Recommended color palette
- **Reference semantic palette:** Spatial Computing OS / App
- `Primary` #FFFFFF / `On Primary` #0F172A / `Secondary` #E5E5E5 / `On Secondary` #0F172A / `Accent` #FFFFFF / `On Accent` #0F172A / `Background` #888888 / `Foreground` #000000 / `Card` #999999 / `Card Foreground` #000000 / `Muted` #777777 / `Muted Foreground` #D4D4D4 / `Border` #CCCCCC / `Destructive` #FF3B30 / `On Destructive` #FFFFFF / `Ring` #007AFF
- **Notes:** Glass white + system blue [Accent adjusted from #007AFF for WCAG 3:1]
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Spatial UI (VisionOS)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
