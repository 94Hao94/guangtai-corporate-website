# MVP to Astro Docker/Nginx Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the approved Guangtai MVP as a static Astro corporate website with 30 routes, audited visual assets, minimal client JavaScript, and a production-ready non-root Nginx container.

**Architecture:** The untracked `网站/` directory is a read-only migration source. Typed Astro Content Collections and static routes replace Next.js/Vinext; native TypeScript modules replace React hydration. A multi-stage Docker build produces `dist/`, and an unprivileged Nginx runtime serves immutable assets and brand-aware HTML/404 responses.

**Tech Stack:** Astro 7, TypeScript 6, Tailwind CSS 4, Astro Content Collections, Astro Image, Vitest, Playwright browser verification, Node 24 Alpine, nginx-unprivileged Alpine, Docker Compose

---

## File Map

- `scripts/import-mvp-content.ts`: converts the MVP `sitePages` array into one JSON entry per route.
- `scripts/import-mvp-assets.mjs`: copies only referenced assets and records their provenance.
- `src/content.config.ts`: validates news and page entries.
- `src/content/pages/*.json`: 29 committed route entries.
- `src/lib/content-tree.ts`: parent, child, sibling, breadcrumb, route, and asset validation.
- `src/lib/images.ts`: resolves content image keys to Astro `ImageMetadata`.
- `src/layouts/BaseLayout.astro`: document metadata, canonical, JSON-LD, shell slots.
- `src/components/site/*`: header, navigation, footer, breadcrumb, chapter navigation, CTA.
- `src/components/home/*`: homepage sections and isolated interaction scripts.
- `src/components/pages/*`: overview, detail, and brand page templates.
- `src/pages/index.astro`, `src/pages/[...slug].astro`, `src/pages/404.astro`: static route entrypoints.
- `src/styles/*`: reset, tokens, shell, homepage, inner-page, and responsive styles.
- `tests/*`: content tree, route, asset, rendered HTML, and Docker/Nginx contract tests.
- `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `docker/nginx.conf`: container delivery.

## Task 1: Establish migration contracts

**Files:**

- Create: `tests/mvp-contract.test.ts`
- Create: `src/lib/content-tree.ts`
- Modify: `vitest.config.ts`

- [ ] Write failing tests asserting 29 unique MVP routes, valid parent links, three supported templates, and no parent cycles.
- [ ] Run `npm test -- tests/mvp-contract.test.ts`; expect failure because the content-tree API is absent.
- [ ] Implement exported `buildContentTree`, `getChildren`, `getSiblings`, `getAncestors`, and `validatePages` functions with explicit error messages.
- [ ] Scope Vitest to `tests/**/*.test.ts` and add the MVP contract test.
- [ ] Run the focused test; expect all migration contract assertions to pass.
- [ ] Commit as `test: define MVP migration contracts`.

## Task 2: Import typed page content

**Files:**

- Create: `scripts/import-mvp-content.ts`
- Create: `src/content/pages/*.json`
- Modify: `src/content.config.ts`
- Modify: `package.json`
- Test: `tests/content-collection.test.ts`

- [ ] Add `tsx` as a development dependency and an `import:mvp-content` script accepting the MVP source path as its first argument.
- [ ] Implement the importer using a module import, not text parsing; normalize each route to a stable ID and write deterministic formatted JSON.
- [ ] Run `npm run import:mvp-content -- ../../网站/app/content/pages.ts` inside the implementation worktree; expect exactly 29 JSON files.
- [ ] Extend the `pages` Content Collection Schema with template, parent, visual family, hero behavior, copy arrays, SEO fields, and image keys.
- [ ] Add tests that load the generated files, verify 29 entries, confirm required fields, and reject duplicate routes or missing parents.
- [ ] Run `npm test -- tests/content-collection.test.ts` and `npm run check`.
- [ ] Commit as `feat: import typed MVP page content`.

## Task 3: Audit and import visual assets

**Files:**

- Create: `scripts/import-mvp-assets.mjs`
- Create: `src/assets/mvp/**`
- Create: `src/data/asset-sources.ts`
- Create: `src/lib/images.ts`
- Test: `tests/assets.test.ts`

- [ ] Build the explicit asset allowlist from the 44 references used by the MVP source and homepage.
- [ ] Exclude unreferenced images, MVP `dist/`, generic starter SVGs, and the visually corrupted `home-common-engineering.png` until a valid replacement is selected.
- [ ] Copy the approved assets from `../../网站/public/assets` into `src/assets/mvp`, preserving subdirectories.
- [ ] Record source type, license URL where applicable, owning page family, and Chinese alt-text intent.
- [ ] Implement `import.meta.glob`-based eager image resolution returning `ImageMetadata` and throwing for unknown keys.
- [ ] Test that every page image resolves, every production asset is referenced, and every external photo has provenance.
- [ ] Commit as `feat: import audited MVP visual assets`.

## Task 4: Migrate the design system and document shell

**Files:**

- Modify: `src/layouts/BaseLayout.astro`
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Create: `src/styles/site-shell.css`
- Create: `src/components/site/SeoHead.astro`
- Create: `src/components/site/SiteHeader.astro`
- Create: `src/components/site/SiteFooter.astro`
- Create: `src/components/site/Breadcrumbs.astro`
- Create: `src/components/site/ChapterNav.astro`
- Create: `src/components/site/ContactCta.astro`

- [ ] Extract the approved blue/white palette, typography scale, spacing, grid, focus states, and five visual families from the MVP CSS.
- [ ] Self-host the selected sans and mono font files; remove all `next/font/google` behavior.
- [ ] Build semantic header/footer markup from the page tree and implement desktop Mega Menu plus a progressively enhanced mobile menu.
- [ ] Implement keyboard escape, focus return, outside-click close, `aria-expanded`, and no-JavaScript fallback links.
- [ ] Add metadata, canonical, Open Graph, Organization JSON-LD, and optional breadcrumb JSON-LD to the layout.
- [ ] Verify `npm run check` reports 0 errors, warnings, and hints.
- [ ] Commit as `feat: build the Guangtai site shell`.

## Task 5: Rebuild the homepage without React

**Files:**

- Modify: `src/pages/index.astro`
- Create: `src/components/home/HomeHero.astro`
- Create: `src/components/home/DataNetwork.astro`
- Create: `src/components/home/SolutionSplit.astro`
- Create: `src/components/home/FactorySection.astro`
- Create: `src/components/home/EmbodiedSection.astro`
- Create: `src/components/home/EducationSection.astro`
- Create: `src/components/home/TechnologySection.astro`
- Create: `src/components/home/CaseSection.astro`
- Create: `src/components/home/ProjectCta.astro`
- Create: `src/scripts/data-network.ts`
- Create: `src/scripts/reveal.ts`
- Create: `src/styles/home.css`

- [ ] Port the approved homepage copy, section order, links, imagery, and responsive layout from the MVP.
- [ ] Replace React Canvas code with a standalone module that caps device pixel ratio, cleans up resize listeners, and stops under reduced motion.
- [ ] Replace React IntersectionObserver code with one shared module; content remains visible when scripts fail or JavaScript is disabled.
- [ ] Preserve hero image focal points and ensure all buttons target generated Astro routes.
- [ ] Build and assert that the homepage output contains no React, Next.js, or Vinext bundle names.
- [ ] Commit as `feat: migrate the approved homepage to Astro`.

## Task 6: Implement the three inner-page templates

**Files:**

- Create: `src/components/pages/InnerHero.astro`
- Create: `src/components/pages/CapabilityCanvas.astro`
- Create: `src/components/pages/ScenarioSection.astro`
- Create: `src/components/pages/DeliverySection.astro`
- Create: `src/components/pages/RelatedPages.astro`
- Create: `src/components/pages/OverviewPage.astro`
- Create: `src/components/pages/DetailPage.astro`
- Create: `src/components/pages/BrandPage.astro`
- Create: `src/styles/inner-page.css`
- Create: `src/pages/[...slug].astro`

- [ ] Implement `getStaticPaths()` from the pages collection and attach typed page props.
- [ ] Port the breadcrumb, hero, positioning/value, child matrix, native capability map, scenario, delivery, related-page, and CTA sections.
- [ ] Select Overview, Detail, or Brand template solely from validated content data.
- [ ] Render architecture maps as HTML/CSS/SVG, not raster screenshots.
- [ ] Generate all 29 routes and confirm each route title matches the MVP content entry.
- [ ] Commit as `feat: generate the complete inner-page system`.

## Task 7: Add brand 404 and SEO completeness

**Files:**

- Create: `src/pages/404.astro`
- Modify: `public/robots.txt`
- Modify: `astro.config.mjs`
- Test: `tests/rendered-site.test.ts`

- [ ] Implement the approved branded 404 with links to home and common solutions.
- [ ] Verify every page has unique title, description, canonical, H1, Open Graph image, and valid breadcrumb relationships.
- [ ] Generate Sitemap from the configured `SITE_URL`; prohibit production Docker builds with an empty or example domain.
- [ ] Test all internal links against the built route set and all rendered image URLs against build output.
- [ ] Commit as `feat: complete site SEO and error handling`.

## Task 8: Add responsive and accessibility verification

**Files:**

- Create: `tests/browser/site-smoke.spec.ts`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

- [ ] Add Playwright as a development dependency and scripts for browser smoke tests.
- [ ] Test desktop navigation, mobile navigation, keyboard focus, Escape closing, reduced motion, 404 response, and representative overview/detail/brand pages.
- [ ] Capture 1440x900, 1280x800, 768x1024, and 390x844 screenshots.
- [ ] Assert no horizontal overflow, console errors, missing images, or content overlap.
- [ ] Commit as `test: add responsive site acceptance coverage`.

## Task 9: Add Docker multi-stage delivery

**Files:**

- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `docker/nginx.conf`
- Create: `docker-compose.yml`
- Test: `tests/docker-contract.test.ts`

- [ ] Write a failing Docker contract test for a Node 24 builder, required `SITE_URL`, non-root Nginx runtime, port 8080, healthcheck, read-only compatibility, and absence of source/MVP files.
- [ ] Implement dependency-cache-friendly builder stages using `npm ci` and `npm run build`.
- [ ] Copy only `dist/` into `nginxinc/nginx-unprivileged:stable-alpine`.
- [ ] Configure `/healthz`, directory routes, branded 404, immutable hashed assets, revalidated HTML/XML, gzip, stdout/stderr logs, and security headers.
- [ ] Configure Compose with `read_only`, `tmpfs: /tmp`, `cap_drop: ALL`, `no-new-privileges`, port 8080, and a required build-time domain.
- [ ] Run the Docker contract test.
- [ ] Commit as `feat: add hardened Nginx container delivery`.

## Task 10: Verify the running container

**Files:**

- Create: `scripts/verify-container.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

- [ ] Build with `docker build --build-arg SITE_URL=https://www.example.com -t guangtai-site:test .`.
- [ ] Run with a read-only root filesystem and map `8080:8080`.
- [ ] Verify health, home, one overview page, one detail page, one brand page, Sitemap, robots, branded 404 status, compression, immutable asset cache, and HTML cache headers.
- [ ] Inspect the image to confirm no Node executable, source directory, MVP directory, or Git metadata exists.
- [ ] Stop and remove only the test container.
- [ ] Commit as `test: verify the production container contract`.

## Task 11: Document deployment and rollback

**Files:**

- Modify: `README.md`
- Create: `docs/deployment/docker-nginx.md`
- Create: `docs/content/page-model.md`

- [ ] Document local Astro development, MVP import commands, content editing, asset provenance, Docker build, Compose preview, health checks, CDN/TLS boundary, SHA image tags, and rollback.
- [ ] State that static configuration is injected at build time and runtime environment variables cannot rewrite generated HTML.
- [ ] Document that CMS, forms, CRM, login, and Kubernetes remain separate follow-up projects.
- [ ] Commit as `docs: add site operations and content guides`.

## Task 12: Final acceptance

**Files:**

- Verify: all implementation files

- [ ] Run `npm ci`.
- [ ] Run `npm run verify`; expect formatting, Astro Check, unit tests, browser tests, and production build to pass.
- [ ] Confirm exactly 30 public page routes plus Sitemap, robots, and 404 output.
- [ ] Confirm production output has no React/Next/Vinext runtime and no unreferenced copied assets.
- [ ] Run Docker build and container verification when Docker is available; otherwise report Docker verification as the only unexecuted gate.
- [ ] Review `git diff --check`, intentional changes, and preserved untracked `网站/` reference files.
