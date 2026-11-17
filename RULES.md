# Project Rules

## Development Standards and Agent Instructions

These rules apply to every change made to this portfolio.

## 1. Technology Rules

-   Use HTML5, CSS3, and vanilla JavaScript as the default stack.
-   Do not introduce React, Vue, Angular, Tailwind, Bootstrap, or a
    backend framework without explicit approval.
-   Use GSAP only when native CSS and browser APIs are insufficient.
-   Prefer native browser APIs over adding dependencies.
-   Keep the website deployable as a static site.

## 2. Preserve Existing Work

-   Inspect the existing project before editing.
-   Preserve the current folder structure and working functionality
    wherever possible.
-   Do not rewrite unrelated sections to complete a small task.
-   Make the smallest reasonable change.
-   Do not delete existing content, assets, or configuration without a
    clear reason.
-   Explain any necessary structural changes.

## 3. Code Quality

-   Use semantic HTML elements.
-   Use clear, descriptive class and variable names.
-   Keep HTML, CSS, and JavaScript separate.
-   Avoid inline styles and inline event handlers unless there is a
    specific reason.
-   Keep functions small and focused.
-   Avoid duplicated CSS and JavaScript.
-   Add comments for non-obvious logic, not for every line.
-   Handle missing elements and failed requests gracefully.
-   Use `const` by default and `let` when reassignment is needed.
-   Avoid global variables; use modules if the project is configured to
    support them.

## 4. Content Accuracy

-   Use only real personal details, projects, skills, achievements,
    statistics, and URLs supplied or verified by the owner.
-   Never invent client names, testimonials, project outcomes,
    experience duration, visitor counts, or performance scores.
-   Do not publish private information.
-   Use clearly marked placeholders during development and remove them
    before launch.
-   Do not claim a feature works until it has been tested.

## 5. Design Rules

-   Preserve the dark editorial visual direction.
-   Use red as a restrained accent, not as a dominant background color
    everywhere.
-   Maintain strong contrast and readable text.
-   Avoid excessive gradients, glowing effects, glassmorphism, and
    distracting motion.
-   Use consistent spacing, typography, borders, and interaction states.
-   Do not sacrifice usability for visual similarity to the reference.

## 6. Responsive Rules

-   Design mobile layouts intentionally; do not merely shrink desktop
    content.
-   Test narrow mobile, standard mobile, tablet, laptop, and wide
    desktop widths.
-   Prevent horizontal overflow.
-   Ensure navigation and controls work with touch and keyboard.
-   Use responsive images and fluid typography where appropriate.

## 7. Accessibility Rules

-   Use meaningful alt text for informative images and empty alt text
    for decorative images.
-   Ensure every form control has a label.
-   Maintain logical heading order.
-   Provide visible keyboard focus.
-   Use buttons for actions and links for navigation.
-   Respect `prefers-reduced-motion`.
-   Do not communicate status using color alone.

## 8. Performance Rules

-   Optimize images and use modern formats where practical.
-   Set image dimensions or aspect ratios to reduce layout shifts.
-   Lazy-load below-the-fold images.
-   Avoid unnecessary libraries, large videos, and expensive scroll
    handlers.
-   Prefer Intersection Observer over repeatedly calculating element
    positions on scroll.
-   Animate transform and opacity where possible.

## 9. Security and Privacy

-   Never put private API keys, passwords, or privileged tokens in
    client-side code.
-   Treat all form input as untrusted.
-   Do not collect or expose visitor information unnecessarily.
-   Use HTTPS for production links and services.
-   Do not add analytics or tracking without owner approval.

## 10. Completion and Testing

Before considering a task complete: - Check browser console for
errors. - Test all changed links and buttons. - Test navigation and form
states. - Check responsive layouts. - Check keyboard navigation and
reduced motion. - Confirm there are no broken images or placeholder
values in the changed area. - Summarize files changed and tests actually
performed. - Clearly report anything that could not be tested.
