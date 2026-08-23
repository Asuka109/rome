# Styling Prompt — 3D & Hyperrealism

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: 3D & Hyperrealism
- **Type:** General  ·  **Origin/Era:** 2020s Modern  ·  **Complexity:** High
- **Look & feel / keywords:** Depth, realistic textures, 3D models, spatial navigation, tactile, skeuomorphic elements, rich detail, immersive
- **Art direction:** Build an immersive 3D interface using realistic textures, 3D models (Three.js/Babylon.js), complex shadows, realistic lighting, parallax scrolling (3-5 layers), physics-based motion. Include skeuomorphic elements with tactile detail.
- **Primary colors:** Deep Navy #001F3F, Forest Green #228B22, Burgundy #800020, Gold #FFD700, Silver #C0C0C0
- **Secondary colors:** Complex gradients (5-10 stops), realistic lighting, shadow variations (20-40% darker)
- **Effects & animation:** WebGL/Three.js 3D, realistic shadows (layers), physics lighting, parallax (3-5 layers), smooth 3D (300-400ms)
- **Key design values:** --perspective: 1000px, --parallax-layers: 5, --lighting-intensity: realistic, --shadow-depth: 20-40%, --animation-duration: 300-400ms
- **Best suited for:** Gaming, product showcase, immersive experiences, high-end e-commerce, architectural viz, VR/AR
- **Avoid for:** Low-end mobile, performance-limited, critical accessibility, data tables/forms
- **Theme support:** Light ◐ Partial · Dark ◐ Partial  ·  **Mobile:** ✗ Low  ·  **Conversion:** ◐ Medium
- **Accessibility:** ⚠ Not accessible  ·  **Performance:** ❌ Poor

## Recommended typography
- **Pairing:** Spatial Clear (Sans + Sans)
- **Heading typeface:** Inter
- **Body typeface:** Inter
- **Mood:** spatial, legible, glass, system, clean, neutral

## Recommended color palette
- **Reference semantic palette:** Gaming
- `Primary` #7C3AED / `On Primary` #FFFFFF / `Secondary` #A78BFA / `On Secondary` #0F172A / `Accent` #F43F5E / `On Accent` #FFFFFF / `Background` #0F0F23 / `Foreground` #E2E8F0 / `Card` #1E1C35 / `Card Foreground` #E2E8F0 / `Muted` #27273B / `Muted Foreground` #94A3B8 / `Border` #4C1D95 / `Destructive` #EF4444 / `On Destructive` #FFFFFF / `Ring` #7C3AED
- **Notes:** Neon purple + rose action
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "3D & Hyperrealism" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
