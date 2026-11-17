# Architecture

## Modern Editorial Developer Portfolio

**Architecture style:** Static, component-organized website\
**Runtime:** Browser\
**Core technologies:** HTML5, CSS3, vanilla JavaScript

## 1. Architecture Overview

The portfolio is a static frontend website. HTML provides semantic page
structure, CSS handles layout and visual styling, and vanilla JavaScript
controls interactions and small dynamic behaviors.

No application server or database is required for the initial release. A
third-party email service may be used for contact form delivery.

``` text
Visitor
  |
  v
Browser
  |
  +--> index.html
  |      |
  |      +--> css/style.css
  |      +--> css/responsive.css
  |      +--> css/animations.css
  |      |
  |      +--> js/main.js
  |      +--> js/navigation.js
  |      +--> js/animations.js
  |      +--> js/contact.js
  |
  +--> Static assets (images, icons, resume)
  |
  +--> Optional Email Service (contact form submission)
```

## 2. Technology Choices

  -----------------------------------------------------------------------
  Technology                          Responsibility
  ----------------------------------- -----------------------------------
  HTML5                               Semantic structure and content

  CSS3                                Layout, responsive styling, visual
                                      effects

  Vanilla JavaScript                  Navigation, interactions, form
                                      validation, progressive enhancement

  CSS animations                      Basic transitions and decorative
                                      motion

  Intersection Observer               Reveal elements as they enter the
                                      viewport

  GSAP (optional)                     Only for complex timelines or
                                      scroll choreography that
                                      CSS/Observer cannot handle cleanly

  EmailJS (optional)                  Contact form delivery without
                                      building a custom backend

  Lucide icons (optional)             Consistent lightweight interface
                                      icons

  Google Fonts                        Bebas Neue for display headings and
                                      Inter for body text

  Git/GitHub                          Source control and collaboration

  Vercel                              Static hosting and deployment
  -----------------------------------------------------------------------

Prefer native browser APIs and CSS. Do not add optional libraries unless
a specific requirement justifies them.

## 3. Suggested Project Structure

``` text
my-portfolio/
|
+-- index.html
+-- README.md
+-- PRD.md
+-- ARCHITECTURE.md
+-- RULES.md
+-- DESIGN.md
+-- TASKS.md
+-- MEMORY.md
|
+-- assets/
|   +-- images/
|   +-- icons/
|   +-- resume.pdf
|
+-- css/
|   +-- style.css
|   +-- responsive.css
|   +-- animations.css
|
+-- js/
|   +-- main.js
|   +-- navigation.js
|   +-- animations.js
|   +-- contact.js
|   +-- data/
|       +-- projects.js
|       +-- skills.js
|
+-- favicon.svg
+-- robots.txt
+-- sitemap.xml
```

Keep the structure simple. If the site is small, combine JavaScript
files rather than creating files with only a few lines.

## 4. Responsibilities by File

-   `index.html`: page metadata, semantic section structure, and asset
    references.
-   `css/style.css`: design tokens, base styles, shared components, and
    desktop layout.
-   `css/responsive.css`: tablet/mobile layout adjustments and
    responsive navigation styling.
-   `css/animations.css`: reusable keyframes, transitions, and
    reduced-motion overrides.
-   `js/main.js`: initialization and shared page behavior.
-   `js/navigation.js`: mobile menu, active navigation state, and anchor
    behavior.
-   `js/animations.js`: Intersection Observer reveal effects and
    optional animation setup.
-   `js/contact.js`: contact validation and optional email-service
    integration.
-   `js/data/projects.js`: verified project content and URLs.
-   `js/data/skills.js`: verified skills grouped by category.
-   `assets/`: optimized images, icons, and resume.

## 5. Data and Content Flow

Project and skill content should be maintained as plain JavaScript data
objects where this makes updates easier. Rendering must use safe DOM
APIs such as `textContent` for text values. Do not inject untrusted
values through `innerHTML`.

Example project data shape:

``` js
{
  title: "CampusShare",
  category: "Full-Stack Web Application",
  description: "A platform for students to share, donate, and sell educational resources.",
  technologies: ["HTML", "CSS", "JavaScript", "Supabase"],
  liveUrl: "",
  sourceUrl: "",
  image: "assets/images/campusshare.webp"
}
```

Replace empty URLs and example values with verified project details
before launch.

## 6. Contact Form Integration

Preferred initial approach: 1. Validate fields in the browser. 2. Use
EmailJS only after configuring a real account, service ID, template ID,
and public key. 3. Store configuration in a clearly documented frontend
configuration file or environment-aware deployment configuration. 4.
Understand that browser-visible values are not secrets. Never place
private keys or privileged credentials in frontend code. 5. If stronger
secret protection or custom processing is required, use a backend
endpoint or serverless function in a later phase.

Do not claim that a form sends email until it has been tested with a
real configured service.

## 7. Deployment

-   Host the static files on Vercel.
-   Configure the project as a static site; no build command is needed
    unless a later tool is introduced.
-   Set the output/root directory to the project root.
-   Add the final production URL to canonical and social metadata.
-   Test the deployed site on desktop and mobile.
-   Confirm asset paths work on a case-sensitive hosting environment.

## 8. Architectural Constraints

-   No framework is required.
-   No database is required for the initial release.
-   No backend is required unless a feature genuinely needs one.
-   Avoid unnecessary dependencies and build tooling.
-   Keep content separate from presentation where practical.
-   Use progressive enhancement: the core content should remain
    accessible even if JavaScript fails.
