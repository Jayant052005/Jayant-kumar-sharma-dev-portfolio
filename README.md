# Jayant Kumar Sharma — Developer Portfolio

> **Building Digital Solutions. Exploring Possibilities. Creating Impact.**  
> A premium, minimalist, editorial developer portfolio engineered with modern web standards, resilient accessibility, and zero external framework dependencies.

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![WCAG 2.1](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA%2FAAA-brightgreen?style=flat-square)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg?style=flat-square)](LICENSE)

---

## 📌 Overview

This repository hosts the personal developer portfolio of **Jayant Kumar Sharma**, a Backend & Full-Stack Developer and B.Tech student based in Jamshedpur, Jharkhand, India. 

Designed with an **editorial dark visual aesthetic**, the site showcases featured production projects, technical capabilities, core skill sets, engineering milestones, and interactive contact channels.

### Design System & Philosophy
* **Palette:** Deep Black (`#0B0B0B`), Surface (`#121212`), Raised Surface (`#191919`), Pure Text (`#F5F5F5`), Muted Slate (`#A0A0A0`), Accent Red (`#E5252A`).
* **Typography:** [Bebas Neue](https://fonts.google.com/specimen/Bebas+Neue) (Bold Display Headings) & [Inter](https://fonts.google.com/specimen/Inter) (Body & Technical Data).
* **Engineering Principles:** 
  - **Zero heavy dependencies:** No React, Vue, Tailwind, or Bootstrap overhead.
  - **Strict style separation:** Absolutely **zero inline styles** (`style="..."`). 100% of styling is contained in modular, maintainable stylesheets.
  - **Progressive enhancement:** Fully functional even if JavaScript is deferred or unavailable.

---

## 🚀 Key Features

* **⚡ Ultra-Fast Static Performance:** Zero build step required. Instant load times powered by font preconnect/preload hints, lightweight SVG assets, and native image lazy-loading (`loading="lazy"`).
* **♿ WCAG 2.1 AA/AAA Accessibility:**
  - Accessible keyboard skip-link (`#main-content` target with focus suppression).
  - High contrast ratios: text passes AAA at `18.05:1`, muted content passes AAA at `7.53:1`.
  - Comprehensive `:focus-visible` states across all buttons, anchors, inputs, selects, and textareas.
  - Screen reader-ready landmarks (`<header>`, `<main>`, `<nav>`, `<footer>`, `<section>`).
  - ARIA attributes (`aria-expanded`, `aria-controls`, `aria-hidden`, `aria-live="polite"`, `role="status"`).
* **📱 Five-Tier Responsive Grid:** Fluid typography and layout adaptations for:
  - Narrow mobile (`<= 480px`)
  - Standard mobile with slide-in drawer (`<= 768px`)
  - Tablet viewports (`<= 992px`)
  - Standard desktop (`1000px – 1200px`)
  - Ultra-wide screens (`>= 1400px`)
* **✨ Restrained Motion & Animations:**
  - Hero staggered entrance animations via native CSS keyframes.
  - Intersection Observer scroll reveals with smooth cubic-bezier easing.
  - Full support for `prefers-reduced-motion` (instantly disables transforms and animations for sensitive users).
* **📋 Robust Contact Form Validation:**
  - Real-time client-side field validation (Name, Email regex, Subject, Message).
  - Inline error messaging linked via `aria-describedby` and `aria-invalid`.
  - Graceful `mailto:` submission fallback with zero credential exposure.
* **🔍 Search Engine Optimization (SEO):**
  - Fully articulated Open Graph and Twitter Card preview tags.
  - XML Sitemap ([sitemap.xml](sitemap.xml)) with crawl frequency and priority tags.
  - Standard Crawler directives ([robots.txt](robots.txt)).

---

## 📂 Project Structure

```text
PORTFOLIO/
│
├── index.html                  # Semantic entry point and markup
├── robots.txt                  # Search crawler instructions
├── sitemap.xml                 # Search engine XML URL index
├── README.md                   # Project documentation and guide
│
├── assets/                     # Media and static documents
│   ├── images/
│   │   ├── favicon.svg         # SVG site icon
│   │   ├── campusshare.svg     # Project mockup illustration
│   │   ├── expense-audit-ai.svg# Project mockup illustration
│   │   ├── rasegs.svg          # Project mockup illustration
│   │   ├── life-in-receipts.svg# Project mockup illustration
│   │   └── project-placeholder.svg
│   └── resume.pdf              # Curriculum Vitae
│
├── css/                        # Modular stylesheet architecture
│   ├── style.css               # Design tokens, reset, typography, and base components
│   ├── responsive.css          # Viewport media queries (480px, 768px, 992px, 1400px+)
│   └── animations.css          # CSS keyframes, scroll-reveal classes, and reduced motion
│
├── js/                         # Vanilla ES modules
│   ├── main.js                 # Application orchestrator (DOMContentLoaded)
│   ├── navigation.js           # Mobile drawer toggle, keyboard navigation, active observer
│   ├── animations.js           # IntersectionObserver scroll reveal system
│   ├── contact.js              # Real-time form validation and email handler
│   └── data/
│       ├── projects.js         # Verified project catalog and metadata
│       └── skills.js           # Categorized technology stack lists
│
└── docs/                       # Project planning and architecture specifications
    ├── ARCHITECTURE.md         # Detailed technical design and component flow
    ├── DESIGN.md               # Visual design tokens, spacing rules, and layout specs
    ├── PRD.md                  # Product requirements and scope boundaries
    ├── RULES.md                # Strict implementation principles (no inline styles, etc.)
    ├── TASKS.md                # Phase-by-phase implementation progress tracker
    └── MEMORY.md               # Durable context, decisions, and verified details
```

---

## 🛠️ Technology Stack

| Domain | Technology | Purpose |
|---|---|---|
| **Structure** | HTML5 | Semantic landmarks, accessible forms, meta SEO |
| **Styling** | CSS3 | CSS Custom Properties (Tokens), Flexbox, CSS Grid |
| **Interactivity** | Vanilla JavaScript (ES6+) | Mobile drawer, IntersectionObserver, client-side validation |
| **Icons & Media** | SVG | Crisp, scalable vectors with minimal payload footprint |
| **Typography** | Google Fonts | Bebas Neue (Editorial Display) & Inter (Body) |
| **Deployment** | Vercel / GitHub Pages | Static CDN hosting |

---

## 💻 Local Development

Because this project is built entirely on native web standards without bundlers or transpilers, you can run it locally with any static web server:

### Option 1: VS Code Live Server (Recommended)
1. Open this repository in [Visual Studio Code](https://code.visualstudio.com/).
2. Install the **Live Server** extension by *Ritwick Dey*.
3. Right-click on `index.html` and select **"Open with Live Server"**.

### Option 2: Python HTTP Server
If you have Python installed, open your terminal in the project directory:

```bash
# Python 3.x
python -m http.server 8000
```
Then visit `http://localhost:8000` in your web browser.

### Option 3: Node.js (npx serve)
```bash
npx serve .
```

---

## 🚀 Deployment

The portfolio is structured for static deployment on any modern platform:

1. **Vercel:**
   - Push this repository to GitHub.
   - Import the project into [Vercel](https://vercel.com).
   - Set Framework Preset to **"Other"** (Root directory: `./`).
   - Click **Deploy**.

2. **GitHub Pages:**
   - Go to your repository settings on GitHub.
   - Under **Pages**, select the `master` or `main` branch and folder `/ (root)`.
   - Save to publish at `https://github.com/Jayant052005/Jayant-kumar-sharma-dev-portfolio`.

---

## 📬 Connect & Author

**Jayant Kumar Sharma**  
*Backend & Full-Stack Developer*  
Jamshedpur, Jharkhand, India  

* **GitHub:** [@Jayant052005](https://github.com/Jayant052005)
* **LinkedIn:** [Jayant Kumar Sharma]([https://linkedin.com](https://www.linkedin.com/in/jayant-kumar-sharma-87216139a/) 
* **Email:** [jayantkumarsharma05@gmail.com](jayantkumarsharma05@gmail.com) 

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
