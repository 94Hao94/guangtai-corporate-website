# Breadcrumb Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide redundant visual breadcrumbs on top-level pages, retain them on genuinely nested solution pages, and move retained breadcrumbs closer to the Hero title without making them sticky.

**Architecture:** Keep breadcrumb derivation and JSON-LD generation unchanged in `src/pages/[...slug].astro`. Make `InnerHero.astro` render the visual `Breadcrumbs` component only when `ancestors.length > 0`, add a state class for spacing, and preserve the existing sticky chapter navigation as the only persistent in-page navigation.

**Tech Stack:** Astro 7, TypeScript 6, CSS, Vitest 4, Playwright 1.61

---

### Task 1: Lock the hierarchy contract in rendered output

**Files:**

- Modify: `tests/rendered-site.test.ts`
- Modify: `tests/browser/site-smoke.spec.ts`

- [x] **Step 1: Write the failing rendered-output test**

Add this test inside `describe('rendered corporate site', ...)`:

```ts
it('renders visual breadcrumbs only for nested pages while preserving breadcrumb JSON-LD', async () => {
  const casesHtml = await readFile(routeFile('/cases'), 'utf8');
  const nestedHtml = await readFile(
    routeFile('/solutions/industries/higher-education/ai'),
    'utf8',
  );

  expect(casesHtml).not.toContain('aria-label="面包屑导航"');
  expect(casesHtml).toContain('"@type":"BreadcrumbList"');
  expect(nestedHtml).toContain('aria-label="面包屑导航"');
  expect(nestedHtml).toContain('href="/solutions/industries"');
  expect(nestedHtml).toContain('href="/solutions/industries/higher-education"');
});
```

- [x] **Step 2: Build and verify RED**

Run:

```bash
npm run build
npx vitest run tests/rendered-site.test.ts -t "renders visual breadcrumbs only for nested pages"
```

Expected: FAIL because `/cases` still contains `aria-label="面包屑导航"`.

- [x] **Step 3: Write the failing browser layout test**

Add this Playwright test:

```ts
test('visual breadcrumbs are reserved for nested pages and stay close to the Hero title', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/cases/');
  await expect(
    page.getByRole('navigation', { name: '面包屑导航' }),
  ).toHaveCount(0);

  await page.goto('/solutions/industries/higher-education/ai/');
  const breadcrumbs = page.getByRole('navigation', { name: '面包屑导航' });
  await expect(breadcrumbs).toBeVisible();

  const gap = await breadcrumbs.evaluate((element) => {
    const eyebrow = document.querySelector('.inner-eyebrow');
    if (!eyebrow) return null;
    return (
      eyebrow.getBoundingClientRect().top -
      element.getBoundingClientRect().bottom
    );
  });
  expect(gap).not.toBeNull();
  expect(gap ?? 0).toBeGreaterThanOrEqual(20);
  expect(gap ?? 0).toBeLessThanOrEqual(32);
  await expect(breadcrumbs).not.toHaveCSS('position', 'sticky');
  await expect(breadcrumbs).not.toHaveCSS('position', 'fixed');
});
```

- [x] **Step 4: Run the browser test and verify RED**

Run:

```bash
npx playwright test tests/browser/site-smoke.spec.ts -g "visual breadcrumbs are reserved"
```

Expected: FAIL because `/cases` still exposes a visual breadcrumb and the nested breadcrumb gap is 72px.

### Task 2: Implement conditional rendering and compact spacing

**Files:**

- Modify: `src/components/pages/InnerHero.astro`
- Modify: `src/styles/inner-page.css`

- [x] **Step 1: Add the minimal hierarchy condition**

In the component frontmatter add:

```ts
const showBreadcrumbs = ancestors.length > 0;
```

Change the copy container and breadcrumb rendering to:

```astro
<div
  class:list={[
    'inner-hero-copy',
    { 'inner-hero-copy--with-breadcrumbs': showBreadcrumbs },
  ]}
  data-reveal
>
  {showBreadcrumbs && <Breadcrumbs page={page} ancestors={ancestors} />}
  <p class="inner-eyebrow">{page.english}</p>
</div>
```

- [x] **Step 2: Move retained breadcrumbs next to the title group**

Keep the default shallow-page Hero rhythm and add this rule after `.inner-eyebrow`:

```css
.inner-hero-copy--with-breadcrumbs .inner-eyebrow {
  margin-top: 1.5rem;
}
```

This reduces the breadcrumb-to-eyebrow gap from 72px to 24px while leaving `.breadcrumbs` non-sticky.

- [x] **Step 3: Verify GREEN**

Run:

```bash
npm run build
npx vitest run tests/rendered-site.test.ts -t "renders visual breadcrumbs only for nested pages"
npx playwright test tests/browser/site-smoke.spec.ts -g "visual breadcrumbs are reserved"
```

Expected: PASS.

### Task 3: Lock the browser layout and synchronize project documentation

**Files:**

- Modify: `说明文档.md`

- [x] **Step 1: Synchronize the project record**

Update `说明文档.md` to identify `main` as the active branch, record the conditional breadcrumb behavior, and state that port 4324 is served from the root worktree after the verification restart.

- [x] **Step 2: Run the complete verification gate**

Run:

```bash
npm run verify
```

Expected: formatting, Astro type checks, Vitest, production build, rendered-output tests, and Playwright tests all pass.

- [x] **Step 3: Verify the main-worktree preview**

Restart port 4324 from `/Users/zouhao/Desktop/公司官网建设`, then verify `/cases` at 1440px and 390px and a nested solution page at 1440px. Confirm no horizontal overflow, no visual breadcrumb on `/cases`, a compact non-sticky breadcrumb on the nested page, and an unchanged sticky chapter navigation.

Do not create a commit unless the user explicitly requests one.
