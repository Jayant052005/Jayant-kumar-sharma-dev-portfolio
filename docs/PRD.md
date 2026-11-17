# Product Requirements Document (PRD)

## Modern Editorial Developer Portfolio

**Version:** 1.0\
**Status:** Project specification\
**Product type:** Personal portfolio website

## 1. Product Overview

Create a modern, premium personal portfolio for a backend-focused,
full-stack web developer. The visual direction is inspired by the
supplied editorial portfolio reference: deep black surfaces, bold
condensed typography, restrained red accents, asymmetrical composition,
and subtle motion.

The website must quickly communicate who the developer is, what they
build, which technologies they use, and how visitors can explore
projects or get in touch.

## 2. Product Goals

-   Present a clear and professional developer identity.
-   Showcase genuine projects, contributions, technology choices, and
    working links.
-   Make resume access and contact straightforward.
-   Provide a polished experience on desktop, tablet, and mobile.
-   Keep the implementation lightweight and maintainable with HTML, CSS,
    and vanilla JavaScript.
-   Support future content updates without requiring a framework or
    build system.

## 3. Target Audience

-   Recruiters and hiring managers.
-   Internship coordinators.
-   Developers and potential collaborators.
-   College peers, mentors, and project evaluators.

## 4. Primary User Journeys

1.  A visitor opens the homepage and understands the developer's focus
    from the hero section.
2.  The visitor browses featured projects and opens a live demo or
    source repository.
3.  The visitor reviews skills, background, and development journey.
4.  The visitor downloads the resume or uses the contact options.

## 5. Website Sections and Functional Requirements

### 5.1 Navigation

-   Show a compact initials-based logo or wordmark.
-   Include links to Work, Skills, About, Journey, and Contact.
-   Use working anchor links with smooth scrolling.
-   Provide an accessible mobile menu with open/close behavior.
-   Clearly indicate keyboard focus and the active/hover state.

### 5.2 Hero

-   Use a bold developer-focused headline, such as **"I BUILD DIGITAL
    EXPERIENCES."**
-   Include a short introduction focused on backend and full-stack
    development.
-   Provide primary actions: **Explore My Work** and **Let's Connect**.
-   Use a portrait, abstract visual, or developer-themed image only when
    a suitable real asset is available.
-   Include the red circular graphic motif from the reference without
    obscuring text.
-   Ensure the hero remains readable on narrow screens.

### 5.3 Featured Projects

-   Present approximately 4--5 verified projects.
-   Each project entry should contain a title, concise description,
    role/contribution, technology stack, and available links.
-   Include project screenshots only when genuine screenshots are
    available.
-   Provide separate Live Demo and GitHub actions when those URLs exist.
-   Do not invent projects, screenshots, metrics, users, clients, or
    deployment URLs.
-   If a project has no public demo or repository, omit that action or
    label its status honestly.

Initial candidate projects, subject to verification before publishing: -
CampusShare --- Full-Stack Web Application. - Enterprise Expense Audit
AI --- AI-Powered Application. - RASEGS --- Multi-Service Business
Platform. - Life in Receipts --- Data Analytics & Visualization. -
CivicConnect --- Hyperlocal Civic Issue Reporting Platform.

### 5.4 What I Build

Show concise capability cards for: - Backend Development: APIs,
authentication, server-side logic, and database integration. -
Full-Stack Development: connecting responsive interfaces with backend
services. - Database Management: data modeling, queries, and database
integration. - AI-Powered Applications: practical AI integrations and
workflow automation.

Only list technologies and capabilities the owner can accurately
discuss.

### 5.5 Technology Stack

-   Group skills by category, such as Languages, Frontend, Backend,
    Databases, and Tools.
-   Use text labels or lightweight icons.
-   Avoid proficiency percentages unless they are based on a defensible
    assessment.
-   Keep the list editable from a single JavaScript data file where
    practical.

### 5.6 About / Development Philosophy

-   Include a concise biography and learning/development interests.
-   Explain the approach to maintainable code, practical
    problem-solving, and continuous learning.
-   Avoid generic claims that cannot be supported.

### 5.7 Development Journey / Achievements

-   Present verified education, internships, certifications, hackathons,
    and milestones when supplied.
-   Use real dates and names.
-   Do not add placeholder achievements to the production site.

### 5.8 Contact

-   Display verified email and professional social links.
-   Include a contact form with name, email, subject, and message fields
    if an email service is configured.
-   Validate required fields and email format.
-   Show clear success and failure feedback.
-   Never expose private API keys or service secrets in client-side
    code.
-   If no form service is configured, provide a working mailto link as a
    fallback.

### 5.9 Footer

-   Include copyright year, key navigation links, and a back-to-top
    action.
-   Do not show dead or placeholder social links.

## 6. Non-Functional Requirements

### Performance

-   Keep the page lightweight and avoid unnecessary libraries.
-   Use appropriately sized WebP/AVIF images where supported.
-   Lazy-load below-the-fold images.
-   Avoid autoplay video and heavy visual effects.
-   Prevent layout shifts by setting image dimensions or aspect ratios.

### Responsive Behavior

-   Support small mobile screens, larger phones, tablets, laptops, and
    wide desktop screens.
-   No horizontal overflow at common viewport widths.
-   Reflow project cards and content columns naturally.
-   Keep controls comfortably tappable.

### Accessibility

-   Use semantic HTML landmarks and logical heading order.
-   Provide descriptive alt text for meaningful images.
-   Ensure keyboard navigation and visible focus indicators.
-   Associate form labels with their inputs.
-   Respect `prefers-reduced-motion`.
-   Maintain readable contrast.

### SEO and Sharing

-   Set a unique page title and meta description.
-   Add canonical URL when the production domain is known.
-   Add Open Graph and social sharing metadata.
-   Include a favicon.
-   Add `robots.txt` and `sitemap.xml` when the production domain is
    finalized.

## 7. Out of Scope for Initial Release

-   User accounts and authentication.
-   Admin dashboard or CMS.
-   Database-backed content management.
-   Blog publishing system.
-   Complex backend APIs.
-   Visitor tracking that collects personal data.
-   A custom cursor on touch devices.

## 8. Acceptance Criteria

-   Every navigation link reaches the correct section.
-   All displayed project links point to verified destinations.
-   The mobile menu works with mouse, touch, and keyboard.
-   The contact path works and provides understandable feedback.
-   No visible placeholder text, fake metrics, broken images, or dead
    buttons remain.
-   The layout has no horizontal overflow at mobile, tablet, and desktop
    sizes.
-   The site remains usable with reduced motion enabled.
-   The site can be opened locally and deployed as a static website.
