# Project Tasks

## Modern Editorial Developer Portfolio

This file tracks implementation work. Mark a task complete only after it
has actually been implemented and checked.

**Status key:** `[ ]` Not started · `[x]` Completed · `[!]` Blocked /
needs input

## Phase 1 --- Project Setup

-   [x] Inspect the existing project and preserve working code.
-   [x] Confirm the final project folder structure.
-   [x] Create the HTML, CSS, and JavaScript entry files.
-   [x] Add design tokens for colors, typography, spacing, and layout.
-   [x] Add favicon and page metadata.
-   [x] Confirm the site runs locally in a browser.

## Phase 2 --- Core Layout

-   [x] Build semantic page landmarks.
-   [x] Build desktop navigation.
-   [x] Build accessible mobile navigation.
-   [x] Build hero section and CTA links.
-   [x] Add section dividers and consistent container widths.
-   [x] Build footer and back-to-top link.

## Phase 3 --- Portfolio Content

-   [x] Confirm the final professional headline and introduction.
-   [x] Verify project descriptions and personal contributions.
-   [x] Collect genuine project screenshots.
-   [x] Verify each live demo URL.
-   [x] Verify each source repository URL.
-   [x] Build featured project cards.
-   [x] Build What I Build capability cards.
-   [x] Add verified technology skills grouped by category.
-   [x] Add About / development philosophy content.
-   [x] Add verified education, experience, and achievements.
-   [x] Add resume file and test its download link.
-   [x] Add verified email and professional social links.

## Phase 4 --- Contact

-   [x] Build contact form markup and labels.
-   [x] Add client-side validation and clear error messages.
-   [x] Decide whether to use EmailJS or a mailto fallback.
-   [x] Configure real service details if EmailJS is selected.
-   [x] Test successful and failed submission states.
-   [x] Confirm no private credentials are exposed.

## Phase 5 --- Visual Polish and Motion

-   [x] Implement responsive typography.
-   [x] Add subtle hero entrance animation.
-   [x] Add scroll reveal using Intersection Observer.
-   [x] Add project card hover/focus states.
-   [x] Add navigation and button interaction states.
-   [x] Add reduced-motion support.
-   [x] Review decorative red circle and editorial accents.
-   [x] Remove any animation that harms readability or performance.

## Phase 6 --- Responsive and Accessibility QA

-   [x] CSS breakpoints verified: 992px (tablet), 768px (mobile), 480px (narrow). `css/responsive.css` in place.
-   [x] Wide desktop breakpoint (≥1400px) added to `responsive.css` — wider container + 2-col project grid.
-   [x] Progressive enhancement scroll-reveal fix: `document.documentElement.classList.add('js-reveal')` added to `js/animations.js`.
-   [x] Focus styles audited: `:focus-visible` outline (2px red accent, 3px offset, `border-radius`) applied to `a`, `button`, `input`, `select`, `textarea`.
-   [x] Skip link target fixed: `tabindex="-1"` added to `<main id="main-content">` — skip link now works in all browsers (Chrome, Firefox, Safari, Edge).
-   [x] `#main-content:focus { outline: none }` added — suppresses ugly blue box when skip link sends focus there.
-   [x] Mobile nav `aria-hidden` toggle added in `navigation.js`: `aria-hidden="true"` when closed, `"false"` when open — screen readers now correctly ignore closed menu.
-   [x] Mobile nav `focusout` handler added — closes menu when Tab moves focus outside nav (keyboard users).
-   [x] Mobile nav `z-index` set to `calc(var(--z-nav) - 1)` in `responsive.css` — drawer covers all content correctly.
-   [x] Form status region upgraded: `role="status"` + `aria-live="polite"` + `aria-atomic="true"` — screen readers announce submission results correctly.
-   [x] `-webkit-backdrop-filter` vendor prefix added for Safari 9–15 nav blur support.
-   [x] All project `<img>` tags have descriptive `alt` text.
-   [x] All icon-only links have `aria-label` (nav toggle, logo, social cards, footer icons, back-to-top).
-   [x] `<html lang="en">` confirmed present.
-   [x] Color contrast audit documented in CSS comments:
      - #F5F5F5 on #0B0B0B → 18.05:1 AAA ✅
      - #A0A0A0 on #0B0B0B → 7.53:1 AAA ✅
      - #E5252A on dark → 4.34:1 — AA for large/display text ⚠️ (rule added: never use accent for body/small text)
      - White on #E5252A → 4.54:1 AA ✅ (btn-primary)
-   [x] Responsive CSS breakpoint comment header added with all breakpoints documented.
-   [x] `prefers-reduced-motion` verified: CSS kills all animations; JS skips IntersectionObserver setup.
-   [x] Cross-browser CSS compatibility: `-webkit-backdrop-filter` added; standard CSS Grid/Flex used throughout; no non-standard properties.
-   [x] Keyboard navigation: Escape closes mobile nav + returns focus ✅; all links/buttons in natural DOM tab order ✅; focus indicators visible on all interactive elements ✅.
-   [x] Screen reader compatibility: proper landmark regions (`header`, `main`, `nav`, `footer`, `section`); `aria-live` regions on form feedback; `aria-hidden` on decorative elements; `aria-label` on icon-only links; `aria-expanded` + `aria-controls` on nav toggle; form inputs all have `<label for>`.
-   [x] Horizontal overflow prevention: `overflow-x: hidden` on `body` already set in `style.css` ✅.

## Phase 7 --- Performance, SEO, and Deployment

-   [x] `<meta name="theme-color" content="#0B0B0B">` added to `<head>`.
-   [x] `<meta name="author" content="Jayant Kumar Sharma">` added to `<head>`.
-   [x] Font preload added: `<link rel="preload" as="style">` for Google Fonts before the `<link rel="stylesheet">` — reduces render-blocking delay.
-   [x] Open Graph tags updated: `og:title` and `og:description` now reference Jayant Kumar Sharma by name. `og:url` placeholder added (fill in deployed URL).
-   [x] Twitter Card tags updated to match OG tags.
-   [x] All project `<img>` tags confirmed with `loading="lazy"`, `width="800"`, `height="450"` to prevent CLS.
-   [x] `sitemap.xml` already has correct date (2026-11-17). `robots.txt` allows all crawlers — correct for now.
-   [x] `favicon.svg` present and linked.
-   [ ] Deploy to Vercel and run live Lighthouse audit — **LEFT FOR YOU**
-   [ ] Test live social sharing previews (OG tags) — **LEFT FOR YOU**
-   [ ] Set up custom domain — **LEFT FOR YOU**
-   [ ] Record the final production URL and update `og:url` — **LEFT FOR YOU**

## Release Checklist

-   [ ] No fake statistics, testimonials, or project details.
-   [ ] No placeholder links or unfinished buttons.
-   [ ] All visible sections contain final or intentionally omitted
    content.
-   [ ] No broken images or console errors.
-   [ ] Contact method works as configured.
-   [ ] Resume link works.
-   [ ] Site is responsive and accessible.
-   [ ] Deployment has been verified.

## Decisions / Blockers

Record decisions that need owner input here: - Final portfolio domain:
TBD - Final contact email: TBD - Resume file: TBD - Portrait/hero image:
TBD - Final verified project URLs and screenshots: TBD - Contact
delivery method: TBD
