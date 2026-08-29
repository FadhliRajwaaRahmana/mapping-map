---
name: Slate Edge
colors:
  primary: "#3b82f6"
  secondary: "#a855f7"
  background: "#f8fafc"
  surface: "#ffffff"
  foreground: "#1e293b"
  border: "#e2e8f0"
  success: "#22c55e"
  info: "#06b6d4"
  warning: "#eab308"
  danger: "#ef4444"
colors-dark:
  primary: "#60a5fa"
  secondary: "#c084fc"
  background: "#0f172a"
  surface: "#1e293b"
  foreground: "#f1f5f9"
  border: "#334155"
  success: "#22c55e"
  info: "#06b6d4"
  warning: "#eab308"
  danger: "#ef4444"
typography:
  display-lg:
    fontFamily: '"Space Grotesk", sans-serif'
    fontSize: 6rem
    fontWeight: 800
  heading-md:
    fontFamily: '"Space Grotesk", sans-serif'
    fontSize: 2.25rem
    fontWeight: 700
  body-md:
    fontFamily: '"Inter", system-ui, sans-serif'
    fontSize: 1rem
    fontWeight: 400
  label-md:
    fontFamily: '"Inter", system-ui, sans-serif'
    fontSize: 0.875rem
    fontWeight: 500
  caption-sm:
    fontFamily: '"Inter", system-ui, sans-serif'
    fontSize: 0.75rem
    fontWeight: 500
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
elevation:
  level0: none
  level1: 4px 4px 0px 0px #1e293b
  level2: 8px 8px 0px 0px #1e293b
  level3: 12px 12px 0px 0px #1e293b
---

## Slate Edge — Brutalist Design System

### Foundation

The palette centers on slate blue (#3b82f6) as the primary accent, with a clean slate foreground (#1e293b) for text and borders. Purple (#a855f7) serves as a complementary secondary. The background is a crisp off-white (#f8fafc).

### Action Tones

- **Primary — Slate Blue (#3b82f6)**: Interactive elements, links, primary buttons.
- **Secondary — Purple (#a855f7)**: Secondary actions, accent elements.
- **Foreground — Slate (#1e293b)**: Text, borders, offset shadow color.

### Surface Hierarchy

| Level | Color | Use |
|-------|-------|-----|
| Background | #f8fafc | Clean off-white canvas |
| Surface | #ffffff | Cards, panels |
| Border | #e2e8f0 | Subtle borders |

### Elevation — Offset Shadow System

| Level | Shadow | Usage |
|-------|--------|-------|
| Level 0 | none | Flat surfaces |
| Level 1 | `4px 4px 0px 0px #1e293b` | Subtle brutalist lift |
| Level 2 | `8px 8px 0px 0px #1e293b` | Card default |
| Level 3 | `12px 12px 0px 0px #1e293b` | Elevated elements |

### Do's and Don'ts

- Use bold offset shadows — the signature brutalist effect
- Pair Space Grotesk (headings) with Inter (body)
- Keep layouts clean and minimal — brutalist but not chaotic
- Use slate blue (#3b82f6) as the primary interactive accent
- Don't use blur or diffuse shadows — hard offset only
- Don't use pure black — slate (#1e293b) is warmer
- Don't over-round corners — keep them minimal
