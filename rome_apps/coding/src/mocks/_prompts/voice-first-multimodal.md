# Styling Prompt — Voice-First Multimodal

```
You are designing the user interface for the product described in the Product Requirement below. Apply the visual style specified here precisely. The Product Requirement defines what the interface contains; this specification defines how it looks and feels. The choice of technology is unconstrained.

## Product Requirement (input)
{{PRODUCT_REQUIREMENT}}

## Visual style: Voice-First Multimodal
- **Type:** General  ·  **Origin/Era:** 2025+ Voice Era  ·  **Complexity:** Medium
- **Look & feel / keywords:** Voice UI, multimodal, audio feedback, conversational, hands-free, ambient, contextual, speech recognition
- **Art direction:** Design a voice-first multimodal interface. Use: voice waveform visualization, listening state indicator, speaking animation, minimal visible UI, audio feedback cues, hands-free optimized, conversational flow, ambient design.
- **Primary colors:** Calm neutrals: Soft White #FAFAFA, Muted Blue #6B8FAF, Gentle Purple #9B8FBB
- **Secondary colors:** Audio waveform colors, status indicators (listening/processing/speaking), success/error tones
- **Effects & animation:** Voice waveform visualization, listening pulse, processing spinner, speak animation, smooth transitions
- **Key design values:** --listening-color: #6B8FAF, --speaking-color: #22C55E, --waveform-height: 60px, --pulse-duration: 1.5s, --indicator-size: 24px, --voice-accent: #9B8FBB
- **Best suited for:** Voice assistants, accessibility apps, hands-free tools, smart home, automotive UI, cooking apps
- **Avoid for:** Visual-heavy content, data entry, complex forms, noisy environments
- **Theme support:** Light ✓ Full · Dark ✓ Full  ·  **Mobile:** ✓ High  ·  **Conversion:** ✓ High
- **Accessibility:** ✓ Excellent  ·  **Performance:** ⚡ Excellent

## Recommended typography
- **Pairing:** Accessibility First (Sans + Sans)
- **Heading typeface:** Atkinson Hyperlegible
- **Body typeface:** Atkinson Hyperlegible
- **Mood:** accessible, readable, inclusive, WCAG, dyslexia-friendly, clear

## Recommended color palette
- **Reference semantic palette:** Voice Recorder & Memo
- `Primary` #DC2626 / `On Primary` #FFFFFF / `Secondary` #EF4444 / `On Secondary` #FFFFFF / `Accent` #2563EB / `On Accent` #FFFFFF / `Background` #FFFFFF / `Foreground` #0F172A / `Card` #FFFFFF / `Card Foreground` #0F172A / `Muted` #FCF1F1 / `Muted Foreground` #64748B / `Border` #FAE4E4 / `Destructive` #DC2626 / `On Destructive` #FFFFFF / `Ring` #DC2626
- **Notes:** Recording red + waveform blue
- (The style's own Primary/Secondary colors above take precedence; use this set to fill semantic roles such as card, muted, border, ring, and destructive.)

## Visual & interaction guidelines
- Establish a clear visual hierarchy and consistent spacing, type scale, color, radius, shadow, and motion derived from the spec above.
- Provide clear interactive states: rest, hover, focus, pressed/selected, and disabled.
- Stay legible and well-composed from small mobile widths to large desktop widths; no horizontal overflow, no overlapping or clipped content.
- Maintain accessible color contrast and a clearly visible focus indicator.
- Respect a reduced-motion preference for non-essential animation.
- The interface must immediately communicate the "Voice-First Multimodal" style through color, shape, type, texture, and motion. Be distinctive and opinionated, not generic.

```
