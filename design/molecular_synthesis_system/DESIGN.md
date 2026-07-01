---
name: Molecular Synthesis System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3e494a'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6f797a'
  outline-variant: '#bec8ca'
  surface-tint: '#006972'
  primary: '#00535b'
  on-primary: '#ffffff'
  primary-container: '#006d77'
  on-primary-container: '#9becf7'
  inverse-primary: '#82d3de'
  secondary: '#006b5a'
  on-secondary: '#ffffff'
  secondary-container: '#98f0da'
  on-secondary-container: '#00705e'
  tertiary: '#911a23'
  on-tertiary: '#ffffff'
  tertiary-container: '#b33338'
  on-tertiary-container: '#ffd5d2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9ff0fb'
  primary-fixed-dim: '#82d3de'
  on-primary-fixed: '#001f23'
  on-primary-fixed-variant: '#004f56'
  secondary-fixed: '#9bf3dc'
  secondary-fixed-dim: '#7fd7c1'
  on-secondary-fixed: '#00201a'
  on-secondary-fixed-variant: '#005143'
  tertiary-fixed: '#ffdad8'
  tertiary-fixed-dim: '#ffb3b0'
  on-tertiary-fixed: '#410006'
  on-tertiary-fixed-variant: '#8c1520'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter: 16px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style
The design system is built for an educational "Molecule Modeling Workbench," targeting students in K-12 and early college. The brand personality is **Academic yet Approachable**, bridging the gap between rigorous scientific tools and intuitive learning interfaces. 

The aesthetic follows a **Modern Corporate** style infused with **Soft Science** elements. This means high-quality whitespace and professional structure, but with softened edges and a calming color palette to reduce the "intimidation factor" of complex chemistry. The goal is to evoke a sense of clarity, stability, and discovery.

## Colors
The palette uses **Deep Teal** as the primary anchor to convey scientific stability and authority. **Soft Mint** serves as the secondary color for low-intensity interactions and progress indicators, while **Coral** is reserved for high-priority calls to action and interactive molecule highlights.

The background uses a very light cool gray (#F8FAFC) rather than pure white to minimize eye strain during long modeling sessions. Success, warning, and error states are desaturated slightly to remain harmonious with the "soft science" aesthetic while maintaining clear functional communication.

## Typography
This design system utilizes **Inter** for its exceptional readability and systematic feel. The hierarchy is intentionally stark to help students navigate dense scientific data. 

Headings use a tighter letter-spacing and heavier weights to feel grounded. Body text maintains a generous line height (1.5x+) to ensure that chemical formulas and complex instructions are legible. Labels for periodic table elements and data points use a slightly heavier weight (`500` or `600`) to stand out against UI chrome.

## Layout & Spacing
The layout follows a **Fixed Grid** model for the workspace to ensure the 2D/3D visualizers maintain a consistent aspect ratio. 

- **Desktop:** 12-column grid with 24px margins. The central workbench spans 8 columns, with sidebars for tools and properties spanning 2 columns each.
- **Tablet:** 8-column grid. Sidebars become collapsible drawers.
- **Mobile:** 4-column grid. The 3D visualizer takes priority, with tools moved to a bottom sheet.

A vertical rhythm of 8px increments is used for all internal component spacing to maintain a clean, mathematical structure.

## Elevation & Depth
Depth is achieved through **Tonal Layers** and soft, ambient shadows. 
- The base background is the lowest level (Level 0).
- **Cards and Workspaces** sit at Level 1, using a subtle white background and a 1px border (#E2E8F0) to define their boundaries.
- **Floating Toolbars** and **Modals** use Level 2 elevation, featuring a soft, diffused shadow (15% opacity primary color tint) to appear as if hovering above the canvas.

Avoid heavy black shadows; instead, use shadows tinted with the Primary Deep Teal to keep the interface "soft."

## Shapes
The design system utilizes **Rounded** shapes (0.5rem base) to maintain the "friendly" educational vibe. Large containers like the 3D visualizer and main content cards use `rounded-lg` (1rem) or `rounded-xl` (1.5rem) to feel approachable and modern. Buttons follow the base roundedness, ensuring they feel substantial and easy to click.

## Components
- **Action Buttons:** Use high-contrast fills. The "Primary Action" (e.g., 'Analyze Molecule') uses the Deep Teal fill with white text. "Secondary Actions" use the Soft Mint tint with Deep Teal text.
- **The Phase Stepper:** A prominent horizontal bar at the top of the viewport. Completed steps use a Soft Mint circle with a checkmark; the active step uses a Deep Teal ring; pending steps use a light gray outline.
- **Cards:** Defined by 16px+ rounded corners and a 1px neutral-200 border. Use a subtle shadow only on hover to indicate interactivity.
- **Visualizer Frames:** 2D drawing and 3D viewing areas must have a defined "Inset" look. Use a slightly darker background (#F1F5F9) and a `rounded-lg` clip path to frame the molecular models.
- **Input Fields:** Large 48px height for accessibility. Use a 2px Deep Teal border-bottom or full outline on focus to provide high-contrast feedback for students.
- **Status Chips:** Use small, pill-shaped badges for atom types or bonding states, color-coded to standard CPK coloring but softened for this palette (e.g., Oxygen as a soft red, Carbon as a cool dark gray).