# Styling Prompt — Claymorphism (Mobile)

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Claymorphism (Mobile)
- **Type:** Mobile  ·  **Origin/Era:** Consumer/Education  ·  **Complexity:** High
- **Look & feel / keywords:** claymorphism, clay, 3d, soft, bubbly, candy, playful, rounded, squish, tactile, inflate, silicone, haptic, spring
- **Art direction:** Design a high-fidelity Claymorphism mobile app. Background #F4F1FA (cool lavender-white, never pure white). Primary CTA: LinearGradient #A78BFA to #7C3AED, borderRadius 20, height 56. Cards: borderRadius 32, backgroundColor rgba(255,255,255,0.7) with BlurView. Multi-layer shadow: outer offset(12,12) rgba(160,150,180,0.2) + highlight offset(-8,-8) white. Typography: Nunito Black 900 for headings (48px hero, 32px section, 22px card), DM Sans Medium 500 for body 16px. Spring animations: scale 0.92 on press, spring back damping 10. Background blobs drift ±20px over 8–10s. Bento 2-column grid with hero card spanning full width. Haptics.impactAsync Light on every button press.
- **Primary colors:** Vivid Violet #7C3AED, Hot Pink #DB2777
- **Secondary colors:** Canvas #F4F1FA, Soft Charcoal #332F3A, Emerald #10B981, Amber #F59E0B, Lavender-Gray #635F69
- **Effects & animation:** Multi-layer shadow stacks (nested View) to simulate clay depth, LinearGradient #A78BFA→#7C3AED buttons, borderRadius 40–50 outer / 32 cards / 20 buttons, Reanimated spring squish (scale 0.92 on press), BlurView glass-clay hybrid cards, floating blobs with slow ±20px drift, Haptics Light on every press
- **Key design values:** --bg: #F4F1FA, --card-bg: rgba(255,255,255,0.7), --text: #332F3A, --muted: #635F69, --accent: #7C3AED, --accent2: #DB2777, --success: #10B981, --warning: #F59E0B, --radius-outer: 50px, --radius-card: 32px, --radius-button: 20px, --font-heading: Nunito Black, --font-body: DM Sans
- **Best suited for:** Children education apps, teen social products, crypto gamification, creative tools, brand mascot-led apps
- **Avoid for:** Serious enterprise, high-density data, editorial reading apps, fintech trust signals
- **Theme support:** Light ✓ Light · Dark ⚠ Dark (adjusted)  ·  **Mobile:** ✓ Mobile-First (thumb zone)  ·  **Conversion:** ✓ High
- **Accessibility:** ✓ WCAG AA (careful)  ·  **Performance:** ⚠ Moderate–Heavy (shadows+blur)

## Recommended typography
- **Pairing:** Claymorphism Mobile (Nunito + DM Sans) (Display Rounded + Geometric Sans)
- **Heading typeface:** Nunito
- **Body typeface:** DM Sans
- **Mood:** claymorphism, clay, rounded, playful, candy, bubbly, soft, 3d, children, education, tactile, spring, nunito, dm sans

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
- The interface must immediately communicate the "Claymorphism (Mobile)" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
