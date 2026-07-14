# Cases Hero Visual Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/cases` internal contact-sheet Hero with the approved blue-white AI campus visual and keep its Open Graph image consistent.

**Architecture:** Keep the existing `BrandPage` and `InnerHero` rendering path unchanged. Lock the approved content contract in the existing content-collection test, then change only the two image fields in the cases content JSON. Verify the static build and responsive rendering against the already running site.

**Tech Stack:** Astro 7, TypeScript 6, Vitest 4, Playwright 1.61, Astro Image

---

### Task 0: Retire the unavailable pre-migration contract

**Files:**

- Delete: `tests/mvp-contract.test.ts`

- [x] **Step 1: Remove the obsolete migration-input test**

Delete `tests/mvp-contract.test.ts`. It imports `../../../网站/app/content/pages`, an absent pre-migration input that is no longer an accepted verification source.

- [x] **Step 2: Verify the current-product baseline**

Run:

```bash
npm test
```

Expected: all remaining Vitest suites PASS using migrated Astro content and assets only.

- [x] **Step 3: Commit the retired legacy contract**

```bash
git add -u tests/mvp-contract.test.ts
git commit -m "test: retire legacy MVP contract"
```

### Task 1: Lock and apply the approved cases visual

**Files:**

- Modify: `tests/content-collection.test.ts:37`
- Modify: `src/content/pages/cases.json:10`
- Modify: `src/content/pages/cases.json:37`

- [x] **Step 1: Write the failing content contract test**

Add this test inside the existing `describe('pages content collection source', ...)` block:

```ts
it('uses the approved AI campus visual for the cases hero and social image', async () => {
  const casesPage = (await readPages()).find((page) => page.path === '/cases');

  expect(casesPage).toMatchObject({
    hero: '/assets/hero-humanoid-ai-campus.png',
    ogImage: '/assets/hero-humanoid-ai-campus.png',
  });
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- tests/content-collection.test.ts
```

Expected: FAIL because `/cases` still uses `/assets/ai-generated-assets-overview.jpg` for `hero` and `ogImage`.

- [x] **Step 3: Apply the minimal content change**

Change only these fields in `src/content/pages/cases.json`:

```json
"hero": "/assets/hero-humanoid-ai-campus.png",
```

```json
"ogImage": "/assets/hero-humanoid-ai-campus.png"
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npm test -- tests/content-collection.test.ts
```

Expected: all tests in `tests/content-collection.test.ts` PASS.

- [x] **Step 5: Run static validation**

Run:

```bash
npm run check
npm run build
```

Expected: Astro reports 0 errors, warnings, and hints; the build generates all 30 pages successfully.

- [x] **Step 6: Commit the tested content change**

```bash
git add tests/content-collection.test.ts src/content/pages/cases.json
git commit -m "fix(cases): replace internal hero contact sheet"
```

### Task 2: Verify responsive rendering and record project progress

**Files:**

- Create: `说明文档.md`

- [x] **Step 1: Verify the live route and selected image**

Open `http://127.0.0.1:4328/cases` and confirm the `.inner-hero img` request no longer contains `ai-generated-assets-overview.jpg` and resolves to the AI campus image.

- [x] **Step 2: Verify the three approved viewports**

Check the first viewport at:

```text
1440 x 900
768 x 1024
375 x 812
```

At each size confirm: the image loads; no internal asset labels or white contact-sheet gutters appear; the H1 remains readable; the robot and AI visualization are not incoherently cropped; no horizontal overflow or layout shift is introduced.

- [x] **Step 3: Run the complete verification gate**

Run:

```bash
npm run verify
```

Expected: formatting check, Astro check, Vitest, production build, rendered-site tests, and Playwright tests all PASS.

- [x] **Step 4: Create the required project explanation record**

Create `说明文档.md` with the global-spec sections `项目概述`, `技术栈`, `开发计划`, `进度记录`, `问题与解决方案`, `变更记录`, and `部署说明`. Record the 2026-07-14 cases Hero fix as completed only after Steps 1-3 pass, including the chosen C direction, changed files, verification commands, and any remaining visual risks.

- [x] **Step 5: Commit the synchronized project record**

```bash
git add 说明文档.md
git commit -m "docs: record cases hero visual fix"
```
