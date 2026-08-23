# Styling Prompt — SaaS Mobile (High-Tech Boutique)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: SaaS Mobile (High-Tech Boutique)
- **Type:** Mobile  ·  **Origin/Era:** 2020s SaaS Mobile  ·  **Complexity:** Medium
- **Look & feel / keywords:** saas, electric blue, gradient, fintech, spring animation, dual font, glassmorphism, boutique, premium, calistoga, inter, mono, tactile, haptic, bento
- **Art direction:** Design a high-tech boutique SaaS mobile app. Primary canvas: #FAFAFA (warm off-white). Cards: #FFFFFF with 1pt Slate-200 border, iOS shadow (shadowOpacity:0.1, shadowRadius:10, offset y:4), Android elevation:4, padding 24px, borderRadius 16. Buttons: LinearGradient #0052FF→#4D7CFF, height 56px, borderRadius 16, scale press 0.96 + haptic. Section badges: rounded pill with rgba(0,82,255,0.05) bg and rgba(0,82,255,0.2) border + PulseDot + JetBrains Mono text. Typography: Calistoga for heroes (36–42pt), Inter for body (16–18pt), JetBrains Mono for data labels. All screen transitions: spring (mass:1 damping:15 stiffness:120). Always include SafeAreaView.
- **Primary colors:** Electric Blue #0052FF, Gradient End #4D7CFF
- **Secondary colors:** Background #FAFAFA, Foreground #0F172A, Muted #F1F5F9, Card #FFFFFF, Border #E2E8F0
- **Effects & animation:** Spring animations (mass:1 damping:15 stiffness:120); gradient buttons (0052FF→4D7CFF); scale press 0.96→1.0 with haptics; floating FAB with gentle bobbing (Reanimated); glassmorphism BlurView navigation bars; staggered fade-in entrance (Y:20→0 + opacity:0→1); pulsing status dot on section badges; layout transitions (LayoutAnimation or Reanimated entering)
- **Key design values:** --bg: #FAFAFA, --fg: #0F172A, --muted: #F1F5F9, --accent: #0052FF, --accent-sec: #4D7CFF, --card: #FFFFFF, --border: #E2E8F0, --radius: 16px, --shadow: shadowOpacity 0.1 shadowRadius 10, --spring: mass 1 damping 15 stiffness 120, --font-display: Calistoga, --font-body: Inter, --font-mono: JetBrains Mono
- **Best suited for:** B2B SaaS mobile dashboards, fintech apps, developer tool mobile companions, marketing analytics apps, HR/operations apps, modern business productivity
- **Avoid for:** Pure consumer entertainment, children's apps, highly decorative lifestyle apps, contexts where Electric Blue feels too corporate
- **Theme support:** Light ✓ Full · Dark ◐ Partial  ·  **Mobile:** ✓ Mobile-First  ·  **Conversion:** ✓ High
- **Accessibility:** ✓ WCAG AA  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** SaaS Mobile Boutique (Calistoga + Inter) (Display Serif + Sans + Mono)
- **Heading typeface:** Calistoga
- **Body typeface:** Inter
- **Mood:** saas, boutique, electric, warm, editorial, bold, premium, fintech, business, dual font, human warmth

## Recommended color palette
- **Reference semantic palette:** Fintech/Crypto
- `Primary` #F59E0B / `On Primary` #0F172A / `Secondary` #FBBF24 / `On Secondary` #0F172A / `Accent` #8B5CF6 / `On Accent` #FFFFFF / `Background` #0F172A / `Foreground` #F8FAFC / `Card` #222735 / `Card Foreground` #F8FAFC / `Muted` #272F42 / `Muted Foreground` #94A3B8 / `Border` #334155 / `Destructive` #EF4444 / `On Destructive` #FFFFFF / `Ring` #F59E0B
- **Notes:** Gold trust + purple tech
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "SaaS Mobile (High-Tech Boutique)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
