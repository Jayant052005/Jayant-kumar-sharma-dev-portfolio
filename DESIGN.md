# Design System

## Modern Editorial Developer Portfolio

**Design direction:** Inspired by the supplied black-and-red editorial
portfolio reference, adapted for a backend/full-stack developer.

## 1. Design Principles

-   Bold, confident, and minimal.
-   Editorial typography with clear hierarchy.
-   Strong contrast and generous negative space.
-   Asymmetrical compositions balanced by a consistent grid.
-   Red used selectively to guide attention.
-   Motion should support hierarchy and feedback, not distract.
-   Project content and usability take priority over decoration.

## 2. Color Palette

  Token                      Hex         Usage
  -------------------------- ----------- -------------------------------------
  `--color-bg`               `#0B0B0B`   Main page background
  `--color-surface`          `#121212`   Cards and alternate sections
  `--color-surface-raised`   `#191919`   Hovered or elevated surfaces
  `--color-text`             `#F5F5F5`   Primary text
  `--color-muted`            `#A0A0A0`   Supporting text
  `--color-accent`           `#E5252A`   CTA, highlights, decorative accents
  `--color-border`           `#292929`   Dividers and card borders

Use the accent red sparingly. Ensure text and interactive states remain
readable.

## 3. Typography

-   Display/headings: **Bebas Neue**.
-   Body/UI: **Inter**.
-   Use uppercase display headings selectively.
-   Keep paragraphs comfortable to read; avoid overly narrow or tiny
    body text.
-   Use fluid sizes with `clamp()` where appropriate.

Suggested hierarchy: - Hero heading: large, tightly spaced,
responsive. - Section heading: bold and clearly separated. - Card title:
medium-large, concise. - Body copy: readable and relaxed. - Metadata:
small but still legible.

Load fonts efficiently and provide system fallbacks.

## 4. Layout and Grid

-   Use a centered content container with a sensible maximum width.
-   Use CSS Grid for project cards and multi-column content.
-   Use Flexbox for navigation and simple horizontal groups.
-   Use generous section spacing and thin horizontal dividers.
-   Use vertical section labels only when they remain readable and do
    not create mobile overflow.
-   Avoid rigid fixed widths for primary content.

## 5. Component Direction

### Navigation

-   Compact initials/wordmark on the left.
-   Simple uppercase links on desktop.
-   Accessible menu button on mobile.
-   Thin divider or subtle background treatment when needed.

### Hero

-   Large left-aligned headline.
-   Short supporting copy and two clear CTA links.
-   Red circular or geometric accent.
-   Optional portrait/abstract image, with text remaining the priority.
-   Do not copy the reference image or use unlicensed assets.

### Project Cards

-   Strong project title and category.
-   Genuine thumbnail or clean typographic placeholder when no image
    exists.
-   Concise summary and technology labels.
-   Clear Live Demo and Source Code links when available.
-   Hover state may use a small lift, image scale, or accent line; do
    not hide essential information on hover.

### Capability Cards

-   Four capability areas: Backend Development, Full-Stack Development,
    Database Management, and AI-Powered Applications.
-   Use simple icons and short explanations.

### Skills

-   Group by category.
-   Use consistent tags or compact lists.
-   Do not use arbitrary percentage bars.

### Journey / Achievements

-   Use a clean timeline or structured list.
-   Show only verified dates and achievements.

### Contact

-   Large, memorable closing headline.
-   Clear email and professional profile links.
-   Accessible form labels, validation messages, and submission
    feedback.

## 6. Motion and Interaction

-   Use short, subtle transitions for hover and focus states.
-   Use opacity and transform for reveal effects.
-   Use Intersection Observer for scroll-triggered reveals.
-   Avoid animating large layout properties where possible.
-   Do not hijack scrolling or force visitors to wait for animations.
-   Respect `prefers-reduced-motion: reduce`.
-   Disable custom cursor effects on touch devices; a custom cursor is
    optional and must not replace the native pointer.

## 7. Responsive Design

### Mobile

-   Single-column content flow.
-   Compact navigation menu.
-   Smaller hero typography with deliberate line breaks.
-   Project cards stacked vertically.
-   Hide or simplify decorative vertical labels.
-   Keep buttons and form controls touch-friendly.

### Tablet

-   Use one- or two-column grids depending on available width.
-   Adjust hero composition and spacing.
-   Keep navigation uncluttered.

### Desktop

-   Use the full editorial composition.
-   Allow asymmetrical layouts and multi-column project cards.
-   Keep text measure and content width controlled.

## 8. Imagery

-   Prefer genuine project screenshots and an owner-approved portrait.
-   Optimize images and use WebP/AVIF where suitable.
-   Provide meaningful alt text.
-   Do not use fake product screenshots, random stock photos presented
    as real work, or copyrighted reference artwork.
-   Decorative shapes should be created with CSS where practical.

## 9. Design Acceptance Checklist

-   [ ] Dark editorial identity is consistent across sections.
-   [ ] Red accents are restrained and purposeful.
-   [ ] Typography hierarchy is clear.
-   [ ] Text remains readable at all viewport sizes.
-   [ ] Project cards work without hover.
-   [ ] Keyboard focus is visible.
-   [ ] Reduced-motion preference is respected.
-   [ ] No horizontal overflow on mobile.
-   [ ] Images are optimized and have appropriate alt text.
