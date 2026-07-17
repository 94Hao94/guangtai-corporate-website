# Official Logo Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every shared website brand mark and favicon with the supplied official Guangtai logo variants.

**Architecture:** Store immutable official brand assets under `public/brand/` and reference them by root-relative URL. The shared header and footer own visible brand presentation; `BaseLayout.astro` owns the favicon declaration. One rendered-output test protects all three integration points and ensures the old synthetic logo markup does not return.

**Tech Stack:** Astro 7, TypeScript, static PNG assets, Vitest, Prettier.

---

## File structure

- `public/brand/guangtai-logo-color.png` — full color horizontal official logo for the light header.
- `public/brand/guangtai-logo-white-square.png` — white official square logo for the dark footer.
- `public/brand/guangtai-logo-gray-square.png` — official square favicon source.
- `src/components/site/SiteHeader.astro` — linked full color brand image.
- `src/components/site/SiteFooter.astro` — dark-background brand image.
- `src/layouts/BaseLayout.astro` — favicon reference.
- `src/styles/site-shell.css` — logo sizing and responsive treatment, replacing synthetic-mark rules.
- `tests/rendered-site.test.ts` — built-output contract for official brand integration.
- `说明文档.md` — project progress and change record.

### Task 1: Protect the brand-output contract

**Files:**

- Modify: `tests/rendered-site.test.ts`

- [x] **Step 1: Write the failing test**

Add this test after the metadata route test:

```ts
it('uses the supplied official logo variants in shared site chrome', async () => {
  const homepage = await readFile(resolve('dist/index.html'), 'utf8');
  const header = homepage.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? '';
  const footer = homepage.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? '';
  const favicon = homepage.match(/<link\b[^>]*\brel="icon"[^>]*>/)?.[0] ?? '';

  expect(favicon).toContain('href="/brand/guangtai-logo-gray-square.png"');
  expect(header).toContain('src="/brand/guangtai-logo-color.png"');
  expect(footer).toContain('src="/brand/guangtai-logo-white-square.png"');
  expect(homepage).not.toContain('class="brand-mark"');
});
```

- [x] **Step 2: Run the rendered-output test to verify it fails**

Run: `npm run build && npx vitest run tests/rendered-site.test.ts`

Expected: the new official asset URL assertions fail because the site still renders the synthetic `.brand-mark` and old SVG favicon.

### Task 2: Add official assets and replace shared presentation

**Files:**

- Create: `public/brand/guangtai-logo-color.png`
- Create: `public/brand/guangtai-logo-white-square.png`
- Create: `public/brand/guangtai-logo-gray-square.png`
- Modify: `src/components/site/SiteHeader.astro:48-51`
- Modify: `src/components/site/SiteFooter.astro:2-5`
- Modify: `src/layouts/BaseLayout.astro:38-43`
- Modify: `src/styles/site-shell.css:13-39`

- [x] **Step 1: Copy the supplied official assets without modifying the user source files**

Run:

```bash
mkdir -p public/brand
cp 光泰科技logo/光泰科技彩色.png public/brand/guangtai-logo-color.png
cp 光泰科技logo/光泰科技白色方形.png public/brand/guangtai-logo-white-square.png
cp 光泰科技logo/光泰科技灰色方形.png public/brand/guangtai-logo-gray-square.png
```

- [x] **Step 2: Replace the header's synthetic mark with the full-color official image**

Replace the current contents of the `.brand` link with:

```astro
<img
  class="brand-logo brand-logo--header"
  src="/brand/guangtai-logo-color.png"
  alt="天津光泰科技集团"
/>
```

- [x] **Step 3: Replace the footer's synthetic mark with the white official image**

Replace the current `.brand` contents with:

```astro
<img
  class="brand-logo brand-logo--footer"
  src="/brand/guangtai-logo-white-square.png"
  alt="天津光泰科技集团"
/>
```

- [x] **Step 4: Point the favicon declaration to the official gray square asset**

Replace the existing icon link with:

```astro
<link rel="icon" href="/brand/guangtai-logo-gray-square.png" type="image/png" />
```

- [x] **Step 5: Remove synthetic-mark styling and add responsive official-logo sizing**

Replace `.brand`, `.brand-mark`, `.brand-mark i`, `.brand b`, and `.brand small` rules with:

```css
.brand {
  display: flex;
  align-items: center;
}
.brand-logo {
  display: block;
  width: auto;
  object-fit: contain;
}
.brand-logo--header {
  height: 2.85rem;
  max-width: min(15.5rem, 42vw);
}
.brand-logo--footer {
  height: 6.25rem;
  max-width: 100%;
}
```

In the `max-width: 700px` media query, replace the old small-brand rule with:

```css
.brand-logo--header {
  height: 2.4rem;
  max-width: 13rem;
}
```

- [x] **Step 6: Run formatting and the focused test to verify it passes**

Run: `npm run format && npm run build && npx vitest run tests/rendered-site.test.ts`

Expected: Prettier changes no files after its pass; the rendered test suite passes with the three official asset URLs present.

### Task 3: Record and complete quality verification

**Files:**

- Modify: `说明文档.md`

- [x] **Step 1: Update project records**

Add a completed progress row dated `2026-07-17` describing header, footer, and favicon replacement with official variants. Add a matching change-record entry naming the assets under `public/brand/` and stating that user originals remain untouched.

- [x] **Step 2: Run the relevant quality checks**

Run: `npm run format:check && npm run check && npm test && npm run build && npm run test:rendered`

Expected: all checks pass. If a failure is unrelated to the logo change, document its command and failure reason rather than claiming full verification.

- [x] **Step 3: Check the working tree**

Run: `git status --short`

Expected: only the official assets, shared brand component/style/layout/test files, documentation, and any pre-existing user files are listed; do not alter pre-existing untracked files.
