# Styling Prompt — Neumorphism (Mobile)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Neumorphism (Mobile)
- **Type:** Mobile  ·  **Origin/Era:** Tools/Lifestyle  ·  **Complexity:** Medium
- **Look & feel / keywords:** neumorphism, soft ui, dual shadow, extruded, inset, clay surface, monochromatic, cool grey, haptic, ceramic, physical, depth
- **Art direction:** Design a Neumorphism (Soft UI) mobile app. Entire background is a single color #E0E5EC (Cool Clay). No other background colors. Dual shadows: outer dark shadowColor rgba(163,177,198,0.7) offset(6,6) radius 10 + outer light #FFFFFF offset(-6,-6) radius 10 using nested View or react-native-shadow-2. Extruded (convex) for resting buttons and cards. Inset (concave) for inputs and pressed states. Buttons: height 56, borderRadius 16, scale 0.97 on press with shadow opacity→0.4, Haptics.impactAsync Light. Cards: padding 24, borderRadius 32, nested inner icon container uses inset style. Inputs: height 50, borderRadius 16, backgroundColor #E0E5EC (NOT white), inset depth effect, focus borderColor #6C63FF width 1.5. Typography: Plus Jakarta Sans Bold or System. Heading 24–32pt, body 16pt, caption 12pt, letterSpacing -0.5 for headings. Animation: 250ms Bezier(0.4,0,0.2,1). No black shadows, no pure white backgrounds.
- **Primary colors:** Accent Violet #6C63FF, Clay Base #E0E5EC
- **Secondary colors:** Text Dark #3D4852, Text Muted #6B7280, Shadow Light rgba(255,255,255,0.6), Shadow Dark rgba(163,177,198,0.7), Inset Background #D1D9E6
- **Effects & animation:** Full-screen #E0E5EC base, dual-layer shadow via nested View (light top-left + dark bottom-right), extruded convex resting state, inset concave pressed/input state, Reanimated scale 0.97 on press, shadow opacity interpolates 1→0.4 on press, Haptics Light on every interaction, 8pt grid, no blur shadows (no shadowRadius blend), nested depth (extruded card contains inset icon slot)
- **Key design values:** --bg: #E0E5EC, --text: #3D4852, --muted: #6B7280, --accent: #6C63FF, --shadow-light: rgba(255,255,255,0.6), --shadow-dark: rgba(163,177,198,0.7), --inset-bg: #D1D9E6, --radius-card: 32px, --radius-button: 16px, --font: Plus Jakarta Sans or System
- **Best suited for:** Minimal hardware controls, smart home apps, aesthetic utility tools, health monitors, brand showcase pages
- **Avoid for:** High-density data, bright multi-color apps, apps needing strong visual hierarchy via color, dark-mode-only products
- **Theme support:** Light ✓ Light-only · Dark ✗ Dark (breaks material metaphor)  ·  **Mobile:** ✓ Mobile-First  ·  **Conversion:** ✗ Low-Conversion
- **Accessibility:** ⚠ Moderate (low-contrast risk)  ·  **Performance:** ✓ Lightweight

## Recommended typography
- **Pairing:** Neumorphism Mobile (Plus Jakarta Sans + System) (Geometric Sans (System Fallback))
- **Heading typeface:** Plus Jakarta Sans
- **Body typeface:** Plus Jakarta Sans
- **Mood:** neumorphism, soft ui, monochromatic, cool grey, minimal, physical, depth, ceramic, system font, utility

## Recommended color palette
- **Reference semantic palette:** Smart Home/IoT Dashboard
- `Primary` #1E293B / `On Primary` #FFFFFF / `Secondary` #334155 / `On Secondary` #FFFFFF / `Accent` #22C55E / `On Accent` #0F172A / `Background` #0F172A / `Foreground` #F8FAFC / `Card` #1B2336 / `Card Foreground` #F8FAFC / `Muted` #272F42 / `Muted Foreground` #94A3B8 / `Border` #475569 / `Destructive` #EF4444 / `On Destructive` #FFFFFF / `Ring` #1E293B
- **Notes:** Dark tech + status green
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Neumorphism (Mobile)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
